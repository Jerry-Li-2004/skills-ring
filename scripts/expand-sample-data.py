"""Add a reproducible, clearly labelled synthetic cohort without replacing live data.
Run with server Supabase environment variables; default is a read-only dry run.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path
import random
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'raw-database'))
from engine.supabase import supabase_client, load_live_dataset, _stringify_row
from engine.matching import generate_matches
from engine.job import run_live_job

parser = argparse.ArgumentParser()
parser.add_argument('--apply', action='store_true')
parser.add_argument('--target', type=int, default=1000)
args = parser.parse_args()
client = supabase_client()
assert client.url == 'https://mwyictnozocjicjeacqk.supabase.co', 'Unexpected target project'
data = load_live_dataset(client)
assert args.target >= 1000
prefix = f'sample{args.target}_'
existing = {u['user_id'] for u in data.users}
base_count = sum(not uid.startswith(prefix) for uid in existing)
count = max(700, ((1000 - base_count + 1) // 2) * 2) if args.target == 1000 else max(0, args.target - base_count)
rng = random.Random(1003)
now = datetime.now(timezone.utc).isoformat()
skills = sorted([s for s in data.skills if s['status'] == 'Active'], key=lambda s: s['skill_id'])
slots = sorted(data.time_slots, key=lambda s: int(s['sort_order']))
category_names = {c['category_id']: c['category_name'] for c in data.categories}
backgrounds = {
 'Programming': ['Computer science student', 'Software developer', 'Career-switching coder', 'Freelance developer'],
 'Languages': ['Language student', 'Community translator', 'Exchange student', 'Hospitality worker'],
 'Creative': ['Design student', 'Hobby photographer', 'Community musician', 'Freelance artist'],
 'Productivity': ['Office administrator', 'Small business owner', 'Project coordinator', 'Working parent'],
 'Career': ['Graduate mentor', 'HR professional', 'Job seeker', 'Entrepreneur'],
 'Academic': ['Postgraduate student', 'Peer tutor', 'Research assistant', 'Adult learner'],
 'Sports': ['Recreation coach', 'University athlete', 'Fitness enthusiast', 'Outdoor hobbyist'],
 'Daily Life': ['Retired hobbyist', 'Community volunteer', 'New resident', 'Part-time worker'],
}
first = ['Alex','Mei','Samira','Daniel','Priya','Yuki','Omar','Sofia','Arjun','Lin','Noah','Amina','Lucas','Hana','Maya','Kenji','Sara','Jin','Ravi','Lina']
last = ['Chan','Wong','Patel','Kim','Nguyen','Tan','Ali','Silva','Garcia','Chen','Lee','Khan','Sato','Lim','Costa','Ahmed','Park','Singh','Lau','Ho']
locations = ['Kowloon','Sha Tin','Central','Tseung Kwan O','Tuen Mun','Tai Po','Tsuen Wan','North Point']
batch = {t: [] for t in ['users','offers','needs','offer_availability','need_availability','exchange_preferences']}
profiles = []
for pair_index in range((count + 1) // 2):
    # An odd final profile reuses the first pair's compatible terms.
    pair = 0 if count % 2 and pair_index == count // 2 else pair_index
    a = skills[pair % len(skills)]
    b = skills[(pair + 1 + (pair // len(skills)) * 7) % len(skills)]
    if a == b: b = skills[(skills.index(a) + 1) % len(skills)]
    mode = ['Online','Online','Offline','Either'][pair % 4]
    location = 'Anywhere' if mode == 'Online' else locations[pair % len(locations)]
    duration = [30,60,60,90][pair % 4]
    sessions = 1 + (pair % 3 == 0)
    slot_ids = [int(slots[pair % len(slots)]['slot_id'])]
    if pair % 5 == 0: slot_ids.append(int(slots[(pair + 1) % len(slots)]['slot_id']))
    for side, (offer, need) in enumerate([(a,b),(b,a)]):
        index = pair_index * 2 + side + 1
        if index > count: continue
        uid = f'{prefix}{index:04d}'
        category = category_names[offer['category_id']]
        background = rng.choice(backgrounds.get(category, ['Community learner']))
        name = f'{first[(index-1)%len(first)]} {last[((index-1)//len(first))%len(last)]} · {background} (Sample)'
        batch['users'].append(dict(user_id=uid,name=name,status='Active',avatar_url=None,created_at=now,updated_at=now))
        common = dict(user_id=uid,duration_minutes=duration,mode=mode,location=location,conditions='',status='Active',created_at=now,updated_at=now)
        oid,nid = f'{uid}_offer',f'{uid}_need'
        batch['offers'].append(dict(**common,offer_id=oid,skill_id=offer['skill_id'],level=['Intermediate','Advanced','Expert'][index%3],max_sessions=sessions,value_adjustment=1))
        batch['needs'].append(dict(**common,need_id=nid,skill_id=need['skill_id'],required_provider_level='Beginner' if index%3 else 'Intermediate',sessions_needed=sessions))
        batch['offer_availability'].extend(dict(offer_id=oid,slot_id=s) for s in slot_ids)
        batch['need_availability'].extend(dict(need_id=nid,slot_id=s) for s in slot_ids)
        batch['exchange_preferences'].append(dict(preference_id=f'{uid}_pref',user_id=uid,skill_id=need['skill_id'],preference_type='Preferred',created_at=now))
        profiles.append(dict(user_id=uid,background=background,offers=offer['skill_name'],wants=need['skill_name'],mode=mode,location=location))
# Do not modify any existing sample profile on repeat runs.
new_ids = {u['user_id'] for u in batch['users']} - existing
for table, rows in batch.items():
    batch[table] = [row for row in rows if (row.get('user_id') or row.get('offer_id','').removesuffix('_offer') or row.get('need_id','').removesuffix('_need')) in new_ids]
# Validate actual matching workload before writing.
for table, rows in batch.items():
    getattr(data, table).extend(_stringify_row(row) for row in rows)
start = time.monotonic()
matches, edges = generate_matches(data)
elapsed = round(time.monotonic()-start, 2)
covered = {u for m in matches for u in m.participants if u in new_ids}
assert len(data.users) >= args.target
assert covered == new_ids, f'{len(new_ids-covered)} new profiles have no match'
summary = dict(before_users=len(existing),new_users=len(new_ids),after_users=len(data.users),new_offers=len(batch['offers']),new_needs=len(batch['needs']),skills_covered=len({p['offers'] for p in profiles}),backgrounds=dict(Counter(p['background'] for p in profiles)),modes=dict(Counter(p['mode'] for p in profiles)),candidate_edges=len(edges),matches=len(matches),direct=sum(m.match_type=='Direct' for m in matches),cycles=sum(m.match_type=='Cycle' for m in matches),matched_new_users=len(covered),compute_seconds=elapsed)
print(json.dumps(summary), flush=True)
assert elapsed < 120, 'Matching workload exceeds preflight budget'
out = ROOT / 'audit' / ('sample-expansion' if args.target == 1000 else f'sample-expansion-{args.target}')
out.mkdir(parents=True,exist_ok=True)
(out/'profiles.json').write_text(json.dumps(profiles,indent=2))
(out/'summary.json').write_text(json.dumps(summary,indent=2))
if args.apply:
    for table in ['users','exchange_preferences']:
        for start in range(0, len(batch[table]), 500):
            client._request('POST',table,body=batch[table][start:start+500],prefer='resolution=ignore-duplicates,return=minimal')
    operations = [dict(table=t,method='POST',body=batch[t]) for t in ['offers','needs','offer_availability','need_availability'] if batch[t]]
    if operations:
        revision = client.read_table('app_revision')[0]['revision']
        client._request('POST','rpc/commit_app_mutation',body=dict(expected_revision=int(revision),operations=operations))
    print('Sample profiles and listings persisted; refreshing recommendations.',flush=True)
    result = run_live_job(client)
    users = client.read_table('users')
    assert len(users)>=args.target
    rankings = client.read_table('recommendation_rankings')
    ranked = {r['target_user_id'] for r in rankings}
    assert new_ids <= ranked
    summary.update(applied=True,verified_users=len(users),published=result,verified_new_ranked_users=len(new_ids & ranked))
    (out/'summary.json').write_text(json.dumps(summary,indent=2))
    print(json.dumps(summary),flush=True)
