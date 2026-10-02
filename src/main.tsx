import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowUpRight,
  ArrowLeftRight,
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clock3,
  Code2,
  Compass,
  Gift,
  Globe2,
  Handshake,
  Home,
  Layers3,
  Menu,
  Network,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
  AlertTriangle,
  Camera,
  Music2,
  MapPin,
  CheckCircle2,
  History,
  Leaf,
  RotateCcw,
  Users,
  PanelLeftClose,
} from "lucide-react";
import {
  type State,
  type Action,
  type Person,
  type Listing,
  type Exchange,
  type Leg,
  seed,
  transition,
  people,
  name,
  minutes,
  library,
  slots,
  findMatches,
  participants,
  imbalance,
  remaining,
  done,
  commitments,
  outstanding,
  reliability,
  contributionSettled,
  recommendations,
  id,
} from "./domain";
import "./styles.css";
const STORAGE = "skills-ring-demo-v1";
const nav = [
  { label: "Home", icon: Home },
  { label: "Discover matches", icon: Compass },
  { label: "My exchanges", icon: ArrowLeftRight },
  { label: "My offers & needs", icon: Layers3 },
  { label: "My contributions", icon: Gift },
  { label: "My commitments", icon: Handshake },
  { label: "Community", icon: Users },
];
function Avatar({ user, size = "" }: { user: Person; size?: string }) {
  return (
    <span className={`avatar ${people[user].color} ${size}`}>
      {people[user].initials}
    </span>
  );
}
function Badge({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
function SkillIcon({ skill }: { skill: string }) {
  return (
    <span
      className={`skill-icon ${skill === "Tennis" ? "lime" : skill === "Photography" ? "peach" : skill === "Guitar" ? "lavender" : ""}`}
    >
      {skill === "Photography" ? (
        <Camera size={21} />
      ) : skill === "Guitar" ? (
        <Music2 size={21} />
      ) : skill === "Tennis" ? (
        <span className="tennis">◉</span>
      ) : (
        <Code2 size={21} />
      )}
    </span>
  );
}
function App() {
  const [state, setState] = useState<State>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (s?.version !== 1 || !Array.isArray(s.exchanges)) return seed();
      // Migrate the fictional demo venue label while preserving existing work.
      const saved = s as State;
      for (const listing of saved.listings) {
        if (listing.location === "HKU") listing.location = "Local meeting point";
      }
      for (const exchange of saved.exchanges) {
        const legs = [...exchange.legs];
        if (exchange.recovery?.leg) legs.push(exchange.recovery.leg);
        let renamed = false;
        for (const leg of legs) {
          if (leg.location === "HKU") {
            leg.location = "Local meeting point";
            renamed = true;
          }
        }
        if (renamed) {
          exchange.audit.push(
            "Fictional demo venue relabelled as Local meeting point. Service terms and completed work preserved.",
          );
        }
      }
      return saved;
    } catch {
      return seed();
    }
  });
  const [page, setPage] = useState("Home"),
    [user, setUser] = useState<Person>("alice"),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [toast, setToast] = useState(""),
    [storageError, setStorageError] = useState(false);
  const [modal, setModal] = useState<
      "listing" | "help" | "demo" | "notifications" | null
    >(null),
    [selected, setSelected] = useState<string | null>(null),
    [listingKind, setListingKind] = useState<"offer" | "need">("offer");
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function act(action: Action) {
    try {
      setState(transition(state, action));
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  function go(next: string) {
    setPage(next);
    setMenu(false);
    setQuery("");
  }
  const myExchanges = state.exchanges.filter(
    (e) => participants(e).includes(user) || e.recovery?.replacement === user,
  );
  const active = myExchanges.filter(
    (e) => !["settled", "defaulted", "proposed"].includes(e.status),
  );
  const myContributions = state.contributions.filter(
      (c) => c.provider === user,
    ),
    owed = outstanding(state, user),
    myListings = state.listings.filter((l) => l.user === user);
  const matches = findMatches(state, user),
    filteredMatches = matches.filter((legs) =>
      legs.some((l) =>
        `${l.skill} ${people[l.provider].name}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    );
  const selectedExchange = state.exchanges.find((e) => e.id === selected);
  const add = (kind: "offer" | "need") => {
    setListingKind(kind);
    setModal("listing");
  };
  function propose(legs: Leg[]) {
    try {
      const next = transition(state, { type: "propose", legs });
      setState(next);
      setSelected(next.exchanges.at(-1)!.id);
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  const openMatches = () => go("Discover matches");
  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="mobile-toggle icon-button"
          aria-label="Toggle navigation"
          onClick={() => setMenu(!menu)}
        >
          <Menu size={21} />
        </button>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("Home");
          }}
        >
          <span className="brand-mark">
            <span />
            <span />
          </span>
          skills<span className="brand-light">ring</span>
          <span className="brand-dot">®</span>
        </a>
        <div className="global-search">
          <Search size={17} />
          <input
            aria-label="Search skills and people"
            placeholder="Search skills, people, and exchanges"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage("Discover matches");
            }}
          />
          <kbd>⌕</kbd>
        </div>
        <div className="top-actions">
          <span className="demo-pill">Demo workspace</span>
          <button
            className="icon-button notification"
            aria-label="Notifications"
            onClick={() => setModal("notifications")}
          >
            <Bell size={19} />
            {active.length > 0 && <i />}
          </button>
          <span className="top-divider" />
          <label className="user-switch">
            <Avatar user={user} size="small" />
            <select
              aria-label="Demo participant"
              value={user}
              onChange={(e) => setUser(e.target.value as Person)}
            >
              {Object.keys(people).map((p) => (
                <option key={p} value={p}>
                  {people[p as Person].name}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
        </div>
      </header>
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <button className="community-switch" onClick={() => go("Community")}>
          <span className="community-icon">
            <Globe2 size={22} />
          </span>
          <span>
            <strong>Skills-Ring community</strong>
            <small>Open to everyone</small>
          </span>
          <ChevronDown size={15} />
        </button>
        <nav>
          {nav.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={page === label ? "selected" : ""}
              onClick={() => go(label)}
            >
              <Icon size={18} />
              <span>{label}</span>
              {label === "Discover matches" && (
                <span className="nav-count">{matches.length}</span>
              )}
              {label === "My exchanges" && active.length > 0 && (
                <span className="nav-count subtle">{active.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <div className="tiny-ring">
              <Network size={23} />
            </div>
            <strong>Better, together.</strong>
            <p>Your next possibility might be someone else’s skill.</p>
            <button onClick={openMatches}>
              Explore your community <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="side-utility" onClick={() => setModal("help")}>
            <CircleHelp size={18} /> How Skills-Ring works
          </button>
          <button className="side-utility" onClick={() => setModal("demo")}>
            <Settings size={18} /> Workspace settings
          </button>
          <div className="sidebar-footer">
            <span className="live-dot" />
            Local demo · Saved on this device
          </div>
        </div>
      </aside>
      <main>
        <div className="workspace-width">
          {storageError && (
            <div className="warning">
              <AlertTriangle size={18} />
              Browser storage is unavailable. Changes will last only until this
              page closes.
            </div>
          )}
          <div className="breadcrumbs">
            Workspace <ChevronRight size={13} />
            <span>{page}</span>
          </div>
          {page === "Home" ? (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">A LITTLE GIVE. A LITTLE GROW.</div>
                  <h1>
                    Good to see you, {name(user)}{" "}
                    <span className="wave">✳</span>
                  </h1>
                  <p>
                    Here’s what’s happening in your corner of the community.
                  </p>
                </div>
                <button className="button primary" onClick={() => add("offer")}>
                  <Plus size={17} /> Add an offer or need
                </button>
              </div>
              <section className="welcome-banner">
                <div className="banner-copy">
                  <span className="banner-label">
                    <span /> YOUR SKILLS HAVE SOMEWHERE TO GO
                  </span>
                  <h2>
                    What you know.
                    <br />
                    What you need.
                    <br />
                    <em>A world of possibility between.</em>
                  </h2>
                  <p>
                    Share a skill, learn something new, and make
                    <br className="desktop-br" /> good things happen for each
                    other.
                  </p>
                  <button className="button light" onClick={openMatches}>
                    Find your next exchange <ArrowUpRight size={16} />
                  </button>
                </div>
                <div
                  className="banner-network"
                  aria-label="A skill exchange connects giving, learning and growing"
                >
                  <svg viewBox="0 0 380 260" aria-hidden="true">
                    <path d="M105 68 C210 -5 342 63 278 173 C237 265 78 238 78 129" />
                    <path
                      className="inner-orbit"
                      d="M105 68 Q180 161 278 173 Q193 135 78 129"
                    />
                  </svg>
                  <div className="network-center">
                    <span className="brand-mark">
                      <span />
                      <span />
                    </span>
                  </div>
                  <div className="floating-skill code">
                    <Code2 size={23} />
                    <span>Give a little</span>
                    <strong>Python tutoring</strong>
                  </div>
                  <div className="floating-skill camera">
                    <Camera size={23} />
                    <span>Learn a little</span>
                    <strong>Photography</strong>
                  </div>
                  <div className="floating-skill tennis-card">
                    <Leaf size={23} />
                    <span>Grow together</span>
                    <strong>Tennis coaching</strong>
                  </div>
                  <span className="sparkle s1">✳</span>
                  <span className="sparkle s2">✧</span>
                  <span className="network-caption">
                    No money. Just mutual possibility.
                  </span>
                </div>
              </section>
              <section className="stats-grid">
                <Stat
                  title="Active exchanges"
                  value={active.length}
                  detail="Good things in motion"
                  icon={<ArrowLeftRight />}
                  onClick={() => go("My exchanges")}
                />
                <Stat
                  title="Value I’ve given"
                  value={minutes(
                    myContributions.reduce((s, c) => s + c.duration, 0),
                  )}
                  detail={`${myContributions.length} completed service sessions`}
                  icon={<Gift />}
                  onClick={() => go("My contributions")}
                />
                <Stat
                  title="What I still owe"
                  value={owed.length}
                  detail={
                    owed.length
                      ? "Your next step is to give back"
                      : "You’re all caught up"
                  }
                  icon={<Handshake />}
                  onClick={() => go("My commitments")}
                />
                <Stat
                  title="New possibilities"
                  value={matches.length}
                  detail="Matched to your offers & needs"
                  icon={<Sparkles />}
                  onClick={openMatches}
                />
              </section>
              <div className="home-columns">
                <div className="main-column">
                  <section className="card exchanges-card">
                    <div className="section-heading">
                      <h2>
                        Your exchanges{" "}
                        <span className="count-label">{active.length}</span>
                      </h2>
                      <button
                        className="text-link"
                        onClick={() => go("My exchanges")}
                      >
                        View all <ChevronRight size={15} />
                      </button>
                    </div>
                    {active.length ? (
                      active
                        .slice(0, 2)
                        .map((e) => (
                          <ExchangeSummary
                            key={e.id}
                            e={e}
                            state={state}
                            user={user}
                            open={() => setSelected(e.id)}
                          />
                        ))
                    ) : (
                      <Empty
                        title="Your next exchange starts here"
                        text="Explore compatible skills and review a proposal together."
                        action="Find a match"
                        onClick={openMatches}
                      />
                    )}
                  </section>
                  <section className="recommend-section">
                    <div className="section-heading">
                      <div>
                        <h2>
                          A good fit for you <Sparkles size={16} />
                        </h2>
                        <p>
                          New connections, built around what you give and need.
                        </p>
                      </div>
                      <button className="text-link" onClick={openMatches}>
                        Discover all <ChevronRight size={15} />
                      </button>
                    </div>
                    <div className="match-grid">
                      {matches.slice(0, 2).map((legs, i) => (
                        <MatchCard
                          key={i}
                          legs={legs}
                          user={user}
                          onClick={() => propose(legs)}
                        />
                      ))}
                      {!matches.length && (
                        <Empty
                          title="A little more to work with"
                          text="Add an offer and a need to discover a compatible exchange."
                          action="Add a skill"
                          onClick={() => add("offer")}
                        />
                      )}
                    </div>
                  </section>
                </div>
                <div className="right-column">
                  <section className="card skills-card">
                    <div className="section-heading">
                      <h2>Your give & get</h2>
                      <button
                        className="icon-button"
                        aria-label="Manage offers and needs"
                        onClick={() => go("My offers & needs")}
                      >
                        <ArrowUpRight size={17} />
                      </button>
                    </div>
                    <div className="mini-section-label">
                      <Gift size={14} /> WHAT YOU CAN GIVE
                    </div>
                    {myListings
                      .filter((l) => l.kind === "offer")
                      .slice(0, 2)
                      .map((l) => (
                        <div className="mini-skill" key={l.id}>
                          <SkillIcon skill={l.skill} />
                          <div>
                            <strong>{l.skill}</strong>
                            <small>
                              {minutes(l.duration)} / session · {l.mode}
                            </small>
                          </div>
                          <span className="status-dot" />
                        </div>
                      ))}
                    <button
                      className="dashed-button"
                      onClick={() => add("offer")}
                    >
                      <Plus size={14} /> Add an offer
                    </button>
                    <div className="card-divider" />
                    <div className="mini-section-label">
                      <Compass size={14} /> WHAT YOU’D LOVE TO LEARN
                    </div>
                    {myListings
                      .filter((l) => l.kind === "need")
                      .slice(0, 2)
                      .map((l) => (
                        <div className="mini-skill" key={l.id}>
                          <SkillIcon skill={l.skill} />
                          <div>
                            <strong>{l.skill}</strong>
                            <small>
                              {minutes(l.duration)} / session · {l.mode}
                            </small>
                          </div>
                        </div>
                      ))}
                    <button
                      className="dashed-button"
                      onClick={() => add("need")}
                    >
                      <Plus size={14} /> Add a need
                    </button>
                  </section>
                  <section className="trust-card">
                    <ShieldCheck size={24} />
                    <h3>A little trust goes a long way.</h3>
                    <p>
                      Every exchange starts with clear terms and everyone’s
                      agreement.
                    </p>
                    <button
                      className="text-link"
                      onClick={() => setModal("help")}
                    >
                      How we keep things fair <ChevronRight size={14} />
                    </button>
                  </section>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <h1>{page}</h1>
                  <p>
                    {
                      (
                        {
                          "Discover matches":
                            "Find where your skills and someone else’s needs come together.",
                          "My exchanges":
                            "Clear agreements. Real progress. Every service accounted for.",
                          "My offers & needs":
                            "Make room for what you know and what you want to learn.",
                          "My contributions":
                            "A lasting record of the value you’ve already shared.",
                          "My commitments":
                            "Know exactly what remains, and who is counting on you.",
                          Community:
                            "Your skills are personal assets. Share them, and discover what others can offer.",
                        } as Record<string, string>
                      )[page]
                    }
                  </p>
                </div>
                <button className="button primary" onClick={() => add("offer")}>
                  <Plus size={17} /> Add an offer or need
                </button>
              </div>
              {page === "Discover matches" && (
                <>
                  <div className="filter-bar">
                    <Search size={18} />
                    <input
                      aria-label="Filter matches"
                      placeholder="Search by skill or member"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <Badge>{filteredMatches.length} compatible routes</Badge>
                  </div>
                  {recommendations(state, user)
                    .filter((r) => r.priority < 3)
                    .map((r, i) => (
                      <button
                        key={i}
                        className="priority-notice"
                        onClick={() =>
                          "exchange" in r && setSelected(r.exchange)
                        }
                      >
                        <ShieldCheck size={21} />
                        <span>
                          <strong>{r.title}</strong>
                          <small>{r.reason}</small>
                        </span>
                        <ChevronRight size={20} />
                      </button>
                    ))}
                  <div className="match-grid discovery">
                    {filteredMatches.map((legs, i) => (
                      <MatchCard
                        key={i}
                        legs={legs}
                        user={user}
                        onClick={() => propose(legs)}
                      />
                    ))}
                  </div>
                  {!filteredMatches.length && (
                    <Empty
                      title="No compatible route yet"
                      text="Try another search or add a different offer or need. A small network may not contain a feasible exchange."
                      action="Add an offer or need"
                      onClick={() => add("offer")}
                    />
                  )}
                </>
              )}
              {page === "My exchanges" && (
                <div className="card">
                  {myExchanges.map((e) => (
                    <ExchangeSummary
                      key={e.id}
                      e={e}
                      state={state}
                      user={user}
                      open={() => setSelected(e.id)}
                    />
                  ))}
                  {!myExchanges.length && (
                    <Empty
                      title="Your first exchange is waiting"
                      text="Review a match and invite every participant to confirm."
                      action="Discover matches"
                      onClick={openMatches}
                    />
                  )}
                </div>
              )}
              {page === "My offers & needs" && (
                <div className="two-columns">
                  {(["offer", "need"] as const).map((kind) => (
                    <section className="card listing-column" key={kind}>
                      <div className="section-heading">
                        <h2>
                          {kind === "offer" ? "What I can give" : "What I need"}
                        </h2>
                        <button
                          className="button small-button"
                          onClick={() => add(kind)}
                        >
                          <Plus size={15} /> Add
                        </button>
                      </div>
                      {myListings
                        .filter((l) => l.kind === kind)
                        .map((l) => (
                          <div className="listing-row" key={l.id}>
                            <div className="mini-skill">
                              <SkillIcon skill={l.skill} />
                              <div>
                                <strong>{l.skill}</strong>
                                <small>
                                  {l.category} ·{" "}
                                  {
                                    ["Beginner", "Intermediate", "Advanced"][
                                      l.level
                                    ]
                                  }
                                </small>
                              </div>
                              <Badge
                                tone={l.status === "Active" ? "green" : ""}
                              >
                                {l.status}
                              </Badge>
                            </div>
                            <p>
                              {l.sessions} × {minutes(l.duration)} sessions ·{" "}
                              {l.mode}
                              <br />
                              {l.location} · {l.availability.join(", ")}
                            </p>
                            {l.conditions && <p>Condition: {l.conditions}</p>}
                            <button
                              className="text-link"
                              onClick={() => act({ type: "pause", id: l.id })}
                            >
                              {l.status === "Active"
                                ? "Pause listing"
                                : "Resume listing"}
                            </button>
                          </div>
                        ))}
                    </section>
                  ))}
                </div>
              )}
              {page === "My contributions" && (
                <section className="card">
                  <div className="section-heading">
                    <h2>Value I have given</h2>
                    <Badge>
                      {minutes(
                        myContributions.reduce((n, c) => n + c.duration, 0),
                      )}{" "}
                      delivered
                    </Badge>
                  </div>
                  {myContributions.map((c) => (
                    <div className="ledger-row" key={c.id}>
                      <SkillIcon skill={c.skill} />
                      <div>
                        <strong>
                          {c.skill} for {name(c.receiver)}
                        </strong>
                        <p>
                          {minutes(c.duration)} delivered · Original service
                          preserved
                        </p>
                      </div>
                      <Badge
                        tone={
                          contributionSettled(state, c) ? "green" : "yellow"
                        }
                      >
                        {contributionSettled(state, c)
                          ? "Settled"
                          : "Unsettled"}
                      </Badge>
                      <button
                        className="button small-button"
                        onClick={() => setSelected(c.exchange)}
                      >
                        View
                      </button>
                    </div>
                  ))}
                  {!myContributions.length && (
                    <Empty
                      title="Your contribution story starts with a session"
                      text="Completed services will appear here and stay in your history."
                    />
                  )}
                </section>
              )}
              {page === "My commitments" && (
                <>
                  <div className={`notice ${owed.length ? "amber" : ""}`}>
                    <ShieldCheck size={22} />
                    <div>
                      <strong>
                        {owed.length
                          ? "Give back before receiving first again"
                          : "You can receive first in a new exchange"}
                      </strong>
                      <p>
                        {owed.length
                          ? "Fulfil the services below to restore eligibility. The limit is one unfulfilled receive-first commitment."
                          : "Your receive-first capacity is available. Everyone in this demo has the same limit of one."}
                      </p>
                    </div>
                  </div>
                  <section className="card">
                    {commitments(state)
                      .filter((c) => c.debtor === user)
                      .map((c) => (
                        <div className="ledger-row" key={c.id}>
                          <Avatar user={c.beneficiary} />
                          <div>
                            <strong>
                              {c.skill} for {name(c.beneficiary)}
                            </strong>
                            <p>
                              {c.remaining_sessions} × {minutes(c.duration)}{" "}
                              remaining · {c.completed_sessions} of{" "}
                              {c.total_sessions} sessions fulfilled
                            </p>
                          </div>
                          <Badge
                            tone={c.status === "Fulfilled" ? "green" : "yellow"}
                          >
                            {c.status}
                          </Badge>
                          <button
                            className="button small-button"
                            onClick={() => setSelected(c.exchange)}
                          >
                            Review
                          </button>
                        </div>
                      ))}
                    {!commitments(state).some((c) => c.debtor === user) && (
                      <Empty
                        title="Nothing owed"
                        text="Your confirmed responsibilities will appear here. They become active when you receive value first."
                      />
                    )}
                  </section>
                </>
              )}
              {page === "Community" && (
                <>
                  <div className="notice">
                    <Globe2 size={25} />
                    <div>
                      <strong>
                        A community for everyone who has a skill to share
                      </strong>
                      <p>
                        Share what you know and exchange with other individuals,
                        wherever you are. These fictional profiles let you try
                        the experience; confirmations and administration are
                        simulated locally.
                      </p>
                    </div>
                  </div>
                  <div className="community-grid">
                    {Object.entries(people).map(([p, person]) => {
                      const r = reliability(state, p as Person);
                      return (
                        <section className="card member-card" key={p}>
                          <Avatar user={p as Person} size="large" />
                          <h2>{person.name}</h2>
                          <p>
                            {state.listings
                              .filter((l) => l.user === p && l.kind === "offer")
                              .map((l) => l.skill)
                              .join(" · ") || "Ready to share a skill"}
                          </p>
                          <div className="member-stats">
                            <div>
                              <strong>{r.sessions}</strong>
                              <small>Services given</small>
                            </div>
                            <div>
                              <strong>
                                {r.onTime === null ? "—" : `${r.onTime}%`}
                              </strong>
                              <small>On time</small>
                            </div>
                          </div>
                          <small className="muted">
                            Based on {r.reviews} recorded evaluations
                          </small>
                        </section>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
          <footer className="page-footer">
            <span className="small-brand-mark">◎</span> Good things come full
            circle.{" "}
            <button onClick={() => setModal("help")}>
              Learn about Skills-Ring <ArrowUpRight size={13} />
            </button>
            <button className="demo-link" onClick={() => setModal("demo")}>
              Try a demo scenario
            </button>
          </footer>
        </div>
      </main>
      {selectedExchange && (
        <Modal title="Exchange details" onClose={() => setSelected(null)} wide>
          <ExchangeDetails
            e={selectedExchange}
            state={state}
            user={user}
            act={act}
          />
        </Modal>
      )}
      {modal === "listing" && (
        <Modal
          title="Make a new connection possible"
          onClose={() => setModal(null)}
        >
          <ListingForm
            kind={listingKind}
            user={user}
            onSave={(l) => {
              act({ type: "listing", listing: l });
              setModal(null);
              setToast(
                "Your listing is live. Compatible matches have been refreshed.",
              );
            }}
          />
        </Modal>
      )}
      {modal === "help" && (
        <Modal
          title="A little clarity. A lot of possibility."
          onClose={() => setModal(null)}
        >
          <div className="help-content">
            <span className="eyebrow">HOW SKILLS-RING WORKS</span>
            <h2>
              We don’t put a price on what people have. We make it exchangeable.
            </h2>
            <p>
              A non-monetary clearing and settlement system for service
              obligations.
            </p>
            <ol>
              <li>
                <strong>Share your give & need.</strong> Choose a skill, session
                length, capacity, and availability for each.
              </li>
              <li>
                <strong>Find your people.</strong> Trade directly or connect
                through a three- or four-person ring.
              </li>
              <li>
                <strong>Agree before you begin.</strong> Every person reviews
                and explicitly confirms all responsibilities.
              </li>
              <li>
                <strong>Give, receive, and follow through.</strong> Completed
                services stay in history. Remaining obligations are always
                visible.
              </li>
            </ol>
            <div className="notice amber">
              <ShieldCheck size={22} />
              <div>
                <strong>One receive-first commitment at a time.</strong>
                <p>
                  This protects contributors from repeated unpaid obligations.
                  It also limits honest newcomers who need several services
                  before they can give back.
                </p>
              </div>
            </div>
            <h3>Quantity is not the value of a skill</h3>
            <p>
              A potential imbalance is flagged when scheduled time differs by
              more than 25% or session counts differ. This configurable
              heuristic compares observable quantities. Everyone still decides
              whether to agree.
            </p>
            <h3>What the system cannot promise</h3>
            <p>
              If someone defaults after receiving a service and no acceptable
              replacement exists, we preserve the claim and restrict further
              receive-first activity. We cannot recreate an irreversible service
              or guarantee repayment.
            </p>
            <p>
              Small networks may have no match. Subjective quality, collusion,
              pressure to agree, or an unacceptable replacement can prevent
              successful settlement. Dispute resolutions record a decision; they
              are not objective arbitration.
            </p>
            <div className="notice">
              <BookOpen size={20} />
              <p>
                This base uses fictional people and browser storage.
                Authentication, participant identities, and dispute
                administration are simulated. There are no payments or
                transferable credits.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "demo" && (
        <Modal title="Your demo workspace" onClose={() => setModal(null)}>
          <p className="modal-intro">
            Explore repeatable scenarios using the same matching and service
            ledger. Starting a scenario replaces the current local demo data.
          </p>
          <div className="scenario-list">
            {(
              [
                {
                  key: "home",
                  title: "Everyday exchange",
                  text: "Return to Alice’s workspace, with a partly settled exchange and new matches.",
                },
                {
                  key: "direct",
                  title: "01 · Give first, settle in parts",
                  text: "Alice gives 2 × 1-hour Python sessions. Bob gives 2 × 30-minute tennis sessions. Review imbalance, confirm, and watch receive-first eligibility change.",
                },
                {
                  key: "ring",
                  title: "02 · Keep the ring moving",
                  text: "Discover Alice → Charlie → Bob → Alice. Record Alice’s service, then Charlie can withdraw. Find David or record the no-replacement outcome.",
                },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                className="scenario"
                onClick={() => {
                  setState(seed(s.key));
                  setUser("alice");
                  go(s.key === "home" ? "Home" : "Discover matches");
                  setModal(null);
                  setSelected(null);
                  setToast(
                    "Scenario loaded. All changes are saved on this device.",
                  );
                }}
              >
                <RotateCcw size={20} />
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.text}</small>
                </span>
                <ChevronRight size={20} />
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Your updates" onClose={() => setModal(null)}>
          {active.length ? (
            active.map((e) => (
              <button
                className="scenario"
                key={e.id}
                onClick={() => {
                  setModal(null);
                  setSelected(e.id);
                }}
              >
                <ArrowLeftRight size={22} />
                <span>
                  <strong>{e.title}</strong>
                  <small>
                    {e.status} · Review the remaining services and next steps.
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <Empty
              title="You’re up to date"
              text="New exchange activity will appear here."
            />
          )}
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
function Stat({
  title,
  value,
  detail,
  icon,
  onClick,
}: {
  title: string;
  value: React.ReactNode;
  detail: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="stat-card" onClick={onClick}>
      <div>
        <span>{title}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}
function Empty({
  title,
  text,
  action,
  onClick,
}: {
  title: string;
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty-state">
      <Network size={30} />
      <h3>{title}</h3>
      <p>{text}</p>
      {action && (
        <button className="button" onClick={onClick}>
          {action}
        </button>
      )}
    </div>
  );
}
function MatchCard({
  legs,
  user,
  onClick,
}: {
  legs: Leg[];
  user: Person;
  onClick: () => void;
}) {
  const give = legs.find((l) => l.provider === user)!,
    get = legs.find((l) => l.receiver === user)!;
  return (
    <article className="card match-card">
      <div className="match-member">
        <Avatar user={get.provider} />
        <div>
          <strong>{people[get.provider].name}</strong>
          <small>Independent skill sharer</small>
        </div>
        <Badge tone={legs.length > 2 ? "purple" : "green"}>
          {legs.length > 2 ? `${legs.length}-person ring` : "Direct match"}
        </Badge>
      </div>
      <div className="match-terms">
        <div>
          <span>YOU GIVE</span>
          <strong>{give.skill}</strong>
          <small>
            {give.sessions} × {minutes(give.duration)}
          </small>
        </div>
        <ArrowLeftRight size={17} />
        <div>
          <span>YOU RECEIVE</span>
          <strong>{get.skill}</strong>
          <small>
            {get.sessions} × {minutes(get.duration)}
          </small>
        </div>
      </div>
      <div className="match-reason">
        <Check size={14} /> Skills and availability align
      </div>
      <div className="match-reason">
        <Clock3 size={14} /> {get.availability}
      </div>
      {imbalance(legs) && (
        <div className="match-reason amber-text">
          <AlertTriangle size={14} /> Potential quantity imbalance
        </div>
      )}
      <div className="match-bottom">
        <span>
          <ShieldCheck size={14} /> Review terms together
        </span>
        <button className="button small-button" onClick={onClick}>
          Review match
        </button>
      </div>
    </article>
  );
}
function ExchangeSummary({
  e,
  state,
  user,
  open,
}: {
  e: Exchange;
  state: State;
  user: Person;
  open: () => void;
}) {
  const get = e.legs.find((l) => l.receiver === user) || e.legs[0],
    give = e.legs.find((l) => l.provider === user) || e.legs[1];
  const total = e.legs.reduce((n, l) => n + l.sessions * l.duration, 0),
    finished = e.legs.reduce((n, l) => n + done(state, e.id, l.id), 0);
  return (
    <div className="exchange-summary">
      <div className="exchange-top">
        <div className="overlap-avatars">
          {participants(e)
            .filter((p) => p !== user)
            .map((p) => (
              <Avatar user={p} key={p} />
            ))}
        </div>
        <div>
          <strong>
            {give.skill} <span className="muted">↔</span> {get.skill}
          </strong>
          <small>
            With{" "}
            {participants(e)
              .filter((p) => p !== user)
              .map(name)
              .join(" & ")}{" "}
            · {e.legs.length === 2 ? "Direct exchange" : "Exchange ring"}
          </small>
        </div>
        <Badge
          tone={
            e.status === "settled"
              ? "green"
              : e.status === "partially settled"
                ? "yellow"
                : ""
          }
        >
          {e.status}
        </Badge>
      </div>
      <div className="progress-label">
        <span>Exchange progress</span>
        <strong>{Math.round((finished / total) * 100)}%</strong>
      </div>
      <div className="progress-track">
        <div style={{ width: `${Math.min(100, (finished / total) * 100)}%` }} />
      </div>
      <div className="exchange-next">
        <div>
          <Clock3 size={15} />
          <span>
            {remaining(state, e, get) > 0
              ? `${name(get.provider)} has ${minutes(remaining(state, e, get))} of ${get.skill} left to give`
              : "Your received service is complete"}
          </span>
        </div>
        <button className="button small-button" onClick={open}>
          View exchange <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const items = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
function ListingForm({
  kind,
  user,
  onSave,
}: {
  kind: Listing["kind"];
  user: Person;
  onSave: (l: Listing) => void;
}) {
  const [currentKind, setKind] = useState(kind),
    [category, setCategory] = useState<keyof typeof library>("Programming");
  return (
    <form
      className="listing-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        onSave({
          id: id(),
          user,
          kind: currentKind,
          category,
          skill: f.get("skill") as string,
          duration: Number(f.get("duration")),
          sessions: Number(f.get("sessions")),
          mode: f.get("mode") as Listing["mode"],
          location: f.get("location") as string,
          availability: f.getAll("availability") as string[],
          level: Number(f.get("level")),
          conditions: (f.get("conditions") as string).trim(),
          status: "Active",
        });
      }}
    >
      <div className="segmented">
        <button
          type="button"
          className={currentKind === "offer" ? "active" : ""}
          onClick={() => setKind("offer")}
        >
          <Gift size={17} /> What I can give
        </button>
        <button
          type="button"
          className={currentKind === "need" ? "active" : ""}
          onClick={() => setKind("need")}
        >
          <Compass size={17} /> What I need
        </button>
      </div>
      <p>
        Posting as <strong>{people[user].name}</strong>. Each offer and need has
        its own preferences.
      </p>
      <div className="form-grid">
        <label>
          Category
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as keyof typeof library)
            }
          >
            {Object.keys(library).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Skill
          <select name="skill" key={category}>
            {library[category].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select
            name="level"
            defaultValue={currentKind === "offer" ? "2" : "0"}
          >
            <option value="0">Beginner</option>
            <option value="1">Intermediate</option>
            <option value="2">Advanced</option>
          </select>
        </label>
        <label>
          Length per session
          <select name="duration" defaultValue="60">
            {[30, 45, 60, 90, 120].map((n) => (
              <option key={n} value={n}>
                {minutes(n)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {currentKind === "offer" ? "Session capacity" : "Sessions needed"}
          <input
            type="number"
            name="sessions"
            min="1"
            max="10"
            defaultValue="1"
            required
          />
        </label>
        <label>
          How we meet
          <select name="mode">
            <option>Online</option>
            <option>Offline</option>
            <option>Either</option>
          </select>
        </label>
        <label>
          Location
          <input
            name="location"
            defaultValue="Anywhere"
            placeholder="City or agreed meeting place"
            maxLength={100}
            required
          />
        </label>
        <label>
          Availability
          <select name="availability" defaultValue="Saturday Afternoon">
            {slots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Conditions <span className="muted">(optional)</span>
        <input
          name="conditions"
          placeholder="For example: Bring your own racket"
          maxLength={180}
        />
      </label>
      <small className="muted">
        Conditions must match exactly for automatic matching. Use Other with a
        specific condition to describe an unlisted skill.
      </small>
      <button className="button primary full-width" type="submit">
        Publish {currentKind}
      </button>
    </form>
  );
}
function ExchangeDetails({
  e,
  state,
  user,
  act,
}: {
  e: Exchange;
  state: State;
  user: Person;
  act: (a: Action) => void;
}) {
  const [tab, setTab] = useState("Overview"),
    [reason, setReason] = useState(""),
    [amendCount, setAmendCount] = useState("1"),
    [amendLeg, setAmendLeg] = useState(e.legs[0].id),
    [disputeReason, setDisputeReason] = useState("");
  const pending = e.amendments.find((a) => a.status === "pending");
  const sessions = state.sessions.filter((s) => s.exchange === e.id);
  const canComplete = ["confirmed", "active", "partially settled"].includes(
    e.status,
  );
  return (
    <>
      <div className="detail-title">
        <div>
          <span className="eyebrow">
            {e.legs.length === 2 ? "DIRECT EXCHANGE" : "MULTI-PERSON RING"}
          </span>
          <h2>{e.legs.map((l) => l.skill).join(" + ")}</h2>
        </div>
        <Badge tone={e.status === "settled" ? "green" : "yellow"}>
          {e.status}
        </Badge>
      </div>
      <div className="tabs">
        {["Overview", "Sessions & trust", "Changes & recovery", "Activity"].map(
          (t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? "active" : ""}
            >
              {t}
            </button>
          ),
        )}
      </div>
      {tab === "Overview" && (
        <>
          {imbalance(e.legs) && (
            <div className="notice amber">
              <AlertTriangle size={21} />
              <div>
                <strong>Potential imbalance</strong>
                <p>
                  {e.legs
                    .map(
                      (l) =>
                        `${name(l.provider)}: ${minutes(l.duration * l.sessions)}`,
                    )
                    .join(" · ")}
                  . This compares time and session counts, not the economic
                  value of a skill. Every participant must explicitly accept.
                </p>
              </div>
            </div>
          )}
          {e.legs.length > 2 && (
            <div
              className="route-diagram"
              aria-label="Providers point to receivers"
            >
              {e.legs.map((l) => (
                <React.Fragment key={l.id}>
                  <div>
                    <Avatar user={l.provider} />
                    <strong>{name(l.provider)}</strong>
                    <small>gives {l.skill}</small>
                  </div>
                  <span aria-hidden="true">→</span>
                </React.Fragment>
              ))}
              <div>
                <Avatar user={e.legs[0].provider} />
                <strong>{name(e.legs[0].provider)}</strong>
                <small>Ring complete</small>
              </div>
            </div>
          )}
          <div className="terms-list">
            {e.legs.map((l) => (
              <div className="term-card" key={l.id}>
                <div className="term-header">
                  <SkillIcon skill={l.skill} />
                  <div>
                    <h3>
                      {name(l.provider)} gives {l.skill} to {name(l.receiver)}
                    </h3>
                    <p>
                      {l.sessions} × {minutes(l.duration)} sessions · {l.mode} ·{" "}
                      {l.location}
                    </p>
                  </div>
                </div>
                <p className="muted">
                  <Clock3 size={14} /> {l.availability}
                </p>
                <div className="term-progress">
                  <strong>{minutes(done(state, e.id, l.id))} completed</strong>
                  <span>{minutes(remaining(state, e, l))} remaining</span>
                </div>
                <div className="progress-track">
                  <div
                    style={{
                      width: `${Math.min(100, (done(state, e.id, l.id) / (l.duration * l.sessions)) * 100)}%`,
                    }}
                  />
                </div>
                {canComplete && remaining(state, e, l) > 0 && (
                  <button
                    className="button full-width"
                    disabled={!!pending}
                    onClick={() =>
                      act({ type: "complete", exchange: e.id, leg: l.id })
                    }
                  >
                    <CheckCircle2 size={16} /> Record{" "}
                    {minutes(Math.min(l.duration, remaining(state, e, l)))}{" "}
                    completed
                    {e.recovery?.applied && e.recovery.leg?.replaces === l.id
                      ? ` by ${name(e.recovery.replacement!)}`
                      : ""}
                  </button>
                )}
              </div>
            ))}
          </div>
          {e.status === "proposed" && (
            <section className="confirmation-panel">
              <h3>Everyone agrees before anything begins</h3>
              <p>
                Demo: each button simulates that participant’s explicit
                acceptance of the complete route and any quantity imbalance.
              </p>
              {participants(e).map((p) => (
                <div className="confirmation-row" key={p}>
                  <Avatar user={p} />
                  <strong>{people[p].name}</strong>
                  <button
                    className={`button ${e.confirmations.includes(p) ? "" : "primary"}`}
                    disabled={e.confirmations.includes(p)}
                    onClick={() =>
                      act({ type: "confirm", exchange: e.id, user: p })
                    }
                  >
                    {e.confirmations.includes(p)
                      ? "Confirmed"
                      : `Confirm as ${name(p)}`}
                  </button>
                </div>
              ))}
            </section>
          )}
          {participants(e).map((p) =>
            outstanding(state, p).map((c) => (
              <div className="notice amber" key={c.id}>
                <ShieldCheck size={19} />
                <div>
                  <strong>
                    {name(p)} must give back before receiving first again
                  </strong>
                  <p>
                    {name(p)} owes {name(c.beneficiary)} {c.remaining_sessions}{" "}
                    × {minutes(c.duration)} {c.skill}. Fulfilling this
                    commitment restores eligibility.
                  </p>
                </div>
              </div>
            )),
          )}
          {["withdrawn", "defaulted", "disputed"].includes(e.status) && (
            <div className="notice amber">
              <AlertTriangle size={20} />
              <div>
                <strong>
                  {e.status === "disputed"
                    ? "Settlement on hold"
                    : e.status === "defaulted"
                      ? "Uncovered contribution preserved"
                      : "This ring needs a new route"}
                </strong>
                <p>
                  Completed services remain in history.{" "}
                  {e.status === "defaulted"
                    ? "No accepted replacement was found; repayment cannot be guaranteed."
                    : "Review Changes & recovery or Sessions & trust for the next step."}
                </p>
              </div>
            </div>
          )}
          <p className="simulation-note">
            Local demonstration · Session recording simulates participant
            attestation. No service is independently verified.
          </p>
        </>
      )}
      {tab === "Sessions & trust" && (
        <>
          {!sessions.length && (
            <Empty
              title="No services delivered yet"
              text="Confirm the exchange, then record a completed session from Overview."
            />
          )}
          {sessions.map((s) => (
            <section className="session-card" key={s.id}>
              <div className="term-header">
                <Avatar user={s.provider} />
                <div>
                  <h3>
                    {name(s.provider)} → {name(s.receiver)} · {s.skill}
                  </h3>
                  <p>
                    {minutes(s.actual_duration)} delivered · {s.scheduled_time}
                  </p>
                </div>
                <Badge tone="green">Recorded</Badge>
              </div>
              <p>{s.notes}</p>
              <EvaluationForm session={s.id} state={state} act={act} />
              {!state.disputes.some((d) => d.session === s.id) && (
                <details>
                  <summary>Dispute this session</summary>
                  <p>
                    Record disagreement and put settlement on hold. Original
                    evidence and contribution history stay intact.
                  </p>
                  <input
                    aria-label="Dispute reason"
                    placeholder="What was not delivered as agreed?"
                    value={disputeReason}
                    onChange={(ev) => setDisputeReason(ev.target.value)}
                  />
                  <button
                    className="button"
                    disabled={!disputeReason.trim()}
                    onClick={() =>
                      act({
                        type: "dispute",
                        session: s.id,
                        user: s.receiver,
                        reason: disputeReason,
                      })
                    }
                  >
                    Raise as {name(s.receiver)}
                  </button>
                </details>
              )}
              {state.disputes
                .filter((d) => d.session === s.id)
                .map((d) => (
                  <div className="notice amber" key={d.id}>
                    <AlertTriangle size={20} />
                    <div>
                      <strong>
                        {d.status} dispute · {name(d.raised_by)}
                      </strong>
                      <p>{d.reason}</p>
                      {d.status === "Open" ? (
                        <>
                          <p>
                            Simulated administration: choose a recorded
                            resolution. Partial release accepts 50% of the
                            claimed duration and leaves the rest owed.
                          </p>
                          <div className="button-row">
                            {(
                              [
                                "Full release",
                                "Partial release",
                                "Default",
                              ] as const
                            ).map((res) => (
                              <button
                                key={res}
                                className="button small-button"
                                onClick={() =>
                                  act({
                                    type: "resolve",
                                    dispute: d.id,
                                    resolution: res,
                                  })
                                }
                              >
                                {res}
                              </button>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p>
                          {d.resolution}: {d.released_minutes} min released.
                          Original claimed service retained.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </section>
          ))}
        </>
      )}
      {tab === "Changes & recovery" && (
        <>
          <section className="recovery-section">
            <h3>Amend future sessions</h3>
            <p>
              Changes require everyone’s renewed confirmation. Completed
              services stay in history. While a change is pending, new service
              recording is paused.
            </p>
            {pending ? (
              <>
                <div className="notice amber">
                  <AlertTriangle size={20} />
                  <p>
                    Current: {pending.before} sessions. Proposed:{" "}
                    {pending.after} sessions of{" "}
                    {e.legs.find((l) => l.id === pending.leg)!.skill}. Recheck
                    the time comparison:{" "}
                    {e.legs
                      .map(
                        (l) =>
                          `${name(l.provider)} ${minutes((l.id === pending.leg ? pending.after : l.sessions) * l.duration)}`,
                      )
                      .join(" · ")}
                    .
                  </p>
                </div>
                <div className="button-row">
                  {participants(e).map((p) => (
                    <button
                      key={p}
                      className="button"
                      disabled={pending.confirmations.includes(p)}
                      onClick={() =>
                        act({ type: "confirmAmend", exchange: e.id, user: p })
                      }
                    >
                      {pending.confirmations.includes(p)
                        ? `${name(p)} confirmed`
                        : `Accept as ${name(p)}`}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="amend-form">
                <label>
                  Service
                  <select
                    value={amendLeg}
                    onChange={(ev) => setAmendLeg(ev.target.value)}
                  >
                    {e.legs.map((l) => (
                      <option value={l.id} key={l.id}>
                        {name(l.provider)} · {l.skill} (currently {l.sessions})
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  New total sessions
                  <input
                    type="number"
                    min="1"
                    max={e.legs.find((l) => l.id === amendLeg)?.capacity}
                    value={amendCount}
                    onChange={(ev) => setAmendCount(ev.target.value)}
                  />
                </label>
                <button
                  className="button"
                  disabled={!canComplete}
                  onClick={() =>
                    act({
                      type: "amend",
                      exchange: e.id,
                      leg: amendLeg,
                      sessions: Number(amendCount),
                    })
                  }
                >
                  Propose change
                </button>
              </div>
            )}
          </section>
          <section className="recovery-section">
            <h3>Withdraw or recover an exchange</h3>
            {e.status !== "withdrawn" ? (
              <>
                <p>
                  Withdrawal freezes the remaining services. If value has
                  already been received, the original responsibility stays with
                  that participant.
                </p>
                <label>
                  Reason
                  <input
                    placeholder="Explain why you need to leave"
                    value={reason}
                    onChange={(ev) => setReason(ev.target.value)}
                  />
                </label>
                <div className="button-row">
                  {participants(e).map((p) => (
                    <button
                      key={p}
                      className="button"
                      disabled={
                        !reason.trim() ||
                        ["settled", "defaulted", "disputed"].includes(e.status)
                      }
                      onClick={() =>
                        act({
                          type: "withdraw",
                          exchange: e.id,
                          user: p,
                          reason,
                        })
                      }
                    >
                      Withdraw as {name(p)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="notice amber">
                  <AlertTriangle size={20} />
                  <p>
                    {name(e.recovery!.withdrawn)} withdrew. All prior
                    contributions are preserved. An accepted replacement
                    volunteers to cover the service; they do not inherit debt.
                  </p>
                </div>
                {!e.recovery?.replacement ? (
                  <>
                    <button
                      className="button primary"
                      onClick={() =>
                        act({
                          type: "replacement",
                          exchange: e.id,
                          user: "david",
                        })
                      }
                    >
                      Find compatible replacement
                    </button>
                    <p className="muted">
                      Searches David’s actual offer against the outstanding
                      need, including schedule and capacity.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="replacement-person">
                      <Avatar user={e.recovery.replacement} />
                      <div>
                        <strong>
                          {people[e.recovery.replacement].name} can help
                        </strong>
                        <p>
                          Gives {e.recovery.leg!.sessions} ×{" "}
                          {minutes(e.recovery.leg!.duration)} of{" "}
                          {e.recovery.leg!.skill} to{" "}
                          {name(e.recovery.leg!.receiver)}.
                        </p>
                        <p>
                          {sessions.length
                            ? "Voluntary recovery service; no promised service in return. The original debtor remains responsible until performance."
                            : "The incoming service will be redirected to the replacement, with everyone’s agreement."}
                        </p>
                      </div>
                    </div>
                    <div className="button-row">
                      {[...participants(e), e.recovery.replacement].map((p) => (
                        <button
                          className="button"
                          key={p}
                          disabled={e.recovery!.confirmations.includes(p)}
                          onClick={() =>
                            act({ type: "reconfirm", exchange: e.id, user: p })
                          }
                        >
                          {e.recovery!.confirmations.includes(p)
                            ? `${name(p)} accepted`
                            : `Reconfirm as ${name(p)}`}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <hr />
                <p>
                  If nobody acceptable is available at the deadline, preserve
                  the claim and record a default.
                </p>
                <button
                  className="button danger"
                  onClick={() => act({ type: "default", exchange: e.id })}
                >
                  Simulate deadline · No replacement
                </button>
              </>
            )}
          </section>
        </>
      )}
      {tab === "Activity" && (
        <ol className="activity-list">
          {e.audit.map((item, i) => (
            <li key={i}>
              <span>
                <History size={16} />
              </span>
              <div>
                <small>EVENT {String(i + 1).padStart(2, "0")}</small>
                <p>{item}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
function EvaluationForm({
  session,
  state,
  act,
}: {
  session: string;
  state: State;
  act: (a: Action) => void;
}) {
  const existing = state.evaluations.find((e) => e.session === session);
  return (
    <details>
      <summary>
        {existing
          ? "Evaluation recorded · Edit feedback"
          : "Leave behaviour-based feedback"}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          act({
            type: "evaluate",
            evaluation: {
              session,
              on_time: f.get("on_time") === "yes",
              completed_as_agreed: f.get("completed_as_agreed") === "yes",
              engaged: f.get("engaged") === "yes",
              would_exchange_again: f.get("would_exchange_again") === "yes",
              comment: f.get("comment") as string,
            },
          });
        }}
      >
        <div className="evaluation-grid">
          {(
            [
              ["on_time", "On time?"],
              ["completed_as_agreed", "Completed as agreed?"],
              ["engaged", "Engaged?"],
              ["would_exchange_again", "Exchange again?"],
            ] as const
          ).map(([k, label]) => (
            <label key={k}>
              {label}
              <select
                name={k}
                defaultValue={existing ? (existing[k] ? "yes" : "no") : ""}
                required
              >
                <option value="" disabled>
                  Choose
                </option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          ))}
        </div>
        <label>
          Comment
          <input
            name="comment"
            defaultValue={existing?.comment || ""}
            placeholder="Optional notes about the session"
          />
        </label>
        <button className="button small-button" type="submit">
          {existing ? "Update feedback" : "Save feedback"}
        </button>
      </form>
    </details>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
