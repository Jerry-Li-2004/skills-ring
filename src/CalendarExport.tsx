import { useState } from "react";
import { authenticatedFetch } from "./supabase";

export function CalendarExport({ id, start, minutes, title, place }: { id: string; start: string; minutes: number; title: string; place: string }) {
  const [download, setDownload] = useState<string | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  return <><button className="button" disabled={busy} onClick={async () => {
    setBusy(true); setError(""); setDownload(null);
    try {
      const response = await authenticatedFetch("/api/calendar/exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, start, minutes, title, place }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not prepare calendar.");
      setDownload(result.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not prepare calendar."); } finally { setBusy(false); }
  }}>{busy ? "Preparing calendar…" : "Export calendar"}</button>
    {download && <><a className="button primary" download="skills-ring-session.ics" href={download}>Download calendar file</a><small role="status">Ready to download. Link expires in 5 minutes; export again to renew it.</small></>}
    {error && <span role="alert">{error}</span>}</>;
}
