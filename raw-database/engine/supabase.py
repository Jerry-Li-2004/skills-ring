"""Small Supabase PostgREST client used by the live recommender.

The recommender runs as a trusted job. Its key must be supplied through
``SUPABASE_SERVICE_ROLE_KEY`` (or ``SUPABASE_SECRET_KEY``) and must never be
bundled into the browser application.
"""

from __future__ import annotations

import json
import os
import ssl
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen

try:
    import certifi
except ImportError:  # pragma: no cover - deployment requirements include certifi
    certifi = None

from .data import DataSet, OPTIONAL_FILES, REQUIRED_FILES
from .matching import Match


DEFAULT_SUPABASE_URL = "https://mwyictnozocjicjeacqk.supabase.co"
PAGE_SIZE = 1000


def _ssl_context() -> ssl.SSLContext | None:
    """Use certifi's CA bundle when the host Python lacks a usable trust store."""
    return ssl.create_default_context(cafile=certifi.where()) if certifi else None


def _stringify_row(row: dict[str, Any]) -> dict[str, str]:
    """Convert PostgREST JSON values to the CSV-shaped strings the engine uses."""
    result: dict[str, str] = {}
    for key, value in row.items():
        if value is None:
            result[key] = ""
        elif isinstance(value, bool):
            result[key] = "1" if value else "0"
        else:
            result[key] = str(value)
    return result


class SupabaseRestClient:
    """Minimal dependency-free client for the Supabase Data API."""

    def __init__(self, url: str, key: str, timeout: float = 30.0):
        self.url = url.rstrip("/")
        self.key = key
        self.timeout = timeout

    def _request(
        self,
        method: str,
        table: str,
        *,
        query: dict[str, str] | None = None,
        body: Any = None,
        prefer: str | None = None,
    ) -> Any:
        target = f"{self.url}/rest/v1/{table}"
        if query:
            target = f"{target}?{urlencode(query, safe='(),.*') }"
        headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
            "Accept": "application/json",
        }
        if body is not None:
            headers["Content-Type"] = "application/json"
        if prefer:
            headers["Prefer"] = prefer
        request = Request(
            target,
            data=None if body is None else json.dumps(body).encode("utf-8"),
            headers=headers,
            method=method,
        )
        try:
            with urlopen(request, timeout=self.timeout, context=_ssl_context()) as response:
                payload = response.read()
        except HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Supabase {method} {table} failed ({error.code}): {detail[:500]}"
            ) from error
        except URLError as error:
            raise RuntimeError(f"Supabase is unreachable: {error.reason}") from error
        if not payload:
            return None
        return json.loads(payload.decode("utf-8"))

    def read_table(self, table: str) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        offset = 0
        while True:
            page = self._request(
                "GET",
                table,
                query={
                    "select": "*",
                    "limit": str(PAGE_SIZE),
                    "offset": str(offset),
                },
            )
            if not isinstance(page, list):
                raise RuntimeError(f"Supabase returned an invalid response for {table}.")
            rows.extend(_stringify_row(row) for row in page)
            if len(page) < PAGE_SIZE:
                return rows
            offset += PAGE_SIZE

    def upsert(self, table: str, rows: list[dict[str, Any]]) -> None:
        for start in range(0, len(rows), PAGE_SIZE):
            self._request(
                "POST",
                table,
                body=rows[start : start + PAGE_SIZE],
                prefer="resolution=merge-duplicates,return=minimal",
            )

    def delete_ids(self, table: str, column: str, ids: Iterable[str]) -> None:
        values = [value for value in ids if value]
        for start in range(0, len(values), 100):
            chunk = values[start : start + 100]
            # PostgREST's in.(...) filter is safe here because IDs are generated
            # by the engine and are restricted to identifier characters.
            encoded = ",".join(quote(value, safe="-:_") for value in chunk)
            self._request(
                "DELETE",
                table,
                query={column: f"in.({encoded})"},
                prefer="return=minimal",
            )


