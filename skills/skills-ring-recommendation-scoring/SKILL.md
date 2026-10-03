---
name: skills-ring-recommendation-scoring
description: Explain or change the Skills-Ring CSV recommender's scoring, historical signals, ranking, and output scores. Use for raw-database recommendation quality work.
---

# Skills-Ring recommendation scoring

Read [`engine/config.py`](../../raw-database/engine/config.py), [`engine/features.py`](../../raw-database/engine/features.py), and [`engine/output.py`](../../raw-database/engine/output.py) before editing a formula. Score only feasible Edges and complete Matches. The configured weights below are code constants in this version; do not assume every `system_config.csv` value dynamically controls them.

## Edge and Match signals

| Signal | Current calculation |
|---|---|
| Compatibility | `0.6 × 100 + 0.4 × level_score`; provider level is scaled by its level factor relative to Expert. |
| Availability | Shared slots divided by the Need's slot count, times 100. At least one shared slot was required for eligibility. |
| Convenience | 100 for Online, matching location, or `Anywhere`; 70 for differing physical locations. |
| Service value | `skill base_value × provider level factor × (Offer duration_minutes / 60) × Need sessions_needed × Offer value_adjustment`. The Offer's `max_sessions` filters capacity and is used for the maximum Offer-value normalization base, not as the matched-session multiplier. |
| Level value | Matched service value divided by the maximum value of available Offers, times 100 and clamped to 0–100. |
| Value balance | `100 × (1 − (maximum Edge value − minimum Edge value) / maximum Edge value)` within the Match; zero when the maximum is nonpositive. This is a soft score, not an eligibility cutoff. |
| Reliability | Latest nonempty `reliability_history` score by `(calculated_at, reliability_id)` wins over a non-cold-start `current_user_reliability` view snapshot. Missing history is 50. |
| Contribution | Sum `contribution_value` for `Settled` contributions by provider; score is `log1p(user total) / log1p(maximum user total) × 100`. No settled history scores 0. |
| Risk | Count `Proposed` and `Active` commitments by debtor; `count / 3 × 100`, clamped. An Edge uses the higher risk of its provider and receiver. Missing history scores 0. |
| Reciprocity | Direct 100; three-person Cycle 85. |

Except reciprocity and value balance, Match signals are the average of their Edge values. The final score is:

```text
0.25 reliability + 0.20 compatibility + 0.15 availability
+ 0.15 reciprocity + 0.10 contribution + 0.05 convenience
+ 0.05 value balance + 0.05 level value - 0.05 risk
```

The input config sets `max_active_commitments=1`, but the current score deliberately uses a **risk denominator of 3**. Do not silently change this to a hard cap or assume the two values mean the same thing. The input config also sets `max_recommendations=20`, while this CSV runner outputs every Match and every participating user's rank; database Top 20 write-back is future work.

Matches sort by descending final score, then Direct before Cycle, then stable `match_id`. Each participating user gets contiguous ranks starting at 1 under the same ordering. Generated `matches.csv` exposes the component scores; `recommendation_rankings.csv` contains `(match_id, target_user_id, rank_position)`. See [operations](../skills-ring-recommender-operations/SKILL.md) for the output format and current baseline.

When changing scoring, verify cold starts, history precedence, settled-only contributions, risk status selection, value calculations, ties, and row-order stability with the existing tests. Explain any material policy change in the output documentation and relevant product documentation.
