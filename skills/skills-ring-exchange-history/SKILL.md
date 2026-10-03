---
name: skills-ring-exchange-history
description: Work with Skills-Ring exchange-history CSVs and their effect on recommendation eligibility and trust signals. Use when connecting matches to confirmed exchanges, obligations, sessions, or feedback.
---

# Skills-Ring exchange history

The snapshot includes headers for the post-match lifecycle, but its exchange and performance tables currently contain no rows. Use the CSV headers and [`engine/data.py`](../../raw-database/engine/data.py) for the implemented read path. Use the [website skill](../build-skills-ring-website/SKILL.md) for broader product invariants such as explicit consent, immutable completed service, partial settlement, disputes, and withdrawal recovery. Do not infer that this Python recommender performs those lifecycle transitions.

## Records and roles

- `matches` contains the complete Direct or three-person Cycle route. `recommendation_rankings` assigns a user-specific position, and `recommendation_events` is reserved for user interaction history.
- `exchanges` stores the exchange status; `exchange_matches` links it to its source Match; `exchange_participants` stores each participant's status. Keep the source Match available after confirmation so the engine can identify locked Offers and Needs.
- `sessions` records scheduled and actual service. `evaluations` records binary behavior feedback (`on_time`, `completed_as_agreed`, `engaged`, `would_exchange_again`) with an optional comment.
- `commitments` records debtor, beneficiary, service terms, and status. `contributions` records delivered service, its value snapshot, and settlement status. `disputes` and `withdrawals` retain exception records. Reliability history is a separate calculated input.

## Resource locking in the recommender

For each `exchange_matches` link, a source Match's complete set of Offers and Needs is excluded when the Exchange is `Confirmed`, `Active`, `Settled`, `Disputed`, or `Defaulted`. A `Proposed` invitation does not lock resources; a single acceptance is not a complete confirmation. `Withdrawn` releases that Exchange's lock, though another locked Exchange may still use the same resource. Released listings must still be Active to qualify again.

If a locked Exchange lacks a source Match link, or a link points to a missing Exchange or Match, loading fails rather than recommending resources whose ownership cannot be established. Preserve this fail-closed behavior when changing historical reads.

The recommender currently reads historical reliability, settled contributions, open commitments, and confirmed Exchange locks. It **does not** write Exchanges, collect acceptances, register sessions, settle obligations, resolve disputes, update reliability, or persist recommendations to the SQL database. Implement those through authenticated, transactional application flows when requested; do not describe the CSV runner as doing them.
