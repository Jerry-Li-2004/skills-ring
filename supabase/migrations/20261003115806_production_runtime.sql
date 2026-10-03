-- All functions are invoker-only and executable only by the server role.
create table public.app_revision (id integer primary key check (id=1), revision bigint not null default 0);
insert into public.app_revision(id) values (1);
alter table public.app_revision enable row level security;
revoke all on public.app_revision from anon, authenticated;
grant all on public.app_revision to service_role;

create table public.recommendation_lease (id integer primary key check(id=1), owner text, expires_at timestamptz);
insert into public.recommendation_lease(id) values (1);
alter table public.recommendation_lease enable row level security;
revoke all on public.recommendation_lease from anon, authenticated;
grant all on public.recommendation_lease to service_role;

create function public.acquire_recommendation_lease(owner text) returns boolean
language plpgsql security invoker set search_path = '' as $$
begin
  update public.recommendation_lease set owner=$1, expires_at=now()+interval '310 seconds'
  where id=1 and (expires_at is null or expires_at < now());
  return found;
end $$;
create function public.release_recommendation_lease(owner text) returns void
language sql security invoker set search_path = '' as $$
  update public.recommendation_lease set owner=null, expires_at=null where id=1 and owner=$1;
$$;

create function public.commit_app_mutation(expected_revision bigint, operations jsonb) returns bigint
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
      when 'commitments' then 'commitment_id' when 'sessions' then 'session_id' when 'contributions' then 'contribution_id' end;
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
revoke all on function public.commit_app_mutation(bigint,jsonb), public.acquire_recommendation_lease(text), public.release_recommendation_lease(text) from public, anon, authenticated;
grant execute on function public.commit_app_mutation(bigint,jsonb), public.acquire_recommendation_lease(text), public.release_recommendation_lease(text) to service_role;
