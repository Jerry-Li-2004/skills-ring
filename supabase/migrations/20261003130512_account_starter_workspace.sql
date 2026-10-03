-- Private, account-owned examples share the main UI without entering real
-- community matching or contributing fictional history to reputation scores.
create table public.account_starter_workspaces (
  user_id text primary key references public.users(user_id) on delete cascade,
  workspace jsonb not null,
  revision integer not null default 0,
  check (workspace->>'ownerId' = user_id)
);
alter table public.account_starter_workspaces enable row level security;
revoke all on public.account_starter_workspaces from public, anon, authenticated;
grant all on public.account_starter_workspaces to service_role;

create function public.register_with_starter(profile_id text, display_name text, starter jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.users(user_id, name, status) values (profile_id, display_name, 'Active');
  insert into public.account_starter_workspaces(user_id, workspace) values (profile_id, starter);
end $$;
revoke all on function public.register_with_starter(text,text,jsonb) from public, anon, authenticated;
grant execute on function public.register_with_starter(text,text,jsonb) to service_role;
