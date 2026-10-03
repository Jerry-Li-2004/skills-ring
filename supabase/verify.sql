-- Run after applying the schema migration and seed.sql.
select 'categories' as table_name, count(*) as row_count from public.categories
union all select 'users', count(*) from public.users
union all select 'skills', count(*) from public.skills
union all select 'skill_values', count(*) from public.skill_values
union all select 'time_slots', count(*) from public.time_slots
union all select 'offers', count(*) from public.offers
union all select 'needs', count(*) from public.needs
union all select 'offer_availability', count(*) from public.offer_availability
union all select 'need_availability', count(*) from public.need_availability
union all select 'exchange_preferences', count(*) from public.exchange_preferences
union all select 'system_config', count(*) from public.system_config
union all select 'reliability_history', count(*) from public.reliability_history
union all select 'current_user_reliability', count(*) from public.current_user_reliability
union all select 'matches', count(*) from public.matches
union all select 'recommendation_rankings', count(*) from public.recommendation_rankings
union all select 'recommendation_events', count(*) from public.recommendation_events
union all select 'exchanges', count(*) from public.exchanges
union all select 'exchange_matches', count(*) from public.exchange_matches
union all select 'exchange_participants', count(*) from public.exchange_participants
union all select 'commitments', count(*) from public.commitments
union all select 'sessions', count(*) from public.sessions
union all select 'contributions', count(*) from public.contributions
union all select 'evaluations', count(*) from public.evaluations
union all select 'disputes', count(*) from public.disputes
union all select 'withdrawals', count(*) from public.withdrawals
order by table_name;

-- The derived view must match the raw reliability snapshot semantics.
select
  count(*) as reliability_rows,
  count(*) filter (where is_cold_start) as cold_start_rows,
  round(avg(reliability_score), 2) as average_reliability_score
from public.current_user_reliability;

-- Confirm the security boundary remains private until auth ownership mapping exists.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'categories', 'users', 'skills', 'skill_values', 'time_slots', 'offers', 'needs',
    'offer_availability', 'need_availability', 'exchange_preferences', 'system_config',
    'reliability_history', 'matches', 'recommendation_rankings', 'recommendation_events',
    'exchanges', 'exchange_matches', 'exchange_participants', 'commitments', 'sessions',
    'contributions', 'evaluations', 'disputes', 'withdrawals'
  )
order by tablename;
