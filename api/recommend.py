"""Private Python runtime; both cron and the Node API use CRON_SECRET."""
import hmac
import json
import os
import sys
from http.server import BaseHTTPRequestHandler
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "raw-database"))
from engine.supabase import supabase_client
from engine.job import run_live_job


class handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode())

    def do_GET(self):
        self.do_POST()

    def do_POST(self):
        secret = os.environ.get("CRON_SECRET", "")
        if not secret or not hmac.compare_digest(self.headers.get("Authorization", ""), f"Bearer {secret}"):
            return self.reply(401, {"error": "Unauthorized"})
        client = supabase_client()
        try:
            self.reply(200, run_live_job(client))
        except Exception as error:
            print(f"Recommendation job failed: {type(error).__name__}", file=sys.stderr)
            self.reply(500, {"error": "Recommendation refresh failed."})
