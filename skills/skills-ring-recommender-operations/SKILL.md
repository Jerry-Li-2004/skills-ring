---
name: skills-ring-recommender-operations
description: Run, test, inspect, or integrate the Skills-Ring raw-database CSV recommendation engine. Use for its input/output workflow and implementation boundary.
---

# Skills-Ring recommender operations

The entry point is [`raw-database/main.py`](../../raw-database/main.py). Its default input is `HacKU/database_demo2_csv`, and its default output is `result_outputs` under `raw-database`. Run from `raw-database`:

```sh
python main.py
python -m unittest discover -s tests -v
```

Use `--data-dir` and `--output-dir` for other directories. The output directory must be outside the input directory. Each run reloads the CSV files, recomputes all feasible recommendations, and overwrites two output files. It does not modify input CSVs, SQLite, or exchange history.

## Output contract

- `result_outputs/matches.csv` has one row per complete Direct or three-person Cycle, including leg IDs and component scores.
- `result_outputs/recommendation_rankings.csv` has one row per participating user per Match, with ranks starting at 1 for each user.
- Both generated CSVs append `#`-prefixed field documentation after their data rows. Programmatic consumers must skip lines whose first non-whitespace character is `#`.
- All candidates and ranks are written. The input config's `max_recommendations=20` is not applied in CSV mode; database Top 20 write-back has not been implemented.

The supplied snapshot currently yields 576 eligible Edges, 91 Direct Matches, 13 Cycles, 104 complete Matches, and 221 user ranking rows. These numbers are a regression baseline for this data, not fixed limits. The [raw-database README](../../raw-database/README.md) explains the scoring and output assumptions; the [tests](../../raw-database/tests/test_recommendation_engine.py) cover cold starts, historical aggregation, resource locks, cycles, stable ordering, and output replacement.

## Integration boundary

Input `matches.csv` is historical source data, while output `matches.csv` is a newly generated candidate set. Never overwrite or substitute the former with the latter. Keep confirmed source Matches and Exchange links when moving from CSV to database reads. The snapshot's SQL output tables are empty, and this runner does not perform database writes, acceptance transitions, exchange execution, or trust updates.

For website integration, reconcile the formal snapshot's 50 skills with the website demo's separate 42-entry library, map participant identities, and preserve server-side authorization and transactional state changes. The [website skill](../build-skills-ring-website/SKILL.md) contains product rules; this skill describes what the current CSV implementation actually does.
