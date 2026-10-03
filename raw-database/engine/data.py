from __future__ import annotations

import csv
from collections import defaultdict
from dataclasses import dataclass, field
from functools import cached_property
from pathlib import Path
from typing import Any


REQUIRED_FILES = (
    "users.csv",
    "categories.csv",
    "skills.csv",
    "skill_values.csv",
    "offers.csv",
    "needs.csv",
    "time_slots.csv",
    "offer_availability.csv",
    "need_availability.csv",
    "exchange_preferences.csv",
    "system_config.csv",
)

OPTIONAL_FILES = (
    "reliability_history.csv",
    "contributions.csv",
    "commitments.csv",
    "current_user_reliability.csv",
    "matches.csv",
    "recommendation_rankings.csv",
    "recommendation_events.csv",
    "exchanges.csv",
    "exchange_matches.csv",
    "exchange_legs.csv",
    "exchange_participants.csv",
    "sessions.csv",
    "evaluations.csv",
    "disputes.csv",
    "withdrawals.csv",
)

# Confirmed resources stay unavailable throughout execution and settlement.
# Withdrawn exchanges release their resources for a new recommendation run.
LOCKED_EXCHANGE_STATUSES = frozenset({"Confirmed", "Active", "Settled", "Disputed", "Defaulted"})

KEYS = {
    "users": ("user_id",), "categories": ("category_id",), "skills": ("skill_id",),
    "skill_values": ("skill_value_id",), "offers": ("offer_id",), "needs": ("need_id",),
    "time_slots": ("slot_id",), "offer_availability": ("offer_id", "slot_id"),
    "need_availability": ("need_id", "slot_id"), "exchange_preferences": ("preference_id",),
    "system_config": ("config_key",), "reliability_history": ("reliability_id",),
    "contributions": ("contribution_id",), "commitments": ("commitment_id",),
    "current_user_reliability": ("user_id",), "matches": ("match_id",),
    "recommendation_rankings": ("match_id", "target_user_id"),
    "recommendation_events": ("event_id",), "exchanges": ("exchange_id",),
    "exchange_matches": ("exchange_id", "match_id"),
    "exchange_legs": ("leg_id",),
    "exchange_participants": ("exchange_id", "user_id"), "sessions": ("session_id",),
    "evaluations": ("evaluation_id",), "disputes": ("dispute_id",),
    "withdrawals": ("withdrawal_id",),
}


