from __future__ import annotations

from dataclasses import dataclass

from .config import CYCLE_RECIPROCITY, DIRECT_RECIPROCITY
from .data import DataSet
from .features import (
    EdgeMetrics,
    calculate_edge_metrics,
    aggregate_score,
    effective_value,
    is_excluded,
    level_is_compatible,
    mode_is_compatible,
)


@dataclass(frozen=True)
class CandidateEdge:
    offer: dict[str, str]
    need: dict[str, str]
    metrics: EdgeMetrics

    @property
    def edge_key(self) -> tuple[str, str]:
        return self.offer["offer_id"], self.need["need_id"]


@dataclass
class Match:
    match_id: str
    match_type: str
    edges: list[CandidateEdge]
    scores: dict[str, float]

    @property
    def participants(self) -> list[str]:
        return sorted(
            {
                edge.offer["user_id"] for edge in self.edges
            } | {
                edge.need["user_id"] for edge in self.edges}
        )


def matching_identity(data: DataSet, user_id: str) -> str:
    return data.users_by_id.get(user_id, {}).get("matching_identity_id") or user_id


def _is_active_user(data: DataSet, user_id: str) -> bool:
    user = data.users_by_id.get(user_id)
    return bool(user and user.get("status") == "Active")


def _is_active_skill(data: DataSet, skill_id: str) -> bool:
    skill = data.skills_by_id.get(skill_id)
    return bool(skill and skill.get("status") == "Active")


def _is_active_offer(offer: dict[str, str]) -> bool:
    return offer.get("status") == "Active"


def _is_active_need(need: dict[str, str]) -> bool:
    return need.get("status") == "Active"


def _edge_passes_hard_filters(
    data: DataSet,
    offer: dict[str, str],
    need: dict[str, str],
) -> bool:
    if matching_identity(data, offer["user_id"]) == matching_identity(data, need["user_id"]):
        return False
    if not _is_active_user(data, offer["user_id"]):
        return False
    if not _is_active_user(data, need["user_id"]):
        return False
    if not _is_active_offer(offer) or not _is_active_need(need):
        return False
    if offer["offer_id"] in data.locked_offer_ids or need["need_id"] in data.locked_need_ids:
        return False
    if not _is_active_skill(data, offer["skill_id"]):
        return False
    if offer["skill_id"] != need["skill_id"]:
        return False
    if not level_is_compatible(offer["level"], need["required_provider_level"]):
        return False
    if float(offer["duration_minutes"]) < float(need["duration_minutes"]):
        return False
    if float(offer["max_sessions"]) < float(need["sessions_needed"]):
        return False
    if not mode_is_compatible(offer["mode"], need["mode"]):
        return False
    if not data.offer_slots.get(offer["offer_id"], set()) & data.need_slots.get(
        need["need_id"], set()
    ):
        return False
    if is_excluded(data, offer["user_id"], offer["skill_id"]):
        return False
    if is_excluded(data, need["user_id"], need["skill_id"]):
        return False
    return True


def generate_candidate_edges(data: DataSet) -> list[CandidateEdge]:
    available_offers = [
        offer for offer in data.offers
        if _is_active_offer(offer)
        and _is_active_user(data, offer["user_id"])
        and _is_active_skill(data, offer["skill_id"])
        and offer["offer_id"] not in data.locked_offer_ids
    ]
    max_offer_value = max(
        (effective_value(data, offer) for offer in available_offers),
        default=0.0,
    )
    needs_by_skill: dict[str, list[dict[str, str]]] = {}
    for need in data.needs:
        if (_is_active_need(need) and _is_active_user(data, need["user_id"])
                and need["need_id"] not in data.locked_need_ids):
            needs_by_skill.setdefault(need["skill_id"], []).append(need)
    edges: list[CandidateEdge] = []
    for offer in available_offers:
        for need in needs_by_skill.get(offer["skill_id"], []):
            if not _edge_passes_hard_filters(data, offer, need):
                continue
            metrics = calculate_edge_metrics(data, offer, need, max_offer_value=max_offer_value)
            edges.append(CandidateEdge(offer=offer, need=need, metrics=metrics))
    edges.sort(key=lambda edge: edge.edge_key)
    return edges


def _make_match(
    match_type: str,
    edges: list[CandidateEdge],
    reciprocity: float,
) -> Match:
    edge_ids = [f"{edge.offer['offer_id']}:{edge.need['need_id']}" for edge in edges]
    prefix = "D" if match_type == "Direct" else "C"
    match_id = f"{prefix}-" + "-".join(edge_ids)
    return Match(
        match_id=match_id,
        match_type=match_type,
        edges=edges,
        scores=aggregate_score(
            [edge.metrics for edge in edges],
            reciprocity_score=reciprocity,
        ),
    )


def generate_direct_matches(edges: list[CandidateEdge]) -> list[Match]:
    by_direction: dict[tuple[str, str], list[CandidateEdge]] = {}
    for edge in edges:
        by_direction.setdefault(
            (edge.offer["user_id"], edge.need["user_id"]), []
        ).append(edge)

    matches: list[Match] = []
    seen: set[str] = set()
    for edge in edges:
        user_a = edge.offer["user_id"]
        user_b = edge.need["user_id"]
        if user_a == user_b:
            continue
        reverse_edges = by_direction.get((user_b, user_a), [])
        for reverse in reverse_edges:
            first, second = sorted(
                [edge, reverse],
                key=lambda item: item.edge_key,
            )
            match = _make_match("Direct", [first, second], DIRECT_RECIPROCITY)
            if match.match_id not in seen:
                matches.append(match)
                seen.add(match.match_id)
    return matches


def generate_cycle_matches(edges: list[CandidateEdge]) -> list[Match]:
    outgoing: dict[str, list[CandidateEdge]] = {}
    for edge in edges:
        outgoing.setdefault(edge.offer["user_id"], []).append(edge)

    matches: list[Match] = []
    seen: set[tuple[tuple[str, str], ...]] = set()
    for first in edges:
        user_a = first.offer["user_id"]
        user_b = first.need["user_id"]
        if user_a == user_b:
            continue
        for second in outgoing.get(user_b, []):
            user_c = second.need["user_id"]
            if user_c in {user_a, user_b}:
                continue
            for third in outgoing.get(user_c, []):
                if third.need["user_id"] != user_a:
                    continue
                if len({first.edge_key, second.edge_key, third.edge_key}) != 3:
                    continue
                canonical = tuple(sorted((first.edge_key, second.edge_key, third.edge_key)))
                if canonical in seen:
                    continue
                seen.add(canonical)
                cycle_edges = [first, second, third]
                # Canonical rotation preserves direction and a stable ID even
                # if users reorder the CSV input rows.
                start = min(range(3), key=lambda index: cycle_edges[index].edge_key)
                cycle_edges = cycle_edges[start:] + cycle_edges[:start]
                matches.append(
                    _make_match(
                        "Cycle",
                        cycle_edges,
                        CYCLE_RECIPROCITY,
                    )
                )
    return matches


def generate_matches(data: DataSet) -> tuple[list[Match], list[CandidateEdge]]:
    edges = generate_candidate_edges(data)
    matches = generate_direct_matches(edges) + generate_cycle_matches(edges)
    matches = [match for match in matches if len({matching_identity(data, user) for user in match.participants}) == len(match.edges)]
    matches.sort(
        key=lambda match: (
            -match.scores["final_score"],
            0 if match.match_type == "Direct" else 1,
            match.match_id,
        )
    )
    return matches, edges
