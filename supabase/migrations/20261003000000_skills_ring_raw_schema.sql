-- Skills-Ring raw-database schema
--
-- This migration preserves the 24 exported base tables and recreates
-- current_user_reliability as a live view. The CSV snapshot is loaded by the
-- companion seed.sql file after this migration has been applied.

create table if not exists public.categories (
  category_id text primary key,
  category_name text not null,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.users (
  user_id text primary key,
  name text not null,
  avatar_url text,
  status text not null default 'Active' check (status in ('Active', 'Suspended', 'Deleted')),
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.skills (
  skill_id text primary key,
  category_id text not null references public.categories(category_id),
  skill_name text not null,
  description text,
  status text not null default 'Active' check (status in ('Active', 'Disabled')),
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.skill_values (
  skill_value_id text primary key,
  skill_id text not null references public.skills(skill_id),
  base_value numeric(12, 4) not null check (base_value >= 0),
  version text not null,
  semester text,
  effective_from date not null,
  effective_to date,
  created_at timestamp without time zone not null default (timezone('utc', now())),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.time_slots (
  slot_id integer primary key,
  slot_name text not null,
  sort_order integer not null check (sort_order > 0)
);

create table if not exists public.offers (
  offer_id text primary key,
  user_id text not null references public.users(user_id),
  skill_id text not null references public.skills(skill_id),
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  duration_minutes integer not null check (duration_minutes > 0),
  max_sessions integer not null check (max_sessions > 0),
  mode text not null check (mode in ('Online', 'Offline', 'Either')),
  location text not null,
  value_adjustment numeric(12, 4) not null default 1 check (value_adjustment >= 0),
  conditions text,
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Fulfilled', 'Deleted')),
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.needs (
  need_id text primary key,
  user_id text not null references public.users(user_id),
  skill_id text not null references public.skills(skill_id),
  required_provider_level text not null check (required_provider_level in ('Beginner', 'Intermediate', 'Advanced', 'Expert')),
  duration_minutes integer not null check (duration_minutes > 0),
  sessions_needed integer not null check (sessions_needed > 0),
  mode text not null check (mode in ('Online', 'Offline', 'Either')),
  location text not null,
  conditions text,
  status text not null default 'Active' check (status in ('Active', 'Paused', 'Fulfilled', 'Deleted')),
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.offer_availability (
  offer_id text not null references public.offers(offer_id) on delete cascade,
  slot_id integer not null references public.time_slots(slot_id),
  primary key (offer_id, slot_id)
);

create table if not exists public.need_availability (
  need_id text not null references public.needs(need_id) on delete cascade,
  slot_id integer not null references public.time_slots(slot_id),
  primary key (need_id, slot_id)
);

create table if not exists public.exchange_preferences (
  preference_id text primary key,
  user_id text not null references public.users(user_id),
  skill_id text not null references public.skills(skill_id),
  preference_type text not null check (preference_type in ('Preferred', 'Acceptable', 'Excluded')),
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.system_config (
  config_key text primary key,
  config_value text not null,
  description text,
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.reliability_history (
  reliability_id text primary key,
  user_id text not null references public.users(user_id),
  completion_rate numeric(6, 2),
  on_time_rate numeric(6, 2),
  commitment_fulfillment_rate numeric(6, 2),
  response_rate numeric(6, 2),
  dispute_free_rate numeric(6, 2),
  cancellation_rate numeric(6, 2),
  no_show_rate numeric(6, 2),
  reliability_score numeric(6, 2),
  algorithm_version text,
  calculated_at timestamp without time zone not null
);

create table if not exists public.matches (
  match_id text primary key,
  match_type text not null check (match_type in ('Direct', 'Cycle')),
  user_a text not null references public.users(user_id),
  user_b text not null references public.users(user_id),
  user_c text references public.users(user_id),
  offer_id_a text not null references public.offers(offer_id),
  need_id_a text not null references public.needs(need_id),
  offer_id_b text not null references public.offers(offer_id),
  need_id_b text not null references public.needs(need_id),
  offer_id_c text references public.offers(offer_id),
  need_id_c text references public.needs(need_id),
  compatibility_score numeric(8, 4),
  level_score numeric(8, 4),
  availability_score numeric(8, 4),
  convenience_score numeric(8, 4),
  reciprocity_score numeric(8, 4),
  contribution_score numeric(8, 4),
  reliability_score numeric(8, 4),
  risk_score numeric(8, 4),
  level_value_score numeric(8, 4),
  value_balance_score numeric(8, 4),
  final_score numeric(8, 4),
  check ((match_type = 'Direct' and user_c is null and offer_id_c is null and need_id_c is null)
      or (match_type = 'Cycle' and user_c is not null and offer_id_c is not null and need_id_c is not null))
);

create table if not exists public.recommendation_rankings (
  match_id text not null references public.matches(match_id) on delete cascade,
  target_user_id text not null references public.users(user_id),
  rank_position integer not null check (rank_position > 0),
  primary key (match_id, target_user_id)
);

create table if not exists public.recommendation_events (
  event_id text primary key,
  match_id text not null references public.matches(match_id),
  user_id text not null references public.users(user_id),
  event_type text not null,
  rank_position integer check (rank_position is null or rank_position > 0),
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.exchanges (
  exchange_id text primary key,
  exchange_type text not null check (exchange_type in ('Direct', 'Cycle')),
  status text not null check (status in ('Proposed', 'Confirmed', 'Active', 'Partially Settled', 'Settled', 'Disputed', 'Withdrawn', 'Defaulted')),
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.exchange_matches (
  exchange_id text not null references public.exchanges(exchange_id) on delete cascade,
  match_id text not null references public.matches(match_id),
  primary key (exchange_id, match_id)
);

create table if not exists public.exchange_participants (
  exchange_id text not null references public.exchanges(exchange_id) on delete cascade,
  user_id text not null references public.users(user_id),
  participant_status text not null,
  joined_at timestamp without time zone not null default (timezone('utc', now())),
  primary key (exchange_id, user_id)
);

create table if not exists public.commitments (
  commitment_id text primary key,
  exchange_id text not null references public.exchanges(exchange_id),
  source_match_id text not null references public.matches(match_id),
  debtor_id text not null references public.users(user_id),
  beneficiary_id text not null references public.users(user_id),
  skill_id text not null references public.skills(skill_id),
  duration_minutes integer not null check (duration_minutes > 0),
  total_sessions integer not null check (total_sessions > 0),
  value_per_session_snapshot numeric(12, 4),
  status text not null check (status in ('Proposed', 'Active', 'Partially Settled', 'Settled', 'Disputed', 'Defaulted', 'Cancelled')),
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.sessions (
  session_id text primary key,
  commitment_id text not null references public.commitments(commitment_id),
  exchange_id text not null references public.exchanges(exchange_id),
  provider_id text not null references public.users(user_id),
  receiver_id text not null references public.users(user_id),
  scheduled_time timestamp without time zone,
  scheduled_duration_minutes integer not null check (scheduled_duration_minutes > 0),
  actual_duration_minutes integer check (actual_duration_minutes is null or actual_duration_minutes > 0),
  status text not null check (status in ('Scheduled', 'Completed', 'Cancelled', 'No Show', 'Disputed')),
  notes text,
  completed_at timestamp without time zone,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.contributions (
  contribution_id text primary key,
  session_id text not null references public.sessions(session_id),
  commitment_id text not null references public.commitments(commitment_id),
  exchange_id text not null references public.exchanges(exchange_id),
  provider_id text not null references public.users(user_id),
  receiver_id text not null references public.users(user_id),
  skill_id text not null references public.skills(skill_id),
  duration_minutes integer not null check (duration_minutes > 0),
  base_value_snapshot numeric(12, 4),
  adjustment_snapshot numeric(12, 4),
  contribution_value numeric(12, 4),
  settlement_status text not null check (settlement_status in ('Unsettled', 'Settled', 'Disputed')),
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.evaluations (
  evaluation_id text primary key,
  session_id text not null references public.sessions(session_id),
  evaluator_id text not null references public.users(user_id),
  evaluatee_id text not null references public.users(user_id),
  on_time boolean,
  completed_as_agreed boolean,
  engaged boolean,
  would_exchange_again boolean,
  comment text,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.disputes (
  dispute_id text primary key,
  exchange_id text not null references public.exchanges(exchange_id),
  session_id text references public.sessions(session_id),
  reporter_id text not null references public.users(user_id),
  respondent_id text not null references public.users(user_id),
  reason text not null,
  status text not null,
  resolution text,
  created_at timestamp without time zone not null default (timezone('utc', now())),
  resolved_at timestamp without time zone
);

create table if not exists public.withdrawals (
  withdrawal_id text primary key,
  exchange_id text not null references public.exchanges(exchange_id),
  user_id text not null references public.users(user_id),
  reason text not null,
  status text not null,
  rematch_required boolean not null default false,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create or replace view public.current_user_reliability
with (security_invoker = true)
as
with latest as (
  select distinct on (rh.user_id)
    rh.user_id,
    rh.reliability_score
  from public.reliability_history rh
  order by rh.user_id, rh.calculated_at desc, rh.reliability_id desc
)
select
  u.user_id,
  coalesce(l.reliability_score, 50.0)::numeric(6, 2) as reliability_score,
  (l.user_id is null) as is_cold_start
from public.users u
left join latest l on l.user_id = u.user_id;

create index if not exists idx_skills_category on public.skills(category_id);
create index if not exists idx_skill_values_skill_effective on public.skill_values(skill_id, effective_from desc);
create index if not exists idx_offers_user_status on public.offers(user_id, status);
create index if not exists idx_offers_skill_status on public.offers(skill_id, status);
create index if not exists idx_needs_user_status on public.needs(user_id, status);
create index if not exists idx_needs_skill_status on public.needs(skill_id, status);
create index if not exists idx_offer_availability_slot on public.offer_availability(slot_id);
create index if not exists idx_need_availability_slot on public.need_availability(slot_id);
create index if not exists idx_preferences_user_skill on public.exchange_preferences(user_id, skill_id);
create index if not exists idx_reliability_history_user_calculated on public.reliability_history(user_id, calculated_at desc);
create index if not exists idx_matches_users on public.matches(user_a, user_b, user_c);
create index if not exists idx_rankings_target_rank on public.recommendation_rankings(target_user_id, rank_position);
create index if not exists idx_exchange_participants_user on public.exchange_participants(user_id);
create index if not exists idx_commitments_debtor_status on public.commitments(debtor_id, status);
create index if not exists idx_commitments_beneficiary on public.commitments(beneficiary_id);
create index if not exists idx_sessions_exchange_status on public.sessions(exchange_id, status);
create index if not exists idx_contributions_provider_status on public.contributions(provider_id, settlement_status);

-- The raw snapshot has no auth-user mapping yet. Keep every table and the
-- derived view private until authenticated ownership policies are added.
alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.skills enable row level security;
alter table public.skill_values enable row level security;
alter table public.time_slots enable row level security;
alter table public.offers enable row level security;
alter table public.needs enable row level security;
alter table public.offer_availability enable row level security;
alter table public.need_availability enable row level security;
alter table public.exchange_preferences enable row level security;
alter table public.system_config enable row level security;
alter table public.reliability_history enable row level security;
alter table public.matches enable row level security;
alter table public.recommendation_rankings enable row level security;
alter table public.recommendation_events enable row level security;
alter table public.exchanges enable row level security;
alter table public.exchange_matches enable row level security;
alter table public.exchange_participants enable row level security;
alter table public.commitments enable row level security;
alter table public.sessions enable row level security;
alter table public.contributions enable row level security;
alter table public.evaluations enable row level security;
alter table public.disputes enable row level security;
alter table public.withdrawals enable row level security;

revoke all on table
  public.categories,
  public.users,
  public.skills,
  public.skill_values,
  public.time_slots,
  public.offers,
  public.needs,
  public.offer_availability,
  public.need_availability,
  public.exchange_preferences,
  public.system_config,
  public.reliability_history,
  public.matches,
  public.recommendation_rankings,
  public.recommendation_events,
  public.exchanges,
  public.exchange_matches,
  public.exchange_participants,
  public.commitments,
  public.sessions,
  public.contributions,
  public.evaluations,
  public.disputes,
  public.withdrawals
from anon, authenticated;
revoke all on table public.current_user_reliability from anon, authenticated;
