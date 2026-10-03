import { useState } from "react";
import { demoPeople, people, reliability, findMatches, type State, type Leg } from "./domain";
import { communityMembers } from "./community-model";

export function Community({ state, demo, user, onReview, onAdd }: { state: State; demo: boolean; user: string; onReview: (legs: Leg[]) => void; onAdd: () => void }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const directory = demo ? demoPeople : people;
  const ids = communityMembers(state, demo, query);
  const pageCount = Math.max(1, Math.ceil(ids.length / 12));
  const current = Math.min(page, pageCount - 1);
  const member = selected && directory[selected] ? selected : null;
  if (member) {
    const listings = state.listings.filter(l => l.user === member && l.status === "Active");
    const routes = findMatches(state, user).filter(route => route.some(l => l.provider === member || l.receiver === member));
    const stats = reliability(state, member);
    return <section className="card"><button className="button" onClick={() => setSelected(null)}>Back to community</button>
      <h1>{directory[member].name}</h1><p>{demo ? "Fictional demo member" : "Community member"} · {stats.sessions} services given · {stats.reviews} evaluations</p>
      <h2>Offers and needs</h2>{listings.length ? listings.map(l => <article className="booking-card" key={l.id}><h3>{l.kind === "offer" ? "Offers" : "Wants to learn"}: {l.skill}</h3><p>{l.duration} minutes · {l.sessions} sessions · {l.mode} · {l.location}</p><p>{l.availability.join(" · ")}</p><p>{l.conditions}</p></article>) : <p>No active public listings yet.</p>}
      {member !== user && <><h2>Exchange together</h2>{routes.length ? routes.map((route, index) => <button className="button" key={route.map(l => l.id).join("|")} onClick={() => onReview(route)}>Review match {index + 1}: {route.map(l => l.skill).join(" → ")}</button>) : <><p>No compatible route is available yet. Add an offer or need to find a match. Messaging opens after a proposal.</p><button className="button primary" onClick={onAdd}>Add an offer or need</button></>}</>}
    </section>;
  }
  return <><div className="notice"><p>{demo ? "Explore fictional members. Demo activity stays in your example workspace." : "Find community members and explore their active skills. Contact details are kept private."}</p></div>
    <label className="community-search">Search community<input type="search" value={query} placeholder="Name, skill, category, or location" onChange={e => { setQuery(e.target.value); setPage(0); }} /></label>
    <p role="status">{ids.length} members found</p><div className="community-grid">{ids.slice(current * 12, (current + 1) * 12).map(id => {
      const person = directory[id], stats = reliability(state, id);
      return <section className="card member-card" key={id}><span className={`avatar ${person.color} large`}>{person.initials}</span><h2>{person.name}</h2><p>{state.listings.filter(l => l.user === id && l.kind === "offer" && l.status === "Active").map(l => l.skill).join(" · ") || "No active offers"}</p><p>{stats.sessions} services given · {stats.reviews} evaluations</p><button className="button" onClick={() => setSelected(id)}>View profile</button></section>;
    })}</div>{!ids.length && <p>Try a different name or skill.</p>}
    <nav className="button-row" aria-label="Community pages"><button className="button" disabled={current === 0} onClick={() => setPage(current - 1)}>Previous page</button><span>Page {current + 1} of {pageCount}</span><button className="button" disabled={current + 1 >= pageCount} onClick={() => setPage(current + 1)}>Next page</button></nav></>;
}
