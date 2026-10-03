---
name: skills-ring-data-contract
description: Work with the Skills-Ring formal CSV snapshot, table relationships, and input contract. Use when reading, validating, mapping, or changing raw-database data and schemas.
---

# Skills-Ring data contract

Use this skill for the data in [`raw-database/HacKU/database_demo2_csv`](../../raw-database/HacKU/database_demo2_csv). Read its [README](../../raw-database/HacKU/database_demo2_csv/README.md) and the relevant CSV headers before making a field-level change. The 25 UTF-8 CSVs are a read-only export of a SQLite database. They preserve column names and values, but not primary-key, foreign-key, check-constraint, or view definitions. The SQLite schema is authoritative for structural changes; do not infer absent constraints from the CSVs.

## Inventory and relationships

The supplied snapshot has 24 table files and one derived view snapshot. These are the baseline row counts, not schema limits.

| Area | Files and baseline rows | Relationship or purpose |
|---|---|---|
| Identity and catalog | `users` 300, `categories` 8, `skills` 50, `skill_values` 50 | `skills.category_id` identifies a category; `skill_values.skill_id` holds versioned base values. Users and skills have status fields. |
| Listings and feasibility | `offers` 500, `needs` 500, `time_slots` 9, `offer_availability` 697, `need_availability` 691, `exchange_preferences` 200 | An Offer or Need belongs to a user and skill. Availability joins a listing to a slot. Preferences join a user and skill. |
| Configuration and trust inputs | `system_config` 8, `reliability_history` 80, `current_user_reliability` 300 | Reliability history belongs to users. `current_user_reliability` is a view snapshot, not a base table or live view. |
| Recommendation records | `matches` 0, `recommendation_rankings` 0, `recommendation_events` 0 | A ranking connects a match and target user; events describe later recommendation interactions. The formal input snapshot has headers only for these files. |
| Exchange and performance records | `exchanges` 0, `exchange_matches` 0, `exchange_participants` 0, `sessions` 0, `commitments` 0, `contributions` 0, `evaluations` 0, `disputes` 0, `withdrawals` 0 | Links preserve the source match, participants, obligations, delivered service, feedback, and exceptions. These files currently have headers only. |

Use the actual headers for exact field names. Particularly important distinctions:

- `offers.duration_minutes` is duration **per session**; `offers.max_sessions` is capacity. `needs.duration_minutes` and `needs.sessions_needed` are separate demand fields.
- `offers.level` is the provider's level; `needs.required_provider_level` is the minimum. Both listings have their own `mode`, `location`, `conditions`, and `status`.
- `skill_values` has `base_value`, `version`, `effective_from`, and `effective_to`. The current engine chooses the most recent active value row for a skill.
- `reliability_history` contains component rates, `reliability_score`, `algorithm_version`, and `calculated_at`. `current_user_reliability` contains `user_id`, `reliability_score`, and `is_cold_start`.
- `matches` records up to three Offer/Need legs (`a`, `b`, `c`) and their aggregate scores. `exchange_matches` links a later Exchange back to its source Match.
- `sessions` records scheduled and actual duration. `commitments` records debtor, beneficiary, total sessions, and status; `contributions` records actual provider, receiver, value snapshot, and settlement status. Do not substitute one for the other.

## Reading and changing data

The formal CSV files are inputs. Keep generated files in a separate output directory: the input `matches.csv` is historical source data, while the output `matches.csv` contains this run's candidate recommendations. Empty CSV fields represent SQL `NULL`. The formal snapshot has no comment footer; generated result CSVs do.

[`engine/data.py`](../../raw-database/engine/data.py) defines the reader's required versus optional files, key-column checks, cached indexes, and historical aggregations. Its validation checks headers, row width, and key uniqueness; it does not recreate all SQLite constraints. Changes to the CSV contract should be checked against both the source database schema and consumers of those fields.

Do not treat the 42-entry library in the website demo as identical to this snapshot's 50 skills without an explicit mapping. For product-wide rules, consult the existing [website skill](../build-skills-ring-website/SKILL.md); preserve the distinction between its product requirements and this snapshot's current implementation.
