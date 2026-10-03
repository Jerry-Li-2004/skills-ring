-- Simulated refundable completion bonds for the hackathon workflow.
-- These records never represent real safeguarded or escrowed customer funds.

insert into public.system_config(config_key, config_value, description)
values
  ('bond_reference_hourly_hkd', '200', 'Simulation-only hourly anchor used to derive a disclosed service reference value'),
  ('completion_bond_rate', '0.20', 'Fixed simulation-only refundable completion bond rate')
on conflict (config_key) do nothing;

alter table public.exchange_confirmations
  add column if not exists terms_hash text,
  add column if not exists bond_terms_version text;

create table if not exists public.completion_bonds (
  bond_id text primary key,
  exchange_id text not null references public.exchanges(exchange_id) on delete cascade,
  exchange_leg_id text not null references public.exchange_legs(leg_id),
  owner_id text not null references public.users(user_id),
  currency text not null check (currency = 'HKD'),
  reference_value numeric(12, 2) not null check (reference_value >= 0),
  bond_rate numeric(7, 6) not null check (bond_rate >= 0 and bond_rate <= 1),
  bond_amount numeric(12, 2) not null check (bond_amount >= 0),
  status text not null check (status in ('Calculated', 'Held', 'Returned', 'Settled')),
  returned_amount numeric(12, 2) not null default 0 check (returned_amount >= 0),
  applied_amount numeric(12, 2) not null default 0 check (applied_amount >= 0),
  terms_version text not null,
  created_at timestamp without time zone not null default (timezone('utc', now())),
  updated_at timestamp without time zone not null default (timezone('utc', now())),
  check (returned_amount + applied_amount <= bond_amount)
);

create table if not exists public.bond_ledger_entries (
  entry_id text primary key,
  bond_id text not null references public.completion_bonds(bond_id) on delete cascade,
  exchange_id text not null references public.exchanges(exchange_id) on delete cascade,
  event_type text not null check (event_type in ('CALCULATED', 'HELD', 'RETURNED', 'SETTLED')),
  amount numeric(12, 2) not null,
  recipient_id text references public.users(user_id),
  reason text not null,
  created_at timestamp without time zone not null default (timezone('utc', now()))
);

create index if not exists idx_completion_bonds_exchange on public.completion_bonds(exchange_id);
create index if not exists idx_completion_bonds_owner_status on public.completion_bonds(owner_id, status);
create index if not exists idx_completion_bonds_leg on public.completion_bonds(exchange_leg_id);
create index if not exists idx_bond_ledger_exchange on public.bond_ledger_entries(exchange_id, created_at);
create index if not exists idx_bond_ledger_bond on public.bond_ledger_entries(bond_id, created_at);

alter table public.completion_bonds enable row level security;
alter table public.bond_ledger_entries enable row level security;
revoke all on table public.completion_bonds, public.bond_ledger_entries from anon, authenticated;
grant all on table public.completion_bonds, public.bond_ledger_entries to service_role;

create or replace function public.commit_app_mutation(expected_revision bigint, operations jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare
 current_revision bigint; op jsonb; row_data jsonb; tbl text; pk text; cols text; selected text; updates text; filter_col text; filter_value text;
begin
 select revision into current_revision from public.app_revision where id=1 for update;
 if current_revision <> expected_revision then
   raise exception 'The community changed. Reload and try again.' using errcode='40001';
 end if;
 if jsonb_typeof(operations) <> 'array' or jsonb_array_length(operations)>300 then raise exception 'Invalid transaction'; end if;
 for op in select value from jsonb_array_elements(operations) loop
   tbl := op->>'table';
   pk := case tbl when 'skills' then 'skill_id' when 'offers' then 'offer_id' when 'needs' then 'need_id'
      when 'offer_availability' then 'offer_id,slot_id' when 'need_availability' then 'need_id,slot_id'
      when 'exchanges' then 'exchange_id' when 'exchange_legs' then 'leg_id'
      when 'exchange_confirmations' then 'exchange_id,user_id' when 'exchange_participants' then 'exchange_id,user_id'
      when 'commitments' then 'commitment_id' when 'sessions' then 'session_id' when 'contributions' then 'contribution_id'
      when 'completion_bonds' then 'bond_id' when 'bond_ledger_entries' then 'entry_id' end;
   if pk is null then raise exception 'Unsupported mutation table'; end if;
   if op->>'method' = 'DELETE' then
     filter_col := case tbl when 'offer_availability' then 'offer_id' when 'need_availability' then 'need_id' when 'exchange_confirmations' then 'exchange_id' end;
     if filter_col is null then raise exception 'Unsupported deletion'; end if;
     filter_value := op->'query'->>filter_col;
     if filter_value is null or left(filter_value,3)<>'eq.' then raise exception 'Invalid deletion filter'; end if;
     execute format('delete from public.%I where %I=$1',tbl,filter_col) using substr(filter_value,4);
   elsif op->>'method' = 'POST' then
     for row_data in select value from jsonb_array_elements(case when jsonb_typeof(op->'body')='array' then op->'body' else jsonb_build_array(op->'body') end) loop
       select string_agg(format('%I',k),','), string_agg(format('x.%I',k),','), string_agg(format('%I=excluded.%I',k,k),',')
       into cols,selected,updates from jsonb_object_keys(row_data) k;
       execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) x on conflict (%s) do update set %s',tbl,cols,selected,tbl,pk,updates) using row_data;
     end loop;
   else raise exception 'Unsupported mutation method';
   end if;
 end loop;
 update public.app_revision set revision=revision+1 where id=1 returning revision into current_revision;
 return current_revision;
end $$;

revoke all on function public.commit_app_mutation(bigint,jsonb) from public, anon, authenticated;
grant execute on function public.commit_app_mutation(bigint,jsonb) to service_role;
