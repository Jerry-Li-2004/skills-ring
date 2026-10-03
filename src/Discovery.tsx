import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ArrowRight, Bookmark, CalendarDays, Check, ChevronDown, Clock3, MapPin, RotateCcw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { type Leg, type Person, type State, imbalance, library, minutes, name, outstanding, people, reliability } from "./domain";
import "./discovery.css";

type Route = { key: string; legs: Leg[] };
type Preference = { passed: string[]; saved: string[]; seen: string[] };
const KEY = "skills-ring-discovery-v1";
const bios: Record<Person, string> = {
  alice: "I make coding approachable and fun. I love meeting new people and learning together.",
  bob: "A patient coach who enjoys learning creative skills from neighbors.",
  charlie: "I share active, hands-on lessons and learn best by trying things together.",
  david: "Curious about technology and happy to help people get moving.",
  maya: "I love teaching visual storytelling and helping others see the world differently.",
  james: "Music and technology make a great exchange for me.",
};
export function trackDiscoveryEvent(event: string, route: string, user: Person) {
  try {
    const current = JSON.parse(localStorage.getItem("skills-ring-discovery-events-v1") || "[]");
    current.push({ event, route, user, at: new Date().toISOString() });
    localStorage.setItem("skills-ring-discovery-events-v1", JSON.stringify(current.slice(-500)));
  } catch { /* Private browsing may disable storage. */ }
}
const track = trackDiscoveryEvent;
function routeKey(legs: Leg[]) { return legs.map((l) => l.id).join("|"); }
function nextSlotDistance(slot: string) {
  const now = new Date();
  const hour = slot.includes("Morning") ? 9 : slot.includes("Afternoon") ? 14 : 19;
  for (let offset = 0; offset < 8; offset++) {
    const candidate = new Date(now);
    candidate.setDate(now.getDate() + offset);
    candidate.setHours(hour, 0, 0, 0);
    const day = candidate.getDay();
    const matches = slot.startsWith("Weekday") ? day >= 1 && day <= 5 : slot.startsWith("Saturday") ? day === 6 : day === 0;
    if (matches && candidate > now) return candidate.getTime() - now.getTime();
  }
  return Number.MAX_SAFE_INTEGER;
}
function profileSkills(state: State, person: Person, kind: "offer" | "need") {
  return [...new Set(state.listings.filter((l) => l.user === person && l.kind === kind && l.status === "Active").map((l) => l.skill === "Other" ? l.otherSkill || "Other" : l.skill))].join(", ") || "None listed";
}
function Portrait({ person }: { person: Person }) {
  const hasOwnPortrait = person === "alice" || person === "maya";
  return <span className={`discover-portrait ${people[person].color}`} aria-hidden="true">
    {hasOwnPortrait ? <img src={`/images/people/${person}.png`} alt="" /> : <img className={`discover-portrait-grid ${person}`} src="/images/people/others-grid.png" alt="" />}
    <span className="discover-portrait-fallback">{people[person].initials}</span>
  </span>;
}
function ProfilePanel({ state, person, skill, self }: { state: State; person: Person; skill: string; self?: boolean }) {
  const evidence = reliability(state, person);
  const listing = state.listings.find((l) => l.user === person && l.kind === "offer" && l.skill === skill);
  return <section className={`discover-profile-panel ${self ? "is-self" : "is-member"}`} aria-label={self ? "Your profile" : `${people[person].name}'s profile`}>
    <div className="discover-portrait-wrap"><Portrait person={person} /><span className={`discover-portrait-status ${self ? "self" : "member"}`} aria-hidden="true">{self ? people[person].initials : <Check size={20} strokeWidth={2.5} />}</span></div>
    <h3>{people[person].name}</h3>
    <p className="discover-bio">{bios[person]}</p>
    <div className="discover-tags"><span>{listing?.category || skill}</span><span>{skill}</span></div>
    {!self && <div className="discover-trust"><ShieldCheck size={20} /><div><strong>{evidence.reviews ? `${evidence.onTime}% on time` : "New member"}</strong><small>{evidence.reviews ? `${evidence.reviews} reviews · ${evidence.sessions} sessions given` : `${evidence.sessions} sessions given · No reviews yet`}</small></div></div>}
  </section>;
}
export function Discovery({ state, user, matches, query, loading = false, initialReviewKey, onInitialReviewOpened, onPropose, onEditListings }: {
  state: State; user: Person; matches: Leg[][]; query: string;
  loading?: boolean;
  initialReviewKey?: string | null; onInitialReviewOpened?: () => void;
  onPropose: (legs: Leg[]) => boolean; onEditListings: () => void;
}) {
  const [preferences, setPreferences] = useState<Preference>(() => {
    try { return JSON.parse(localStorage.getItem(`${KEY}-${user}`) || "null") || { passed: [], saved: [], seen: [] }; }
    catch { return { passed: [], saved: [], seen: [] }; }
  });
  const [index, setIndex] = useState(0);
  const [lastPass, setLastPass] = useState<string | null>(null);
  const [savedView, setSavedView] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [review, setReview] = useState<Route | null>(null);
  const [staleReview, setStaleReview] = useState(false);
  const [filter, setFilter] = useState({ category: "", skill: "", mode: "", location: "", availability: "", duration: "", type: "", reliability: "" });
  const [sort, setSort] = useState("best");
  const [online, setOnline] = useState(() => navigator.onLine);
  const touch = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    try { localStorage.setItem(`${KEY}-${user}`, JSON.stringify(preferences)); } catch { /* Optional persistence. */ }
  }, [preferences, user]);
  useEffect(() => { const update = () => setOnline(navigator.onLine); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  useEffect(() => {
    try { setPreferences(JSON.parse(localStorage.getItem(`${KEY}-${user}`) || "null") || { passed: [], saved: [], seen: [] }); }
    catch { setPreferences({ passed: [], saved: [], seen: [] }); }
    setIndex(0);
  }, [user]);
  const routes = useMemo(() => {
    const unique = new Map<string, Leg[]>();
    matches.forEach((legs) => unique.set(routeKey(legs), legs));
    const rankByRoute = new Map(matches.map((legs, index) => [routeKey(legs), index]));
    return [...unique].map(([key, legs]) => ({ key, legs })).filter(({ key, legs }) => {
      const receive = legs.find((l) => l.receiver === user)!;
      const listing = state.listings.find((l) => l.id === receive.offer);
      const member = receive.provider;
      const proposed = state.exchanges.some((e) => !["withdrawn", "defaulted"].includes(e.status) && e.legs.every((l) => legs.some((routeLeg) => routeLeg.id === l.id)));
      return !proposed &&
        (!query || `${people[member].name} ${legs.map((l) => l.skill).join(" ")}`.toLowerCase().includes(query.toLowerCase())) &&
        (!filter.category || listing?.category === filter.category) &&
        (!filter.skill || legs.some((l) => l.skill.toLowerCase().includes(filter.skill.toLowerCase()))) &&
        (!filter.mode || legs.every((l) => l.mode === filter.mode)) &&
        (!filter.location || legs.some((l) => l.location.toLowerCase().includes(filter.location.toLowerCase()))) &&
        (!filter.availability || legs.some((l) => l.availability === filter.availability)) &&
        (!filter.duration || legs.some((l) => l.duration === Number(filter.duration))) &&
        (!filter.type || (filter.type === "direct" ? legs.length === 2 : legs.length > 2)) &&
        (!filter.reliability || reliability(state, member).reviews >= Number(filter.reliability));
    }).sort((a, b) => {
      if (sort === "best" && state.liveMatches) return (rankByRoute.get(a.key) ?? Infinity) - (rankByRoute.get(b.key) ?? Infinity);
      const score = (r: Route) => {
        if (sort === "soonest") return nextSlotDistance(r.legs.find((l) => l.receiver === user)!.availability);
        if (sort === "direct") return r.legs.length;
        if (sort === "commitment") { const give = r.legs.find((l) => l.provider === user)!; return outstanding(state, user).some((c) => c.skill === give.skill && c.beneficiary === give.receiver) ? -1 : r.legs.length; }
        if (sort === "newest") return -state.listings.findIndex((l) => l.id === r.legs.find((x) => x.receiver === user)!.offer);
        return r.legs.length * 10 + (imbalance(r.legs) ? 5 : 0) - reliability(state, r.legs.find((l) => l.receiver === user)!.provider).reviews;
      };
      return score(a) - score(b);
    });
  }, [matches, query, filter, sort, state, user]);
  useEffect(() => { if (!initialReviewKey) return; const route = routes.find((r) => r.key === initialReviewKey); if (route) { setReview(route); setStaleReview(false); track("review", route.key, user); } else setStaleReview(true); onInitialReviewOpened?.(); }, [initialReviewKey, routes, user]);
  const visible = routes.filter((r) => savedView ? preferences.saved.includes(r.key) : !preferences.passed.includes(r.key) && !preferences.saved.includes(r.key));
  const unavailableSaved = savedView ? preferences.saved.filter((key) => !matches.some((legs) => routeKey(legs) === key)) : [];
  const currentIndex = Math.min(index, Math.max(0, visible.length - 1));
  const current = visible[currentIndex];
  useEffect(() => { if (!loading && current && !preferences.seen.includes(current.key)) { track("impression", current.key, user); setPreferences((p) => ({ ...p, seen: [...p.seen, current.key] })); } }, [current?.key, loading, user]);
  function pass() {
    if (!current) return;
    setPreferences((p) => ({ ...p, passed: [...new Set([...p.passed, current.key])] }));
    setLastPass(current.key); setIndex(0); track("pass", current.key, user);
  }
  function save() {
    if (!current) return;
    setPreferences((p) => ({ ...p, saved: savedView ? p.saved.filter((key) => key !== current.key) : [...new Set([...p.saved, current.key])] }));
    setIndex(0); track(savedView ? "unsave" : "save", current.key, user);
  }
  function undo() {
    if (!lastPass) return;
    setPreferences((p) => ({ ...p, passed: p.passed.filter((key) => key !== lastPass) }));
    setLastPass(null); setIndex(0);
  }
  function openReview() { if (current) { track("profile_expansion", current.key, user); track("review", current.key, user); setReview(current); } }
  const activeFilterCount = Object.values(filter).filter(Boolean).length;
  return <section className="discover-flow" aria-label="Discover matches">
    {!online && <p className="discover-warning" role="status">You’re offline. These are locally saved demo matches; new activity will stay on this device.</p>}
    {staleReview && <p className="discover-warning discover-stale" role="alert">That match changed or is no longer available. Review the current matches below. <button className="text-link" onClick={() => setStaleReview(false)}>Dismiss</button></p>}
    <header className="discover-top">
      <div><span className="eyebrow">DISCOVER MATCHES</span><h1>A match you can understand</h1><p>Give a skill. Learn a skill. Confirm together.</p></div>
      <div className="discover-toolbar">
        <span className="discover-count" role="status" aria-live="polite">{current ? "Match " + (currentIndex + 1) + " of " + visible.length : visible.length + " matches"}</span>
        <div className="discover-navigation"><button className="button" aria-label="Previous match" disabled={currentIndex === 0 || !current} onClick={() => setIndex(currentIndex - 1)}><ArrowLeft size={19} /></button><button className="button" aria-label="Next match" disabled={currentIndex >= visible.length - 1 || !current} onClick={() => setIndex(currentIndex + 1)}><ArrowRight size={19} /></button></div>
        <button className="button discover-filter-toggle" aria-expanded={filtersOpen} aria-controls="discover-filters" onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18} /> Refine matches{activeFilterCount ? " (" + activeFilterCount + ")" : ""}<ChevronDown size={16} className={filtersOpen ? "is-open" : ""} /></button>
      </div>
    </header>
    <div className="discover-utility"><span className="discover-kind">{current ? current.legs.length === 2 ? "Direct exchange" : current.legs.length + "-person ring" : savedView ? "Saved matches" : "Match discovery"}</span><button className="text-link" onClick={() => { setSavedView(!savedView); setIndex(0); }}><Bookmark size={15} fill={savedView ? "currentColor" : "none"} /> {savedView ? "Explore matches" : "Saved matches (" + preferences.saved.length + ")"}</button>{lastPass && <button className="text-link" onClick={undo}><RotateCcw size={15} /> Undo last pass</button>}</div>
{filtersOpen && <div className="discover-filters" id="discover-filters" aria-label="Match filters">
      <label>Skill<input aria-label="Filter by skill" value={filter.skill} onChange={(e) => setFilter({ ...filter, skill: e.target.value })} placeholder="Any skill" /></label>
      <label>Category<select value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}><option value="">Any</option>{Object.keys(library).map((c) => <option key={c}>{c}</option>)}</select></label>
      <label>Mode<select value={filter.mode} onChange={(e) => setFilter({ ...filter, mode: e.target.value })}><option value="">Any</option><option>Online</option><option>Offline</option></select></label>
      <label>Approximate location<input value={filter.location} onChange={(e) => setFilter({ ...filter, location: e.target.value })} placeholder="Any" /></label>
      <label>Availability<select value={filter.availability} onChange={(e) => setFilter({ ...filter, availability: e.target.value })}><option value="">Any</option>{["Weekday Morning", "Weekday Afternoon", "Weekday Evening", "Saturday Morning", "Saturday Afternoon", "Saturday Evening", "Sunday Morning", "Sunday Afternoon", "Sunday Evening"].map((s) => <option key={s}>{s}</option>)}</select></label>
      <label>Session length<select value={filter.duration} onChange={(e) => setFilter({ ...filter, duration: e.target.value })}><option value="">Any</option>{[30,45,60,90,120].map((n) => <option value={n} key={n}>{minutes(n)}</option>)}</select></label>
      <label>Match type<select value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}><option value="">Any</option><option value="direct">Direct</option><option value="ring">Ring</option></select></label>
      <label>Reliability evidence<select value={filter.reliability} onChange={(e) => setFilter({ ...filter, reliability: e.target.value })}><option value="">Any</option><option value="1">At least 1 review</option><option value="3">At least 3 reviews</option></select></label>
      <label>Sort<select value={sort} onChange={(e) => setSort(e.target.value)}><option value="best">Best fit</option><option value="soonest">Soonest availability</option><option value="direct">Direct first</option><option value="commitment">Commitment priority</option><option value="newest">Newest</option></select></label>
    </div>}
    {unavailableSaved.length > 0 && <div className="saved-unavailable"><h3>Saved matches that changed</h3>{unavailableSaved.map((key) => { const exchange = state.exchanges.find((e) => e.legs.map((l) => l.id).join("|") === key); const status = exchange ? `Proposal ${exchange.status}` : "Listing or match no longer available"; return <div key={key}><span>{status}</span><button className="text-link" onClick={() => setPreferences((p) => ({ ...p, saved: p.saved.filter((item) => item !== key) }))}>Remove saved</button></div>; })}</div>}
    {loading ? <div className="card discover-end" role="status" aria-busy="true"><Clock3 size={27} /><h3>Finding compatible exchanges…</h3><p>Checking skills, availability, and session terms.</p></div> : current ? (() => { const legs = current.legs; const give = legs.find((l) => l.provider === user)!; const receive = legs.find((l) => l.receiver === user)!; const member = receive.provider; const sameSlot = give.availability === receive.availability; return <>
      <article className="discover-card" tabIndex={0} aria-label={"Match " + (currentIndex + 1) + " of " + visible.length + ". " + people[member].name} onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === "ArrowLeft") { e.preventDefault(); pass(); } if (e.key === "ArrowRight") { e.preventDefault(); save(); } if (e.key === "Enter") openReview(); }} onPointerDown={(e) => { if (!(e.target as HTMLElement).closest("button,input,select,label")) touch.current = { x: e.clientX, y: e.clientY }; }} onPointerUp={(e) => { if (!touch.current) return; const dx = e.clientX - touch.current.x; const dy = e.clientY - touch.current.y; if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) pass(); else save(); } touch.current = null; }} onPointerCancel={() => { touch.current = null; }}>
        <ProfilePanel state={state} person={user} skill={give.skill} self />
        <div className="discover-steps" aria-label="How this exchange works">
          <div className="discover-step"><span className="discover-step-number">1</span><div className="discover-step-content"><h2>What you teach</h2><p>{name(user)} teaches <strong>{give.skill}</strong> to {name(give.receiver)}</p><small>{give.sessions} {give.sessions === 1 ? "session" : "sessions"} · {give.duration} minutes each</small><div className="discover-direction right"><span /><ArrowRight size={23} /></div></div></div>
          <div className="discover-step"><span className="discover-step-number">2</span><div className="discover-step-content"><h2>What you learn</h2><p>{name(member)} teaches <strong>{receive.skill}</strong> to {name(user)}</p><small>{receive.sessions} {receive.sessions === 1 ? "session" : "sessions"} · {receive.duration} minutes each</small><div className="discover-direction left"><ArrowLeft size={23} /><span /></div></div></div>
          <div className="discover-step discover-step-when"><span className="discover-step-number">3</span><div className="discover-step-content"><h2>When it works</h2><p><CalendarDays size={18} /> {sameSlot ? receive.availability : "Coordinated schedules"} · {receive.mode}</p>{!sameSlot && <small>{name(user)}: {give.availability} · {name(member)}: {receive.availability}</small>}<small className="discover-location"><MapPin size={14} /> {receive.location}</small></div></div>
        </div>
        <ProfilePanel state={state} person={member} skill={receive.skill} />
      </article>
      {legs.length > 2 && <div className="discover-route-list"><strong>How the full {legs.length}-person ring works</strong>{legs.map((l) => <p key={l.id}>{people[l.provider].name} gives {l.sessions} × {minutes(l.duration)} of {l.skill} to {people[l.receiver].name}</p>)}</div>}
      {imbalance(legs) && <p className="discover-warning">Time or session quantities differ: {legs.map((l) => name(l.provider) + " gives " + minutes(l.sessions * l.duration)).join("; ")}. Everyone must accept this explicitly.</p>}
      {outstanding(state, member).length > 0 && <p className="discover-warning">{name(member)} has an unfinished commitment. Receive-first restrictions may affect when this exchange can begin.</p>}
      <div className="discover-actions"><button className="button primary" onClick={openReview}>Review match <ArrowRight size={18} /></button><button className="button" onClick={save}><Bookmark size={18} /> {savedView ? "Remove saved" : "Save"}</button><button className="button" onClick={pass}><X size={19} /> Pass</button></div>
      <p className="discover-hint">You’ll confirm the details together before anything is final.</p>
    </>; })() : <div className="card discover-end"><h3>{savedView ? "No saved matches here" : "You’re through this stack"}</h3><p>{routes.length ? "You can broaden the filters, revisit saved matches, or update what you offer and need." : "No feasible matches are available. Try a new offer or need, or broaden your preferences."}</p><div className="button-row"><button className="button" onClick={() => { setFilter({ category: "", skill: "", mode: "", location: "", availability: "", duration: "", type: "", reliability: "" }); setSavedView(false); }}>Broaden filters</button><button className="button" onClick={onEditListings}>Edit offers or needs</button><button className="button" onClick={() => setSavedView(true)}>Revisit saved matches</button></div></div>}
    {review && createPortal(<Review route={review} state={state} user={user} onClose={() => setReview(null)} onPropose={(legs) => { if (onPropose(legs)) { track("proposal", review.key, user); setReview(null); return true; } return false; }} />, document.body)}
  </section>;
}

