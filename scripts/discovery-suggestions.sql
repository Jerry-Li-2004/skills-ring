-- Server-only, computed from current listings on every request. Never a proposal.
create or replace function public.discovery_suggestions(requested_user text)
returns table(target_user_id text, candidate_user_id text, reason text, rank_position bigint, is_sample boolean)
language sql stable security invoker set search_path = public
as $$
with listings as materialized (
  select o.user_id, o.skill_id, s.category_id, 'offer' as kind
  from offers o join skills s using(skill_id) join users u using(user_id)
  where o.status='Active' and s.status='Active' and u.status='Active'
    and not exists(select 1 from exchange_preferences p where p.user_id=o.user_id and p.skill_id=o.skill_id and p.preference_type='Excluded')
  union all
  select n.user_id, n.skill_id, s.category_id, 'need' as kind
  from needs n join skills s using(skill_id) join users u using(user_id)
  where n.status='Active' and s.status='Active' and u.status='Active'
    and not exists(select 1 from exchange_preferences p where p.user_id=n.user_id and p.skill_id=n.skill_id and p.preference_type='Excluded')
), profiles as materialized (
  select user_id,array_agg(distinct skill_id) filter(where kind='offer') offered,
    array_agg(distinct skill_id) filter(where kind='need') wanted,
    array_agg(distinct category_id) categories from listings group by user_id
), existing_peers as materialized (
  select distinct peer from recommendation_rankings r join matches m using(match_id)
  cross join lateral unnest(array[m.user_a,m.user_b,m.user_c]) peer
  where r.target_user_id=requested_user
), candidates as (
  select u.user_id, u.name,
    case when me.wanted && p.offered or me.offered && p.wanted then 2
         when me.categories && p.categories then 1 else 0 end score
  from users u join profiles p using(user_id)
  left join profiles me on me.user_id=requested_user
  where u.status='Active' and u.user_id<>requested_user
    and exists(select 1 from users viewer where viewer.user_id=requested_user and viewer.status='Active')
    and u.user_id not in (select peer from existing_peers where peer is not null)
), top_candidates as (
  select * from candidates order by score desc, md5(requested_user || ':' || user_id),user_id limit 5
)
select requested_user,user_id,
  case score when 2 then 'Complementary listed skill; exchange terms and reciprocity still need checking'
    when 1 then 'Related skill category; explore their offers and requests'
    else 'Community discovery; no skill compatibility established' end,
  row_number() over(order by score desc,md5(requested_user || ':' || user_id),user_id),
  name like '%(Sample)%'
from top_candidates;
$$;
revoke all on function public.discovery_suggestions(text) from public,anon,authenticated;
grant execute on function public.discovery_suggestions(text) to service_role;
