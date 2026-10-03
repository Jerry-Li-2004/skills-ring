from __future__ import annotations

import unittest
import csv
import tempfile
from dataclasses import replace
from pathlib import Path

from engine.data import load_dataset
from engine.matching import generate_candidate_edges, generate_matches
from engine.features import contribution_score, reliability_score, risk_score, effective_value
from engine.output import _match_row, write_outputs, MATCH_FIELDS, RANK_FIELDS


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = (
    PROJECT_ROOT
    / "HacKU"
    / "database_demo2_csv"
)


class RecommendationEngineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.data = load_dataset(DATA_DIR)
        cls.matches, cls.edges = generate_matches(cls.data)

    def test_dataset_loads_expected_core_tables(self) -> None:
        self.assertEqual(len(self.data.users), 300)
        self.assertEqual(len(self.data.offers), 500)
        self.assertEqual(len(self.data.needs), 500)
        self.assertEqual(len(self.data.skills), 50)
        self.assertEqual(len(self.data.current_user_reliability), 300)

    def test_candidate_edges_respect_hard_filters(self) -> None:
        edges = self.edges
        self.assertGreater(len(edges), 0)
        for edge in edges:
            self.assertNotEqual(edge.offer["user_id"], edge.need["user_id"])
            self.assertEqual(edge.offer["skill_id"], edge.need["skill_id"])
            self.assertEqual(self.data.users_by_id[edge.offer["user_id"]]["status"], "Active")
            self.assertEqual(self.data.users_by_id[edge.need["user_id"]]["status"], "Active")
            self.assertEqual(self.data.skills_by_id[edge.offer["skill_id"]]["status"], "Active")
            self.assertGreaterEqual(
                float(edge.offer["duration_minutes"]),
                float(edge.need["duration_minutes"]),
            )
            self.assertGreaterEqual(
                float(edge.offer["max_sessions"]),
                float(edge.need["sessions_needed"]),
            )

    def test_direct_and_cycle_matches_are_generated(self) -> None:
        matches = self.matches
        self.assertTrue(any(match.match_type == "Direct" for match in matches))
        self.assertTrue(any(match.match_type == "Cycle" for match in matches))
        self.assertEqual(len(self.edges), 576)
        self.assertEqual(sum(match.match_type == "Direct" for match in matches), 91)
        self.assertEqual(sum(match.match_type == "Cycle" for match in matches), 13)

    def test_cycle_has_three_distinct_participants(self) -> None:
        matches = self.matches
        cycles = [match for match in matches if match.match_type == "Cycle"]
        self.assertTrue(cycles)
        for match in cycles:
            participants = [edge.offer["user_id"] for edge in match.edges]
            self.assertEqual(len(participants), 3)
            self.assertEqual(len(set(participants)), 3)
            self.assertEqual(match.scores["reciprocity_score"], 85.0)

    def test_direct_is_sorted_before_cycle_on_equal_score(self) -> None:
        matches = self.matches
        for previous, current in zip(matches, matches[1:]):
            if previous.scores["final_score"] == current.scores["final_score"]:
                self.assertLessEqual(
                    0 if previous.match_type == "Direct" else 1,
                    0 if current.match_type == "Direct" else 1,
                )

    def test_all_cold_start_users_have_same_history_scores(self) -> None:
        cold = [row for row in self.data.current_user_reliability if row["is_cold_start"] == "1"]
        self.assertEqual(len(cold), 220)
        for row in cold:
            user = row["user_id"]
            self.assertEqual(reliability_score(self.data, user), 50.0)
            self.assertEqual(contribution_score(self.data, user), 0.0)
            self.assertEqual(risk_score(self.data, user), 0.0)

    def test_latest_history_wins_over_order_and_stale_view(self) -> None:
        def snapshot(identifier, score, date):
            return {"user_id": "u1", "reliability_id": identifier,
                    "reliability_score": score, "calculated_at": date}
        data = replace(self.data, reliability_history=[
            snapshot("new", "80", "2026-10-03 12:00:00"),
            snapshot("null", "", "2026-10-04 12:00:00"),
            snapshot("old", "30", "2026-10-01 12:00:00"),
        ], current_user_reliability=[{"user_id": "u1", "reliability_score": "40", "is_cold_start": "0"}])
        self.assertEqual(reliability_score(data, "u1"), 80.0)

    def test_settled_contributions_are_summed_by_provider(self) -> None:
        data = replace(self.data, contributions=[
            {"provider_id": "u1", "contribution_value": "10", "settlement_status": "Settled"},
            {"provider_id": "u1", "contribution_value": "5", "settlement_status": "Settled"},
            {"provider_id": "u1", "contribution_value": "100", "settlement_status": "Unsettled"},
            {"provider_id": "u2", "contribution_value": "30", "settlement_status": "Settled"},
        ])
        self.assertEqual(data.contribution_by_user, {"u1": 15.0, "u2": 30.0})
        self.assertLess(contribution_score(data, "u1"), contribution_score(data, "u2"))

    def test_risk_counts_open_debtor_commitments_with_denominator_three(self) -> None:
        data = replace(self.data, commitments=[
            {"debtor_id": "u1", "beneficiary_id": "u2", "status": status}
            for status in ("Proposed", "Active", "Fulfilled", "Cancelled")
        ])
        self.assertAlmostEqual(risk_score(data, "u1"), 200 / 3)
        self.assertEqual(risk_score(data, "u2"), 0)

    def _with_exchange(self, match, status):
        return replace(self.data,
            matches=[_match_row(match)],
            exchanges=[{"exchange_id": "ex1", "status": status}],
            exchange_matches=[{"exchange_id": "ex1", "match_id": match.match_id}])

    def test_confirmed_direct_and_cycle_resources_are_excluded(self) -> None:
        for kind in ("Direct", "Cycle"):
            match = next(item for item in self.matches if item.match_type == kind)
            for status in ("Confirmed", "Active", "Settled", "Disputed", "Defaulted"):
                with self.subTest(kind=kind, status=status):
                    data = self._with_exchange(match, status)
                    results, edges = generate_matches(data)
                    self.assertEqual(len(data.locked_offer_ids), len(match.edges))
                    self.assertEqual(len(data.locked_need_ids), len(match.edges))
                    self.assertNotIn(match.match_id, {item.match_id for item in results})
                    for edge in edges:
                        self.assertNotIn(edge.offer["offer_id"], data.locked_offer_ids)
                        self.assertNotIn(edge.need["need_id"], data.locked_need_ids)

    def test_invitation_does_not_lock_and_withdrawal_releases(self) -> None:
        for status in ("Proposed", "Withdrawn"):
            data = self._with_exchange(self.matches[0], status)
            self.assertFalse(data.locked_offer_ids)
            self.assertEqual(len(generate_candidate_edges(data)), len(self.edges))

    def test_live_exchange_legs_lock_resources_without_legacy_match_link(self) -> None:
        match = next(item for item in self.matches if item.match_type == "Direct")
        legs = [
            {"leg_id": f"leg-{index}", "exchange_id": "ex1",
             "offer_id": edge.offer["offer_id"], "need_id": edge.need["need_id"]}
            for index, edge in enumerate(match.edges)
        ]
        data = replace(self.data,
            exchanges=[{"exchange_id": "ex1", "status": "Confirmed"}],
            exchange_legs=legs)
        results, edges = generate_matches(data)
        self.assertEqual(data.locked_offer_ids, frozenset(leg["offer_id"] for leg in legs))
        self.assertNotIn(match.match_id, {item.match_id for item in results})
        self.assertTrue(all(edge.offer["offer_id"] not in data.locked_offer_ids for edge in edges))

    def test_missing_exchange_links_fail_instead_of_unlocking(self) -> None:
        data = replace(self.data, exchanges=[{"exchange_id": "ex1", "status": "Confirmed"}])
        with self.assertRaisesRegex(ValueError, "no source match"):
            generate_matches(data)
        data = replace(data, exchange_matches=[{"exchange_id": "ex1", "match_id": "missing"}])
        with self.assertRaisesRegex(ValueError, "missing exchange or match"):
            generate_matches(data)

    def test_duration_is_continuous_and_sessions_use_need(self) -> None:
        offer = dict(self.data.offers[0], duration_minutes="45", max_sessions="10")
        expected = float(self.data.skill_values_by_skill[offer["skill_id"]]["base_value"]) * 1.5 * 0.75
        self.assertAlmostEqual(effective_value(self.data, offer, sessions=1), expected)

    def test_csv_row_order_does_not_change_matches_or_scores(self) -> None:
        data = replace(self.data, offers=list(reversed(self.data.offers)),
                       needs=list(reversed(self.data.needs)))
        matches, _ = generate_matches(data)
        self.assertEqual([_match_row(m) for m in matches], [_match_row(m) for m in self.matches])

    def test_complete_output_has_per_user_ranks_and_overwrites_old_results(self) -> None:
        def read(path):
            with path.open(encoding="utf-8", newline="") as handle:
                reader = csv.DictReader(line for line in handle if not line.startswith("#"))
                return reader.fieldnames, list(reader)
        with tempfile.TemporaryDirectory() as directory:
            paths = write_outputs(self.matches, directory)
            fields, rows = read(paths[0])
            self.assertEqual(fields, MATCH_FIELDS)
            self.assertEqual(len(rows), 104)
            fields, ranks = read(paths[1])
            self.assertEqual(fields, RANK_FIELDS)
            self.assertEqual(len(ranks), 91 * 2 + 13 * 3)
            by_user = {}
            for row in ranks:
                by_user.setdefault(row["target_user_id"], []).append(row)
            for user, entries in by_user.items():
                expected = [m.match_id for m in self.matches if user in m.participants]
                self.assertEqual([r["match_id"] for r in entries], expected)
                self.assertEqual([int(r["rank_position"]) for r in entries], list(range(1, len(entries) + 1)))
            write_outputs(self.matches[:1], directory)
            self.assertEqual(len(read(paths[0])[1]), 1)
            write_outputs([], directory)
            self.assertEqual(read(paths[0])[1], [])
            self.assertEqual(read(paths[1])[1], [])

    def test_equal_score_direct_ranks_ahead_of_cycle(self) -> None:
        direct = self.matches[0]
        cycle = next(m for m in self.matches if m.match_type == "Cycle")
        # Arrange one shared target so the real ranking writer resolves the tie.
        edge = replace(cycle.edges[0], offer=dict(cycle.edges[0].offer, user_id=direct.participants[0]))
        cycle = replace(cycle, edges=[edge] + cycle.edges[1:], scores=dict(cycle.scores, final_score=direct.scores["final_score"]))
        with tempfile.TemporaryDirectory() as directory:
            _, path = write_outputs([cycle, direct], directory)
            with path.open(encoding="utf-8", newline="") as handle:
                ranks = list(csv.DictReader(line for line in handle if not line.startswith("#")))
            entries = [r for r in ranks if r["target_user_id"] == direct.participants[0]]
            self.assertEqual([r["match_id"] for r in entries], [direct.match_id, cycle.match_id])


if __name__ == "__main__":
    unittest.main()
