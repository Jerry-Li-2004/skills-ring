# Skills-Ring Supabase migration

This directory migrates the formal raw-database snapshot in
`raw-database/HacKU/database_demo2_csv` into Postgres:

- `migrations/20261003000000_skills_ring_raw_schema.sql` creates all 24 base
  tables, foreign keys, checks, indexes, RLS, and the live
  `current_user_reliability` view.
- `seed.sql` loads the snapshot data. It is generated from all CSV files by
  `scripts/generate-supabase-seed.py`.

The raw snapshot contains 24 base-table CSVs plus one derived view snapshot.
The derived view is intentionally recomputed from `reliability_history`, so it
cannot drift from its source records.

## Deployed project

The snapshot is deployed to the dedicated `skillsring` project in the
`skillsring` organization:

- Project ref: `mwyictnozocjicjeacqk`
- Region: `ap-southeast-1` (Singapore)
- URL: <https://mwyictnozocjicjeacqk.supabase.co>
- Applied migrations: `skills_ring_raw_schema`,
  `skills_ring_security_and_fk_indexes`

Do not expose a service-role key in the browser or commit database credentials.
The migration and seed remain reproducible for restoring another dedicated
environment.

After loading the seed, verify at least:

```sql
select count(*) from public.users;                         -- 300
select count(*) from public.offers;                        -- 500
select count(*) from public.needs;                         -- 500
select count(*) from public.offer_availability;            -- 697
select count(*) from public.need_availability;              -- 691
select count(*) from public.current_user_reliability;      -- 300
select count(*) from public.matches;                       -- 0
```

All tables and the view start private under RLS. Public/authenticated Data API
policies should be added only after the application has an explicit mapping
between Supabase Auth users and the raw `user_id` values.
