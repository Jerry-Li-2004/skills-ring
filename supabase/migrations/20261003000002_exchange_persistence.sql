-- Persist the exchange workflow used by the web app.
-- The API server uses the service role; public clients never receive that key.

alter table public.exchanges
  add column if not exists details jsonb not null default '{}'::jsonb;

create table if not exists public.exchange_legs (
  leg_id text primary key,
  exchange_id text not null references public.exchanges(exchange_id) on delete cascade,
  offer_id text not null references public.offers(offer_id),
  need_id text not null references public.needs(need_id),
  provider_id text not null references public.users(user_id),
  receiver_id text not null references public.users(user_id),
  skill_id text not null references public.skills(skill_id),
  duration_minutes integer not null check (duration_minutes > 0),
  total_sessions integer not null check (total_sessions > 0),
  availability text not null,
  mode text not null check (mode in ('Online', 'Offline', 'Either')),
  location text not null,
  capacity integer not null check (capacity > 0),
  replaces_leg_id text,
  sort_order integer not null check (sort_order > 0),
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now()))
);

create table if not exists public.exchange_confirmations (
  exchange_id text not null references public.exchanges(exchange_id) on delete cascade,
  user_id text not null references public.users(user_id),
  confirmed_at timestamp without time zone not null default (timezone('utc', now())),
  primary key (exchange_id, user_id)
);

alter table public.commitments
  alter column source_match_id drop not null;

alter table public.sessions
  add column if not exists exchange_leg_id text references public.exchange_legs(leg_id);

create index if not exists idx_exchange_legs_exchange_sort
  on public.exchange_legs(exchange_id, sort_order);
create index if not exists idx_exchange_legs_participants
  on public.exchange_legs(provider_id, receiver_id);
create index if not exists idx_exchange_confirmations_user
  on public.exchange_confirmations(user_id, exchange_id);
create index if not exists idx_sessions_exchange_leg
  on public.sessions(exchange_id, exchange_leg_id);

alter table public.exchange_legs enable row level security;
alter table public.exchange_confirmations enable row level security;
revoke all on table public.exchange_legs, public.exchange_confirmations
  from anon, authenticated;