@dataclass
class DataSet:
    root: Path
    users: list[dict[str, str]]
    categories: list[dict[str, str]]
    skills: list[dict[str, str]]
    skill_values: list[dict[str, str]]
    offers: list[dict[str, str]]
    needs: list[dict[str, str]]
    time_slots: list[dict[str, str]]
    offer_availability: list[dict[str, str]]
    need_availability: list[dict[str, str]]
    exchange_preferences: list[dict[str, str]]
    system_config: list[dict[str, str]]
    reliability_history: list[dict[str, str]] = field(default_factory=list)
    contributions: list[dict[str, str]] = field(default_factory=list)
    commitments: list[dict[str, str]] = field(default_factory=list)
    current_user_reliability: list[dict[str, str]] = field(default_factory=list)
    matches: list[dict[str, str]] = field(default_factory=list)
    recommendation_rankings: list[dict[str, str]] = field(default_factory=list)
    recommendation_events: list[dict[str, str]] = field(default_factory=list)
    exchanges: list[dict[str, str]] = field(default_factory=list)
    exchange_matches: list[dict[str, str]] = field(default_factory=list)
    exchange_legs: list[dict[str, str]] = field(default_factory=list)
    exchange_participants: list[dict[str, str]] = field(default_factory=list)
    sessions: list[dict[str, str]] = field(default_factory=list)
    evaluations: list[dict[str, str]] = field(default_factory=list)
    disputes: list[dict[str, str]] = field(default_factory=list)
    withdrawals: list[dict[str, str]] = field(default_factory=list)

    @cached_property
    def users_by_id(self) -> dict[str, dict[str, str]]:
        return {row["user_id"]: row for row in self.users}

    @cached_property
    def skills_by_id(self) -> dict[str, dict[str, str]]:
        return {row["skill_id"]: row for row in self.skills}

    @cached_property
    def skill_values_by_skill(self) -> dict[str, dict[str, str]]:
        """Return the active value row for each skill.

        The demo contains one row per skill. If later data contains multiple
        versions, the active row with the latest effective date wins.
        """
        grouped: dict[str, list[dict[str, str]]] = defaultdict(list)
        for row in self.skill_values:
            grouped[row["skill_id"]].append(row)

        result: dict[str, dict[str, str]] = {}
        for skill_id, rows in grouped.items():
            active = [row for row in rows if not row.get("effective_to")]
            candidates = active or rows
            result[skill_id] = max(
                candidates,
                key=lambda row: row.get("effective_from", ""),
            )
        return result

    @cached_property
    def offer_slots(self) -> dict[str, set[str]]:
        result: dict[str, set[str]] = defaultdict(set)
        for row in self.offer_availability:
            result[row["offer_id"]].add(row["slot_id"])
        return result

    @cached_property
    def need_slots(self) -> dict[str, set[str]]:
        result: dict[str, set[str]] = defaultdict(set)
        for row in self.need_availability:
            result[row["need_id"]].add(row["slot_id"])
        return result

    @cached_property
    def preferences(self) -> dict[tuple[str, str], set[str]]:
        result: dict[tuple[str, str], set[str]] = defaultdict(set)
        for row in self.exchange_preferences:
            result[(row["user_id"], row["skill_id"])].add(
                row["preference_type"]
            )
        return result

    @cached_property
    def config(self) -> dict[str, str]:
        return {row["config_key"]: row["config_value"] for row in self.system_config}

    @cached_property
    def reliability_by_user(self) -> dict[str, float]:
        # A CSV view is a snapshot, not a live SQL view. Fresh history wins.
        result = {
            row["user_id"]: float(row["reliability_score"])
            for row in self.current_user_reliability
            if row.get("reliability_score") and row.get("is_cold_start") == "0"
        }
        latest: dict[str, dict[str, str]] = {}
        for row in self.reliability_history:
            if not row.get("reliability_score"):
                continue
            previous = latest.get(row["user_id"])
            if previous is None or (row["calculated_at"], row["reliability_id"]) > (
                previous["calculated_at"], previous["reliability_id"]
            ):
                latest[row["user_id"]] = row
        result.update({user: float(row["reliability_score"]) for user, row in latest.items()})
        return result

    @cached_property
    def contribution_by_user(self) -> dict[str, float]:
        result: dict[str, float] = defaultdict(float)
        for row in self.contributions:
            # Credit only settled service records; drafts must not boost rank.
            if row["settlement_status"] == "Settled":
                result[row["provider_id"]] += float(row["contribution_value"])
        return dict(result)

    @cached_property
    def commitment_by_user(self) -> dict[str, float]:
        result: dict[str, float] = defaultdict(float)
        for row in self.commitments:
            if row["status"] in {"Proposed", "Active"}:
                result[row["debtor_id"]] += 1.0
        return dict(result)

    @cached_property
    def locked_resources(self) -> tuple[frozenset[str], frozenset[str]]:
        exchanges = {row["exchange_id"]: row for row in self.exchanges}
        matches = {row["match_id"]: row for row in self.matches}
        offers: set[str] = set()
        needs: set[str] = set()
        for link in self.exchange_matches:
            exchange = exchanges.get(link["exchange_id"])
            match = matches.get(link["match_id"])
            if exchange is None or match is None:
                raise ValueError("exchange_matches references a missing exchange or match")
            if exchange["status"] in LOCKED_EXCHANGE_STATUSES:
                for suffix in "abc":
                    if match.get(f"offer_id_{suffix}"):
                        offers.add(match[f"offer_id_{suffix}"])
                    if match.get(f"need_id_{suffix}"):
                        needs.add(match[f"need_id_{suffix}"])
        linked = {row["exchange_id"] for row in self.exchange_matches}
        for leg in self.exchange_legs:
            exchange = exchanges.get(leg["exchange_id"])
            if exchange is None:
                raise ValueError("exchange_legs references a missing exchange")
            if exchange["status"] in LOCKED_EXCHANGE_STATUSES:
                offers.add(leg["offer_id"])
                needs.add(leg["need_id"])
                linked.add(leg["exchange_id"])
        for exchange in self.exchanges:
            if exchange["status"] in LOCKED_EXCHANGE_STATUSES and exchange["exchange_id"] not in linked:
                raise ValueError(f"Locked exchange {exchange['exchange_id']} has no source match")
        return frozenset(offers), frozenset(needs)

    @property
    def locked_offer_ids(self) -> frozenset[str]:
        return self.locked_resources[0]

    @property
    def locked_need_ids(self) -> frozenset[str]:
        return self.locked_resources[1]

    def summary(self) -> dict[str, Any]:
        return {
            "root": str(self.root),
            "files": {
                "users": len(self.users),
                "skills": len(self.skills),
                "offers": len(self.offers),
                "needs": len(self.needs),
                "time_slots": len(self.time_slots),
                "offer_availability": len(self.offer_availability),
                "need_availability": len(self.need_availability),
                "exchange_preferences": len(self.exchange_preferences),
            },
            "optional_history_files": {
                "reliability_history": len(self.reliability_history),
                "contributions": len(self.contributions),
                "commitments": len(self.commitments),
            },
            "config": self.config,
        }


def _read_csv(path: Path, required: bool = True) -> list[dict[str, str]]:
    if not path.exists():
        if required:
            raise FileNotFoundError(f"Required CSV file not found: {path}")
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(line for line in handle if not line.lstrip().startswith("#"))
        if reader.fieldnames is None:
            raise ValueError(f"CSV file has no header: {path}")
        if len(set(reader.fieldnames)) != len(reader.fieldnames):
            raise ValueError(f"Duplicate CSV headers: {path}")
        rows = []
        for number, row in enumerate(reader, start=2):
            if None in row or any(value is None for value in row.values()):
                raise ValueError(f"Invalid CSV row width: {path}, row {number}")
            rows.append(dict(row))
        keys = KEYS[path.stem]
        missing = set(keys) - set(reader.fieldnames)
        if missing:
            raise ValueError(f"Missing key columns in {path}: {sorted(missing)}")
        seen = set()
        for row in rows:
            key = tuple(row[column] for column in keys)
            if not all(key) or key in seen:
                raise ValueError(f"Empty or duplicate primary key in {path}: {key}")
            seen.add(key)
        return rows


def load_dataset(root: str | Path) -> DataSet:
    root_path = Path(root).expanduser().resolve()
    if not root_path.is_dir():
        raise NotADirectoryError(f"CSV data directory does not exist: {root_path}")

    rows: dict[str, list[dict[str, str]]] = {}
    for filename in REQUIRED_FILES:
        rows[filename] = _read_csv(root_path / filename, required=True)
    for filename in OPTIONAL_FILES:
        rows[filename] = _read_csv(root_path / filename, required=False)

    data = DataSet(root=root_path, **{Path(filename).stem: values for filename, values in rows.items()})
    # Resolve locks before recommendation generation, including when no edges exist.
    _ = data.locked_resources
    return data
