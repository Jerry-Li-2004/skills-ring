"""Verify every active account against the live discovery RPC."""
import sys,json
from pathlib import Path
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'raw-database'))
from engine.supabase import supabase_client
c=supabase_client()
users=c.read_table('users')
active={u['user_id'] for u in users if u['status']=='Active'}
def verify(uid):
    suggestions=c._request('POST','rpc/discovery_suggestions',body={'requested_user':uid})
    ids={s['candidate_user_id'] for s in suggestions}
    assert len(ids)==5 and uid not in ids and ids<=active, uid
    assert all(s['target_user_id']==uid and s['reason'] for s in suggestions)
    return len(ids)
with ThreadPoolExecutor(max_workers=6) as pool:
    counts=list(pool.map(verify,sorted(active)))
for uid in {u['user_id'] for u in users}-active:
    assert c._request('POST','rpc/discovery_suggestions',body={'requested_user':uid})==[]
ranks=Counter(r['target_user_id'] for r in c.read_table('recommendation_rankings'))
summary=dict(total_users=len(users),active_users=len(active),verified_users=len(counts),suggestions_per_user=min(counts),total_suggestions=sum(counts),inactive_users_excluded=len(users)-len(active),users_without_valid_exchange=sum(ranks[u]==0 for u in active))
(ROOT/'audit/discovery-coverage/verification.json').write_text(json.dumps(summary,indent=2))
print(json.dumps(summary))
