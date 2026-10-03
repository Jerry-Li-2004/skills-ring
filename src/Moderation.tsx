import { useEffect, useState } from "react";
import { authenticatedFetch } from "./supabase";
import { name, participants, type State, type Dispute } from "./domain";

type Queue = Pick<State, "disputes" | "exchanges" | "sessions" | "messages">;
export function Moderation({ user }: { user: string }) {
  const [queue, setQueue] = useState<Queue | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState("Open");
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [resolution, setResolution] = useState<NonNullable<Dispute["resolution"]>>("Full release");
  async function load() {
    const response = await authenticatedFetch("/api/moderation");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load cases.");
    setQueue(data);
  }
  useEffect(() => { void load().catch(e => setError(e.message)); }, []);
  const dispute = queue?.disputes.find(d => d.id === selected);
  const exchange = queue?.exchanges.find(e => e.id === dispute?.exchange);
  const session = queue?.sessions.find(s => s.id === dispute?.session);
  const conflict = exchange && [...participants(exchange), exchange.recovery?.replacement].includes(user);
  return <section className="card moderation-workspace"><h1>Moderation</h1><p>Review session evidence and record a reasoned decision. Participants receive the outcome. Original contributions remain in history.</p>
    {error && <p role="alert">{error}</p>}
    <button className="button" disabled={busy} onClick={() => { setError(""); void load().catch(e => setError(e.message)); }}>Refresh cases</button>
    {!queue && !error && <p role="status">Loading cases…</p>}
    {queue && <><label>Case status<select value={filter} onChange={e => { setFilter(e.target.value); setSelected(null); }}><option>Open</option><option>Resolved</option></select></label>
      <p role="status">{queue.disputes.filter(d => d.status === filter).length} {filter.toLowerCase()} cases</p>
      {queue.disputes.filter(d => d.status === filter).map(d => <button className="button" key={d.id} onClick={() => { setSelected(d.id); setReason(""); setResolution("Full release"); setError(""); }}>Review case {d.id} · {name(d.raised_by)}</button>)}
      {dispute && exchange && session && <article className="recovery-section"><h2>{exchange.title}</h2><h3>Claim</h3><p>{name(dispute.raised_by)}: {dispute.reason}</p><h3>Recorded service</h3><p>{name(session.provider)} → {name(session.receiver)} · {session.skill} · {session.actual_duration} minutes · {session.scheduled_time}</p><p>{session.notes}</p>
        <details><summary>Agreed terms and activity</summary>{exchange.legs.map(l => <p key={l.id}>{name(l.provider)} → {name(l.receiver)}: {l.sessions} × {l.duration} min {l.skill}, {l.mode}, {l.location}, {l.availability}</p>)}<ol>{exchange.audit.map((entry, i) => <li key={i}>{entry}</li>)}</ol></details>
        <details><summary>Exchange conversation</summary>{(queue.messages || []).filter(m => m.exchange === exchange.id).map(m => <p key={m.id}>{name(m.author)} ({new Date(m.createdAt).toLocaleString()}): {m.text}</p>)}</details>
        {dispute.status === "Resolved" ? <p>{dispute.resolution} · {dispute.released_minutes} minutes released · {dispute.resolution_reason} · Moderator {dispute.resolved_by} · {dispute.resolved_at}</p> : conflict ? <p>A different moderator must review your own exchange.</p> : <form onSubmit={async e => {
          e.preventDefault(); setBusy(true); setError("");
          try {
            const response = await authenticatedFetch("/api/moderation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dispute: dispute.id, resolution, reason }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Decision could not be saved.");
            await load(); setFilter("Resolved");
          } catch (cause) { setError(cause instanceof Error ? cause.message : "Decision could not be saved."); } finally { setBusy(false); }
        }}><label>Decision<select value={resolution} onChange={e => setResolution(e.target.value as NonNullable<Dispute["resolution"]>)}><option>Full release</option><option>Partial release</option><option>Default</option></select></label><p>{resolution === "Full release" ? "Accept all recorded minutes." : resolution === "Partial release" ? "Accept half of the recorded minutes; the remaining service stays owed." : "Release no disputed minutes and mark the exchange defaulted."}</p><label>Decision reason<textarea minLength={10} maxLength={2000} required value={reason} onChange={e => setReason(e.target.value)} /></label><button className="button primary" disabled={busy || reason.trim().length < 10}>{busy ? "Saving decision…" : "Confirm and notify participants"}</button></form>}
      </article>}</>}
  </section>;
}
