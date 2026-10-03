"""Serialize local and hosted writes to the shared recommendation tables."""
import time
import uuid
from .supabase import load_live_dataset, publish_recommendations
from .matching import generate_matches


def run_live_job(client):
    owner = str(uuid.uuid4())
    acquired = False
    try:
        for _ in range(45):
            acquired = client._request("POST", "rpc/acquire_recommendation_lease", body={"owner": owner})
            if acquired:
                break
            time.sleep(2)
        if not acquired:
            raise RuntimeError("Recommendation worker is busy. Retry shortly.")
        matches, edges = generate_matches(load_live_dataset(client))
        counts = publish_recommendations(client, matches)
        return {"ok": True, "matches": counts[0], "rankings": counts[1], "edges": len(edges)}
    finally:
        if acquired:
            client._request("POST", "rpc/release_recommendation_lease", body={"owner": owner})
