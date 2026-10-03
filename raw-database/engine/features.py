from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Iterable

from .config import (
    CONTRIBUTION_COLD_START,
    LEVEL_FACTOR,
    LEVEL_ORDER,
    MAX_ACTIVE_COMMITMENTS,
    RELIABILITY_COLD_START,
    WEIGHTS,
)
from .data import DataSet


def _float(value: str | int | float | None, default: float = 0.0) -> float:
    if value in (None, ""):
        return default
    return float(value)


def clamp_score(value: float) -> float:
    return max(0.0, min(100.0, float(value)))


def level_score(level: str) -> float:
    factor = LEVEL_FACTOR.get(level, 0.0)
    return clamp_score(factor / max(LEVEL_FACTOR.values()) * 100.0)


def level_is_compatible(provider_level: str, required_level: str) -> bool:
    if provider_level not in LEVEL_ORDER or required_level not in LEVEL_ORDER:
        return False
    return LEVEL_ORDER[provider_level] >= LEVEL_ORDER[required_level]


def mode_is_compatible(offer_mode: str, need_mode: str) -> bool:
    return (
        offer_mode == "Either"
        or need_mode == "Either"
        or offer_mode == need_mode
    )


def location_score(offer: dict[str, str], need: dict[str, str]) -> float:
    if offer.get("mode") == "Online" or need.get("mode") == "Online":
        return 100.0
    offer_location = offer.get("location", "")
    need_location = need.get("location", "")
    if "Anywhere" in (offer_location, need_location):
        return 100.0
    if offer_location == need_location:
        return 100.0
    return 70.0


def availability_score(data: DataSet, offer_id: str, need_id: str) -> float:
    offer_slots = data.offer_slots.get(offer_id, set())
    need_slots = data.need_slots.get(need_id, set())
    if not need_slots:
        return 0.0
    return len(offer_slots & need_slots) / len(need_slots) * 100.0


def value_balance(values: Iterable[float]) -> float:
    values = [float(value) for value in values]
    if not values:
        return 0.0
    maximum = max(values)
    if maximum <= 0:
        return 0.0
    minimum = min(values)
    return clamp_score((1.0 - (maximum - minimum) / maximum) * 100.0)


def _base_value(data: DataSet, skill_id: str) -> float:
    row = data.skill_values_by_skill.get(skill_id)
    return _float(row.get("base_value") if row else None)


def effective_value(
    data: DataSet,
    offer: dict[str, str],
    sessions: float | None = None,
) -> float:
    """Calculate the value of the service offered for the matched sessions.

    Session demand comes from the Need on the edge. ``max_sessions`` is used
    as a feasibility filter, not as the value multiplier, so an Offer that can
    serve ten sessions does not receive ten times the value for a one-session
    recommendation.
    """
    matched_sessions = (
        _float(offer.get("max_sessions"), 0.0)
        if sessions is None
        else sessions
    )
    return (
        _base_value(data, offer["skill_id"])
        * LEVEL_FACTOR.get(offer.get("level", ""), 0.0)
        * (_float(offer.get("duration_minutes")) / 60.0)
        * matched_sessions
        * _float(offer.get("value_adjustment"), 1.0)
    )


def _max_offer_value(data: DataSet) -> float:
    values = [effective_value(data, offer) for offer in data.offers]
    return max(values, default=0.0)


def contribution_score(data: DataSet, user_id: str) -> float:
    values = data.contribution_by_user
    current = values.get(user_id, CONTRIBUTION_COLD_START)
    maximum = max(values.values(), default=0.0)
    if maximum <= 0:
        return 0.0
    return clamp_score(math.log1p(current) / math.log1p(maximum) * 100.0)


def reliability_score(data: DataSet, user_id: str) -> float:
    return clamp_score(data.reliability_by_user.get(user_id, RELIABILITY_COLD_START))


def risk_score(data: DataSet, user_id: str) -> float:
    active = data.commitment_by_user.get(user_id, 0.0)
    return clamp_score(active / MAX_ACTIVE_COMMITMENTS * 100.0)


def is_excluded(data: DataSet, user_id: str, skill_id: str) -> bool:
    return "Excluded" in data.preferences.get((user_id, skill_id), set())


@dataclass(frozen=True)
class EdgeMetrics:
    offer_id: str
    need_id: str
    provider_user_id: str
    receiver_user_id: str
    skill_id: str
    compatibility_score: float
    level_score: float
    availability_score: float
    convenience_score: float
    contribution_score: float
    reliability_score: float
    risk_score: float
    effective_value: float
    level_value_score: float

    def as_dict(self) -> dict[str, float | str]:
        return {
            "offer_id": self.offer_id,
            "need_id": self.need_id,
            "provider_user_id": self.provider_user_id,
            "receiver_user_id": self.receiver_user_id,
            "skill_id": self.skill_id,
            "compatibility_score": self.compatibility_score,
            "level_score": self.level_score,
            "availability_score": self.availability_score,
            "convenience_score": self.convenience_score,
            "contribution_score": self.contribution_score,
            "reliability_score": self.reliability_score,
            "risk_score": self.risk_score,
            "effective_value": self.effective_value,
            "level_value_score": self.level_value_score,
        }


def calculate_edge_metrics(
    data: DataSet,
    offer: dict[str, str],
    need: dict[str, str],
    max_offer_value: float | None = None,
) -> EdgeMetrics:
    provider_level_score = level_score(offer["level"])
    compatibility = clamp_score(0.6 * 100.0 + 0.4 * provider_level_score)
    sessions = _float(need.get("sessions_needed"), 0.0)
    service_value = effective_value(data, offer, sessions=sessions)
    normalization_base = max_offer_value if max_offer_value is not None else _max_offer_value(data)
    level_value = (
        clamp_score(service_value / normalization_base * 100.0)
        if normalization_base > 0
        else 0.0
    )
    return EdgeMetrics(
        offer_id=offer["offer_id"],
        need_id=need["need_id"],
        provider_user_id=offer["user_id"],
        receiver_user_id=need["user_id"],
        skill_id=offer["skill_id"],
        compatibility_score=compatibility,
        level_score=provider_level_score,
        availability_score=availability_score(data, offer["offer_id"], need["need_id"]),
        convenience_score=location_score(offer, need),
        contribution_score=contribution_score(data, offer["user_id"]),
        reliability_score=reliability_score(data, offer["user_id"]),
        risk_score=max(
            risk_score(data, offer["user_id"]),
            risk_score(data, need["user_id"]),
        ),
        effective_value=service_value,
        level_value_score=level_value,
    )


def aggregate_score(
    edges: list[EdgeMetrics],
    reciprocity_score: float,
) -> dict[str, float]:
    if not edges:
        raise ValueError("Cannot score a match without edges")

    def average(field: str) -> float:
        return sum(float(getattr(edge, field)) for edge in edges) / len(edges)

    scores = {
        "compatibility_score": average("compatibility_score"),
        "level_score": average("level_score"),
        "availability_score": average("availability_score"),
        "convenience_score": average("convenience_score"),
        "contribution_score": average("contribution_score"),
        "reliability_score": average("reliability_score"),
        "risk_score": average("risk_score"),
        "level_value_score": average("level_value_score"),
        "value_balance_score": value_balance(edge.effective_value for edge in edges),
        "reciprocity_score": reciprocity_score,
    }
    scores["final_score"] = sum(
        WEIGHTS[field] * scores[field]
        for field in WEIGHTS
    )
    return scores
