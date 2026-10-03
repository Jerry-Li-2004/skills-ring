-- Matching identity is only an exclusion signal; it never grants account access.
alter table public.users add column matching_identity_id text;
create index users_matching_identity_idx on public.users(matching_identity_id);
create table public.matching_identity_keys (
  identity_key text primary key,
  matching_identity_id text not null
);
alter table public.matching_identity_keys enable row level security;
revoke all on public.matching_identity_keys from public, anon, authenticated;
grant all on public.matching_identity_keys to service_role;

create function public.bind_matching_identity(profile_id text, identity_key text)
returns void language plpgsql security invoker set search_path = '' as $$
declare current_group text; known_group text; chosen_group text;
begin
  if identity_key is null or length(identity_key) <> 64 then
    raise exception 'Invalid matching identity key';
  end if;
  -- Serialize group reconciliation, including concurrent registrations.
  perform 1 from public.app_revision where id = 1 for update;
  perform pg_catalog.pg_advisory_xact_lock(781245933);
  select matching_identity_id into current_group from public.users where user_id = profile_id for update;
  if not found then raise exception 'Profile not found'; end if;
  select k.matching_identity_id into known_group from public.matching_identity_keys k where k.identity_key = bind_matching_identity.identity_key;
  chosen_group := coalesce(known_group, current_group, gen_random_uuid()::text);
  if current_group is not null and current_group <> chosen_group then
    update public.users set matching_identity_id = chosen_group where matching_identity_id = current_group;
    update public.matching_identity_keys set matching_identity_id = chosen_group where matching_identity_id = current_group;
  end if;
  insert into public.matching_identity_keys values (identity_key, chosen_group) on conflict do nothing;
  update public.users set matching_identity_id = chosen_group where user_id = profile_id and matching_identity_id is distinct from chosen_group;
  if current_group is distinct from chosen_group then
    update public.app_revision set revision = revision + 1 where id = 1;
  end if;
end $$;
revoke all on function public.bind_matching_identity(text,text) from public, anon, authenticated;
grant execute on function public.bind_matching_identity(text,text) to service_role;

-- Preserve the old three-argument RPC until the new app has deployed.
create function public.register_with_starter(profile_id text, display_name text, starter jsonb, identity_key text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform public.register_with_starter(profile_id, display_name, starter);
  perform public.bind_matching_identity(profile_id, identity_key);
end $$;
revoke all on function public.register_with_starter(text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.register_with_starter(text,text,jsonb,text) to service_role;

create function public.reject_self_teaching()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare provider_identity text; receiver_identity text;
begin
  select coalesce(matching_identity_id, user_id) into provider_identity from public.users where user_id = new.provider_id;
  select coalesce(matching_identity_id, user_id) into receiver_identity from public.users where user_id = new.receiver_id;
  if new.provider_id = new.receiver_id or provider_identity = receiver_identity then
    raise exception 'A person cannot teach themselves, including through another profile';
  end if;
  return new;
end $$;
revoke all on function public.reject_self_teaching() from public, anon, authenticated;
grant execute on function public.reject_self_teaching() to service_role;
create trigger exchange_legs_reject_self_teaching before insert or update of provider_id, receiver_id on public.exchange_legs for each row execute function public.reject_self_teaching();
create trigger sessions_reject_self_teaching before insert or update of provider_id, receiver_id on public.sessions for each row execute function public.reject_self_teaching();
