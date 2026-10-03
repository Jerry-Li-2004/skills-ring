"""Expand only labelled synthetic profiles; dry-run unless --apply is supplied."""
import argparse
import json
import sys
from pathlib import Path
from collections import Counter
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'raw-database'))
from engine.supabase import supabase_client, load_live_dataset
from engine.matching import generate_matches
from engine.job import run_live_job
p = argparse.ArgumentParser()
p.add_argument('--apply', action='store_true')
a = p.parse_args()
c = supabase_client()
assert c.url == 'https://mwyictnozocjicjeacqk.supabase.co'
d = load_live_dataset(c)
users = sorted(u['user_id'] for u in d.users if u['user_id'].startswith('sample1000_') and '(Sample)' in u['name'] and u['status']=='Active')
assert len(users)==700, 'Review changed synthetic cohort before running'
batch = {t: [] for t in ['offers','needs','offer_availability','need_availability']}
for start in range(0,len(users),10):
    group = users[start:start+10]
    for i, uid in enumerate(group):
        source = group[i%2]
        for table, kind, availability in [('offers','offer','offer_availability'),('needs','need','need_availability')]:
            key = kind+'_id'
            original = next(r for r in getattr(d,table) if r[key]==source+'_'+kind)
            if source==uid: continue
            identifier = 'discovery_v1_'+uid+'_'+kind
            if any(r[key]==identifier for r in getattr(d,table)): continue
            row = dict(original, **{key:identifier,'user_id':uid})
            batch[table].append(row)
            batch[availability].extend(dict(r, **{key:identifier}) for r in getattr(d,availability) if r[key]==original[key])
for table,rows in batch.items(): getattr(d,table).extend(rows)
matches, edges = generate_matches(d)
counts = Counter(u for m in matches for u in m.participants)
assert all(counts[u]>=5 for u in users), 'Synthetic coverage preflight failed'
summary = dict(users=len(d.users),synthetic_users=len(users),added={t:len(r) for t,r in batch.items()},matches=len(matches),edges=len(edges),synthetic_min_matches=min(counts[u] for u in users),active_without_exchange=sum(counts[u['user_id']]==0 for u in d.users if u['status']=='Active'))
print(json.dumps(summary),flush=True)
if a.apply:
    operations=[dict(table=t,method='POST',body=rows) for t,rows in batch.items() if rows]
    if operations:
        revision=int(c.read_table('app_revision')[0]['revision'])
        c._request('POST','rpc/commit_app_mutation',body=dict(expected_revision=revision,operations=operations))
    summary['published']=run_live_job(c)
    ranks=Counter(r['target_user_id'] for r in c.read_table('recommendation_rankings'))
    assert all(ranks[u]>=5 for u in users)
    summary['verified_synthetic_min_matches']=min(ranks[u] for u in users)
    (ROOT/'audit/discovery-coverage').mkdir(parents=True,exist_ok=True)
    (ROOT/'audit/discovery-coverage/expansion.json').write_text(json.dumps(summary,indent=2))
    print(json.dumps(summary),flush=True)
