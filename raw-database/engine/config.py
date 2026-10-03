from __future__ import annotations

LEVEL_FACTOR = {
    "Beginner": 1.0,
    "Intermediate": 1.2,
    "Advanced": 1.5,
    "Expert": 1.8,
}

LEVEL_ORDER = {name: index for index, name in enumerate(LEVEL_FACTOR)}

WEIGHTS = {
    "reliability_score": 0.25,
    "compatibility_score": 0.20,
    "availability_score": 0.15,
    "reciprocity_score": 0.15,
    "contribution_score": 0.10,
    "convenience_score": 0.05,
    "value_balance_score": 0.05,
    "level_value_score": 0.05,
    "risk_score": -0.05,
}

DIRECT_RECIPROCITY = 100.0
CYCLE_RECIPROCITY = 85.0
MAX_CYCLE_SIZE = 3
MAX_ACTIVE_COMMITMENTS = 3
RELIABILITY_COLD_START = 50.0
CONTRIBUTION_COLD_START = 0.0