def supabase_client(
    url: str | None = None,
    key: str | None = None,
) -> SupabaseRestClient:
    resolved_url = (url or os.getenv("SUPABASE_URL") or DEFAULT_SUPABASE_URL).strip()
    resolved_key = (
        key
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_SECRET_KEY")
        or ""
    ).strip()
    if not resolved_url:
        raise ValueError("Set SUPABASE_URL or pass --supabase-url.")
    if not resolved_key:
        raise ValueError(
            "Set SUPABASE_SERVICE_ROLE_KEY (server-side only) or pass --supabase-key."
        )
    return SupabaseRestClient(resolved_url, resolved_key)


def load_live_dataset(client: SupabaseRestClient) -> DataSet:
    rows: dict[str, list[dict[str, str]]] = {}
    for filename in (*REQUIRED_FILES, *OPTIONAL_FILES):
        table = Path(filename).stem
        rows[table] = client.read_table(table)
    data = DataSet(root=Path("<supabase>"), **rows)
    # Resolve locked exchange resources before generating new recommendations.
    _ = data.locked_resources
    return data


MATCH_FIELDS = (
    "match_id", "match_type", "user_a", "user_b", "user_c",
    "offer_id_a", "need_id_a", "offer_id_b", "need_id_b", "offer_id_c", "need_id_c",
    "compatibility_score", "level_score", "availability_score", "convenience_score",
    "reciprocity_score", "contribution_score", "reliability_score", "risk_score",
    "level_value_score", "value_balance_score", "final_score",
)


def _number(value: float) -> float:
    return round(float(value), 6)


def match_row(match: Match) -> dict[str, Any]:
    row: dict[str, Any] = {field: None for field in MATCH_FIELDS}
    row.update({
        "match_id": match.match_id,
        "match_type": match.match_type,
        "user_a": match.edges[0].offer["user_id"],
        "user_b": match.edges[0].need["user_id"],
    })
    if match.match_type == "Cycle":
        row["user_c"] = match.edges[1].need["user_id"]
    for index, edge in enumerate(match.edges):
        suffix = chr(ord("a") + index)
        row[f"offer_id_{suffix}"] = edge.offer["offer_id"]
        row[f"need_id_{suffix}"] = edge.need["need_id"]
    row.update({field: _number(value) for field, value in match.scores.items()})
    return row


def ranking_rows(matches: list[Match]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for user_id in sorted({participant for match in matches for participant in match.participants}):
        user_matches = [match for match in matches if user_id in match.participants]
        user_matches.sort(
            key=lambda match: (
                -match.scores["final_score"],
                0 if match.match_type == "Direct" else 1,
                match.match_id,
            )
        )
        rows.extend(
            {
                "match_id": match.match_id,
                "target_user_id": user_id,
                "rank_position": rank,
            }
            for rank, match in enumerate(user_matches, start=1)
        )
    return rows


def publish_recommendations(
    client: SupabaseRestClient,
    matches: list[Match],
) -> tuple[int, int]:
    """Upsert the fresh result and remove stale rows not used by an exchange."""
    fresh_match_rows = [match_row(match) for match in matches]
    fresh_rank_rows = ranking_rows(matches)
    fresh_ids = {row["match_id"] for row in fresh_match_rows}

    existing_matches = client.read_table("matches")
    exchange_links = client.read_table("exchange_matches")
    protected = {row["match_id"] for row in exchange_links}
    stale = {
        row["match_id"]
        for row in existing_matches
        if row.get("match_id") not in fresh_ids and row.get("match_id") not in protected
    }
    if stale:
        client.delete_ids("recommendation_rankings", "match_id", stale)
        client.delete_ids("matches", "match_id", stale)

    client.upsert("matches", fresh_match_rows)
    client.upsert("recommendation_rankings", fresh_rank_rows)
    return len(fresh_match_rows), len(fresh_rank_rows)
