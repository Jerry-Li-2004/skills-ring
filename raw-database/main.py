from __future__ import annotations

import argparse
from pathlib import Path

from engine.job import run_live_job
from engine.data import load_dataset
from engine.matching import generate_matches
from engine.output import write_outputs
from engine.supabase import load_live_dataset, publish_recommendations, supabase_client


DEFAULT_DATA_DIR = (
    Path(__file__).resolve().parent
    / "HacKU"
    / "database_demo2_csv"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run the Skills-Ring recommender against live Supabase data"
    )
    parser.add_argument(
        "--mode",
        choices=("supabase", "csv"),
        default="supabase",
        help="Use the deployed Supabase dataset by default; csv is a local regression fallback",
    )
    parser.add_argument(
        "--data-dir",
        type=Path,
        default=DEFAULT_DATA_DIR,
        help="Directory containing the input CSV files",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parent / "result_outputs",
        help="Directory for generated CSV files",
    )
    parser.add_argument(
        "--supabase-url",
        default=None,
        help="Supabase project URL (defaults to SUPABASE_URL or the deployed project)",
    )
    parser.add_argument(
        "--supabase-key",
        default=None,
        help="Server-side service-role/secret key; prefer SUPABASE_SERVICE_ROLE_KEY",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read and score live data without writing matches or rankings",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    client = None
    if args.mode == "supabase":
        client = supabase_client(args.supabase_url, args.supabase_key)
        if not args.dry_run:
            result = run_live_job(client)
            print(f"Live Supabase recommendation run completed: {result}")
            return
        data = load_live_dataset(client)
    else:
        data = load_dataset(args.data_dir)
    matches, edges = generate_matches(data)
    if args.mode == "supabase":
        assert client is not None
        if args.dry_run:
            written_matches = written_rankings = 0
        else:
            written_matches, written_rankings = publish_recommendations(client, matches)
        print("Live Supabase recommendation run completed")
        print(f"Supabase URL: {client.url}")
        print(f"Recommendations ready: {len(matches)} matches / {len(edges)} candidate edges")
        print(f"Rows written: {written_matches} matches / {written_rankings} rankings")
        if args.dry_run:
            print("Dry run: no Supabase rows changed")
        return

    output_dir = args.output_dir.resolve()
    if output_dir == data.root or data.root in output_dir.parents:
        raise ValueError("Output directory must be outside the input CSV directory")
    matches_path, rankings_path = write_outputs(matches, output_dir)

    print("CSV recommendation regression run completed")
    print(f"Data directory: {data.root}")
    print(f"Candidate edges after hard filters: {len(edges)}")
    print(f"Direct and cycle matches: {len(matches)}")
    print(f"Direct: {sum(match.match_type == 'Direct' for match in matches)}")
    print(f"Cycle: {sum(match.match_type == 'Cycle' for match in matches)}")
    print(f"Locked offers / needs: {len(data.locked_offer_ids)} / {len(data.locked_need_ids)}")
    print("CSV mode: all recommendations; risk denominator: 3")
    print(f"matches.csv: {matches_path}")
    print(f"recommendation_rankings.csv: {rankings_path}")


if __name__ == "__main__":
    main()
