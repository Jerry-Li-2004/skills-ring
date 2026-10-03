import { useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import "./community.css";
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
    const person = directory[member];
    return <section className="community-profile" aria-label={`${person.name}'s profile`}>
      <button className="button profile-back" onClick={() => setSelected(null)}><ArrowLeft size={16} /> Back to community</button>
      <header className="card profile-header">
        <div className="profile-identity"><span className={`avatar ${person.color} profile-avatar`} aria-hidden="true">{person.initials}</span><div><span className="profile-eyebrow">{demo ? "Fictional demo member" : "Community member"}</span><h1>{person.name}</h1><p>Share a skill. Learn something new, together.</p></div></div>
        <dl className="profile-stats"><div><dt>Services given</dt><dd>{stats.sessions}</dd></div><div><dt>Evaluations</dt><dd>{stats.reviews}</dd></div></dl>
      </header>
      <section className="profile-listings" aria-labelledby="profile-listings-title">
        <header className="profile-section-heading"><h2 id="profile-listings-title">Offers and needs</h2><span>{listings.length} active {listings.length === 1 ? "listing" : "listings"}</span></header>
        {listings.length ? <div className="profile-skills-grid">{listings.map(l => <article className="card profile-skill" key={l.id}>
          <span className={`profile-kind ${l.kind}`}>{l.kind === "offer" ? "Offers" : "Wants to learn"}</span><h3>{l.skill === "Other" ? l.otherSkill || l.skill : l.skill}</h3>
          <ul className="profile-skill-details"><li><Clock3 size={16} /><span>{l.duration} minutes · {l.sessions} {l.sessions === 1 ? "session" : "sessions"}</span></li><li><MapPin size={16} /><span>{l.mode} · {l.location}</span></li><li><CalendarDays size={16} /><span>{l.availability.join(" · ") || "Availability to be agreed"}</span></li></ul>
          {l.conditions && <p className="profile-skill-conditions">{l.conditions}</p>}
        </article>)}</div> : <p className="card profile-empty">No active public listings yet.</p>}
      </section>
      {member !== user && <section className="card profile-exchange" aria-labelledby="profile-exchange-title"><div><span className="profile-eyebrow">LEARN TOGETHER</span><h2 id="profile-exchange-title">Exchange together</h2><p>{routes.length ? "Explore a compatible exchange and confirm the details together." : "No compatible route is available yet. Add an offer or need to find a match. Messaging opens after a proposal."}</p></div><div className="profile-exchange-actions">{routes.length ? routes.map((route, index) => <button className="button" key={route.map(l => l.id).join("|")} onClick={() => onReview(route)}>Review match {index + 1}: {route.map(l => l.skill).join(" → ")} <ArrowRight size={16} /></button>) : <button className="button primary" onClick={onAdd}>Add an offer or need <ArrowRight size={16} /></button>}</div></section>}
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
