---
name: skills-ring-match-feasibility
description: Change or explain the Skills-Ring CSV recommender's hard eligibility filters, direct matches, and three-person cycle construction. Use for raw-database matching behavior.
---

# Skills-Ring match feasibility

Use [`engine/matching.py`](../../raw-database/engine/matching.py) as the implementation source and [`engine/data.py`](../../raw-database/engine/data.py) for input indexes and resource locks. A candidate Edge means one provider's Offer satisfies another user's Need. A complete Match is either two reciprocal Edges or a directed three-person cycle. Feasibility is decided before scoring.

## Edge eligibility

Keep these hard filters explicit when changing the recommender:

1. Provider and receiver are different active users; the Offer, Need, and skill are active.
2. Offer and Need refer to the same `skill_id`. The provider's level meets or exceeds `required_provider_level` in the order Beginner, Intermediate, Advanced, Expert.
3. Offer duration is at least requested duration, and `max_sessions` is at least `sessions_needed`.
4. Modes agree, or either listing uses `Either`. Offer and Need share at least one availability slot.
5. Neither participant has marked the skill `Excluded`. `Preferred` and `Acceptable` do not change eligibility or score in this engine.
6. Neither listing is locked by an already confirmed Exchange; see [exchange history](../skills-ring-exchange-history/SKILL.md).

Location is a convenience **score**, not a hard filter in this engine. Listing `conditions` are present in the CSV but are not currently interpreted by this recommender. Do not claim those fields are enforced without implementing that behavior. Likewise, `max_active_commitments` does not reject a candidate Edge here; open commitments contribute to a risk score.

## Routes and identity

Direct Matches pair `A→B` and `B→A`. Cycles pair `A→B`, `B→C`, and `C→A` with three distinct participants and distinct Edges. The engine does not construct four-person cycles. Each complete route is scored once, with all its legs considered together.

Candidate Edges are sorted by `(offer_id, need_id)`. Direct Edge pairs are ordered by that key. Cycle rotations are deduplicated and begin with the smallest Edge key, so changing input row order does not change Match IDs. IDs start `D-` or `C-` and contain the Offer/Need IDs of each leg. Maintain that stability when changing enumeration; confirmed Exchanges refer back to source Match IDs.

For a change to eligibility or route construction, run the focused tests in [`tests/test_recommendation_engine.py`](../../raw-database/tests/test_recommendation_engine.py). Its current snapshot baseline is 576 eligible Edges, 91 Direct Matches, and 13 Cycles. Treat those figures as fixture expectations, not algorithm limits.