function Review({ route, state, user, onClose, onPropose }: { route: Route; state: State; user: Person; onClose: () => void; onPropose: (legs: Leg[]) => boolean }) {
  const [legs, setLegs] = useState(route.legs.map((l) => ({ ...l })));
  const [step, setStep] = useState<"detail" | "confirm">("detail");
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => { const previous = document.activeElement as HTMLElement | null; dialog.current?.focus(); const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "Tab" && dialog.current) { const targets = [...dialog.current.querySelectorAll<HTMLElement>('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter((element) => !element.hasAttribute("disabled")); const first = targets[0], last = targets.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } } }; document.addEventListener("keydown", handler); return () => { document.removeEventListener("keydown", handler); previous?.focus(); }; }, [onClose]);
  function change(id: string, field: keyof Leg, value: string | number) { setLegs((all) => all.map((l) => l.id === id ? { ...l, [field]: value } : l)); }
  const give = legs.find((l) => l.provider === user)!; const receive = legs.find((l) => l.receiver === user)!;
  return <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className="modal wide" role="dialog" aria-modal="true" aria-label="Review match" tabIndex={-1} ref={dialog}><header className="modal-header"><h2>{step === "detail" ? "Review the match" : "Confirm proposal"}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button></header><div className="modal-body discover-review">
    <p>Each person must confirm the complete route. Your proposal expires after seven days if anyone has not agreed.</p>
    {step === "detail" && <div className="review-profiles">{[...new Set(legs.flatMap((l) => [l.provider, l.receiver]))].filter((p) => p !== user).map((p) => { const r = reliability(state, p); return <section key={p}><span className={`avatar ${people[p].color}`}>{people[p].initials}</span><div><h3>{people[p].name}</h3><p>{bios[p]}</p><p><strong>Offers:</strong> {profileSkills(state, p, "offer")} · <strong>Wants:</strong> {profileSkills(state, p, "need")}</p><p>{r.reviews ? `${r.onTime}% on time from ${r.reviews} reviews` : "No review evidence yet"} · {r.sessions} sessions given</p></div></section>; })}</div>}
    <p><strong>Why this works:</strong> The listed skills, minimum level, available capacity, conditions and an availability slot align. Session count, length, meeting mode and place can be suggested here; every person must agree to changed terms.</p>
    <div className="discover-terms"><div><small>YOU GIVE</small><strong>{give.skill}</strong><span>{give.sessions} × {minutes(give.duration)}</span></div><ArrowRight size={18} /><div><small>YOU RECEIVE</small><strong>{receive.skill}</strong><span>{receive.sessions} × {minutes(receive.duration)}</span></div></div>
    {legs.map((l) => <section className="review-leg" key={l.id}><h3>{people[l.provider].name} → {people[l.receiver].name}: {l.skill}</h3><p>{l.sessions} × {minutes(l.duration)} · {l.mode} · {l.location} · {l.availability}</p>{step === "detail" && <div className="review-fields"><label>Sessions<input type="number" min="1" max={state.listings.find((x) => x.id === l.need)?.sessions || l.sessions} value={l.sessions} onChange={(e) => change(l.id, "sessions", Number(e.target.value))} /></label><label>Minutes<input type="number" min="15" max="180" step="15" value={l.duration} onChange={(e) => change(l.id, "duration", Number(e.target.value))} /></label><label>Mode<select value={l.mode} onChange={(e) => change(l.id, "mode", e.target.value)}><option>Online</option><option>Offline</option></select></label><label>General location<input value={l.location} onChange={(e) => change(l.id, "location", e.target.value)} maxLength={100} /></label><label>Availability<input value={l.availability} onChange={(e) => change(l.id, "availability", e.target.value)} maxLength={100} /></label></div>}</section>)}
    {imbalance(legs) && <p className="discover-warning">Potential imbalance: {legs.map((l) => `${name(l.provider)} ${minutes(l.sessions * l.duration)}`).join(" · ")}. All participants must accept these amounts.</p>}
    <p className="muted">Changes to count, duration, mode, location or availability are suggestions. They take effect only when every participant confirms; an existing proposal cannot silently change.</p>
    {error && <p className="discover-warning" role="alert">{error}</p>}
    <div className="button-row">{step === "detail" ? <button className="button primary" onClick={() => setStep("confirm")}>Continue to confirmation</button> : <><button className="button" onClick={() => setStep("detail")}>Edit terms</button><button className="button primary" onClick={() => { if (!onPropose(legs)) setError("This match is no longer available or the suggested terms are invalid. Review the latest listings and try again."); }}>Send proposal to everyone</button></>}</div>
  </div></div></div>;
}
