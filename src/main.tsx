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
  Play,
  Pause,
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
  proposalStatus,
  people,
  name,
  minutes,
  library,
  slots,
  findMatches,
  availableListing,
  participants,
  imbalance,
  remaining,
  done,
  commitments,
  outstanding,
  reliability,
  contributionSettled,
  recommendations,
  exchangeBonds,
  bondQuote,
  hkd,
  id,
} from "./domain";
import "./styles.css";
import "./theme.css";
import "./community.css";
import { SkillCover } from "./SkillCover";
import { AuthGate, type Account } from "./auth";
import { Community } from "./Community";
import { Moderation } from "./Moderation";
import { ProfileImport } from "./ProfileImport";
import { restoreDemoMode } from "./community-model";
import { EntryIntro } from "./EntryIntro";
import { Discovery, trackDiscoveryEvent } from "./Discovery";
import { Coordination } from "./Coordination";
import {
  SkillOrbit,
  AnimatedValue,
  ExchangeJourney,
  SettlementMoment,
  useMotionPreference,
} from "./experience";
import { fetchLiveSnapshot, liveSnapshotToState, resolveLiveUser, syncLiveExchange, syncLiveListing, LiveSyncError } from "./live";
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
function accountInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/);
  if (words.length > 1) return `${Array.from(words[0])[0]}${Array.from(words[words.length - 1])[0]}`.toUpperCase();
  return Array.from(displayName.trim()).slice(0, 2).join("").toUpperCase();
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
function App({ account, onLogout }: { account: Account; onLogout: () => Promise<void> }) {
  const [demo, setDemo] = useState(() => {
    try { return restoreDemoMode(localStorage, account.userId); } catch { return false; }
  });
  function changeMode(next: boolean) {
    try { localStorage.setItem(`skills-ring-mode-v1-${account.userId}`, next ? "demo" : "live"); } catch { /* Mode still changes for this visit. */ }
    setDemo(next);
  }
  return <Workspace key={`${account.userId}-${demo}`} account={account} onLogout={onLogout} demo={demo} onModeChange={changeMode} />;
}
function Workspace({ account, onLogout, demo, onModeChange }: {
  account: Account; onLogout: () => Promise<void>; demo: boolean; onModeChange: (demo: boolean) => void;
}) {
  const demoStorage = `${STORAGE}-${account.userId}`;
  const [motion, setMotion] = useMotionPreference();
  const [state, setState] = useState<State>(() => {
    try {
      const s = JSON.parse(localStorage.getItem(demoStorage) || "null");
      if (s?.version !== 1 || !Array.isArray(s.exchanges)) return seed();
      // Migrate the fictional demo venue label while preserving existing work.
      const saved = s as State;
      for (const listing of saved.listings) {
        if (listing.location === "HKU")
          listing.location = "Local meeting point";
      }
      for (const exchange of saved.exchanges) {
        exchange.status = proposalStatus(exchange);
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
  const [dataMode, setDataMode] = useState<"loading" | "live" | "demo" | "error">(demo ? "demo" : "loading");
  const [liveError, setLiveError] = useState("");
  const snapshotEpoch = useRef(0);
  const activeExchangeSyncs = useRef(0);
  const [initialReviewKey, setInitialReviewKey] = useState<string | null>(null);
  const [discoveryEpoch, setDiscoveryEpoch] = useState(0);
  const [modal, setModal] = useState<
      "listing" | "help" | "demo" | "notifications" | null
    >(null),
    [selected, setSelected] = useState<string | null>(null),
    [editingListing, setEditingListing] = useState<Listing | null>(null),
    [listingKind, setListingKind] = useState<"offer" | "need">("offer");
  useEffect(() => {
    try {
      if (!demo || state.liveStats) return;
      localStorage.setItem(demoStorage, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state, demo, demoStorage]);
  useEffect(() => {
    if (demo) return;
    let cancelled = false;
    const refresh = async (initial = false) => {
      const request = ++snapshotEpoch.current;
      try {
        const snapshot = await fetchLiveSnapshot();
        if (cancelled || request !== snapshotEpoch.current) return;
        const next = liveSnapshotToState(snapshot);
        setState(next);
        setUser(resolveLiveUser(snapshot, account.name, account.userId));
        setDataMode("live");
        setLiveError("");
      } catch (error) {
        if (cancelled || request !== snapshotEpoch.current) return;
        if (initial) {
          setDataMode("error");
        }
        setLiveError(error instanceof Error ? error.message : "Live data is unavailable.");
      }
    };
    void refresh(true);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible" && activeExchangeSyncs.current === 0) void refresh();
    }, 30_000);
    const onFocus = () => { if (activeExchangeSyncs.current === 0) void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.clearInterval(poll); window.removeEventListener("focus", onFocus); };
  }, [account.name, account.userId, demo]);
  useEffect(() => {
    const checkTimedEvents = () => setState((current) => {
      if (current.liveStats) return current;
      const proposal = current.exchanges.find((e) => e.status === "proposed" && e.expiresAt && Date.parse(e.expiresAt) <= Date.now());
      if (proposal) return transition(current, { type: "expireProposal", exchange: proposal.id });
      const booking = current.bookings?.find((b) => b.status === "accepted" && !b.reminded && Date.parse(b.start) > Date.now() && Date.parse(b.start) - Date.now() <= 86400000);
      return booking ? transition(current, { type: "remindBooking", exchange: booking.exchange, booking: booking.id }) : current;
    });
    checkTimedEvents();
    const timer = window.setInterval(checkTimedEvents, 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 5500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  function act(action: Action): boolean {
    if (dataMode === "loading" || dataMode === "error") {
      setToast("Wait for the live workspace to load before making changes.");
      return false;
    }
    if (dataMode === "live" && action.type !== "readNotifications") {
      if (activeExchangeSyncs.current) { setToast("Your previous change is still saving."); return false; }
      let next: State;
      try { next = transition(state, action); } catch (error) { setToast((error as Error).message); return false; }
      const sessionId = action.type === "dispute" ? action.session : action.type === "evaluate" ? action.evaluation.session : null;
      const exchangeId = "exchange" in action ? action.exchange : state.sessions.find(s => s.id === sessionId)?.exchange;
      const exchange = action.type === "propose" ? next.exchanges.at(-1) : next.exchanges.find(e => e.id === exchangeId);
      if (!exchange) { setToast("Use the listing form to update your listings."); return false; }
      activeExchangeSyncs.current += 1;
      setToast("Saving your change…");
      void syncLiveExchange(next, exchange, action, user).then(async result => {
        const snapshot = await fetchLiveSnapshot();
        ++snapshotEpoch.current;
        setState(liveSnapshotToState(snapshot));
        setUser(resolveLiveUser(snapshot, account.name, account.userId));
        if (action.type === "propose" && result.exchangeId) setSelected(result.exchangeId);
        setToast(result.warning || "Your change has been saved.");
      }).catch(error => setToast(error instanceof Error ? error.message : "Your change could not be saved."))
        .finally(() => { activeExchangeSyncs.current -= 1; });
      return true;
    }
    try {
      const next = transition(state, action);
      setState(next);
      if (action.type === "propose") setSelected(next.exchanges.at(-1)!.id);
      if (action.type === "complete") {
        const exchange = next.exchanges.find((e) => e.id === action.exchange);
        setToast(
          exchange?.status === "settled"
            ? "Full circle. Every service in this exchange is fulfilled."
            : "Service recorded. Your exchange is moving forward.",
        );
      } else if (action.type === "confirm") {
        setToast("Agreement recorded. One step closer to your exchange.");
        const confirmed = next.exchanges.find((e) => e.id === action.exchange);
        if (confirmed?.status === "confirmed") trackDiscoveryEvent("accepted_exchange", confirmed.legs.map((l) => l.id).join("|"), action.user);
      } else if (action.type === "evaluate") {
        setToast("Feedback saved. A little trust goes a long way.");
      }
      return true;
    } catch (e) {
      setToast((e as Error).message);
      return false;
    }
  }
  function go(next: string) {
    setPage(next);
    setMenu(false);
    setQuery("");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  if (dataMode === "loading" || dataMode === "error") return <main className="auth-status" role="status">
    <div><h1>{dataMode === "loading" ? "Loading your workspace…" : "Your workspace is temporarily unavailable"}</h1>
    {liveError && <p>{liveError}</p>}
    {dataMode === "error" && <button className="button" onClick={() => window.location.reload()}>Try again</button>}
    <button className="button" onClick={() => void onLogout()}>Leave profile</button></div>
  </main>;
  const myExchanges = state.exchanges.filter(
    (e) => participants(e).includes(user) || e.recovery?.replacement === user,
  );
  const active = myExchanges.filter(
    (e) => !["settled", "defaulted", "proposed", "withdrawn", "declined", "cancelled", "expired"].includes(e.status),
  );
  const myContributions = state.contributions.filter(
      (c) => c.provider === user,
    ),
    owed = outstanding(state, user),
    myListings = state.listings.filter((l) => l.user === user);
  const matches = findMatches(state, user);
  const hasPublishedOffer = state.listings.some(l => l.user === user && l.kind === "offer" && l.status === "Active" && !l.id.startsWith("starter_"));
  const publishedRequests = [...new Set(state.listings.filter(l => l.user === user && l.kind === "need" && l.status === "Active" && !l.id.startsWith("starter_")).map(l => l.skill))];
  const selectedExchange = state.exchanges.find((e) => e.id === selected);
  const add = (kind: "offer" | "need") => {
    setEditingListing(null);
    setListingKind(kind);
    setModal("listing");
  };
  const edit = (listing: Listing) => {
    setEditingListing(listing);
    setListingKind(listing.kind);
    setModal("listing");
  };
  function propose(legs: Leg[]): boolean {
    return act({ type: "propose", legs });
  }
  async function refreshAfterListingWrite() {
    const request = ++snapshotEpoch.current;
    const snapshot = await fetchLiveSnapshot();
    if (request !== snapshotEpoch.current) return;
    setState(liveSnapshotToState(snapshot));
    setUser(resolveLiveUser(snapshot, account.name, account.userId));
    setLiveError("");
  }
  async function changeListingStatus(listing: Listing, status: "Active" | "Paused" | "Fulfilled" | "Archived" | "Deleted") {
    if (dataMode !== "live") return act({ type: "setListingStatus", id: listing.id, status });
    try {
      transition(state, { type: "setListingStatus", id: listing.id, status });
      const result = await syncLiveListing({ ...listing, status: status === "Deleted" ? "Archived" : status });
      await refreshAfterListingWrite();
      setToast(result.warning || "Your listing and matches have been refreshed.");
      return true;
    } catch (error) {
      setToast(error instanceof Error ? error.message : "The live listing could not be updated.");
      return false;
    }
  }
  async function saveListing(listing: Listing, successText?: string) {
    const editing = Boolean(editingListing);
    const action: Action = editing
      ? { type: "editListing", listing }
      : { type: "listing", listing };
    if (dataMode === "live") {
      try {
        const result = await syncLiveListing(listing);
        await refreshAfterListingWrite();
        setModal(null);
        setEditingListing(null);
        setToast(result.warning || successText || (editing ? "Your listing was updated and matches have been refreshed." : "Your listing was published and matches have been refreshed."));
      } catch (error) {
        if (error instanceof LiveSyncError && error.persisted) act(action);
        setToast(error instanceof Error ? error.message : "The live listing could not be saved or refreshed.");
      }
      return;
    }
    if (!act(action)) return;
    setModal(null);
    setEditingListing(null);
    setToast(
      listing.skill === "Other" && !listing.otherApproved
        ? "Your skill suggestion is waiting in Demo Studio review before it can match."
        : "Your listing was saved. Compatible matches have been refreshed.",
    );
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
          {dataMode === "demo" && <button className="demo-launcher" onClick={() => setModal("demo")}>
            <Play size={13} fill="currentColor" /> Demo studio
          </button>}
          <button
            className="icon-button motion-toggle"
            aria-label={motion ? "Pause motion" : "Enable motion"}
            aria-pressed={motion}
            title={motion ? "Pause motion" : "Enable motion"}
            onClick={() => setMotion(!motion)}
          >
            {motion ? <Pause size={17} /> : <Play size={17} />}
          </button>
          <button
            className="icon-button notification"
            aria-label="Notifications"
            onClick={() => setModal("notifications")}
          >
            <Bell size={19} />
            {(state.notifications || []).some((n) => n.user === user && !n.read) && <i />}
          </button>
          <span className="top-divider" />
          <details className="account-menu">
            <summary aria-label={`Account: ${account.name}`}>
              <span className="account-avatar" aria-hidden="true">{accountInitials(account.name)}</span>
              <span className="account-display-name" title={account.email}>{account.name}</span>
              <ChevronDown size={14} />
            </summary>
            <div className="account-menu-panel">
              <strong>{account.name}</strong>
              <small>{account.email}</small>
              <ProfileImport />
              <button className="account-logout" onClick={() => void onLogout().catch(() => setToast("Could not leave your profile. Please try again."))}>Leave profile</button>
            </div>
          </details>
        </div>
      </header>
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <nav>
          {[...nav, ...(!demo && account.moderator ? [{ label: "Moderation", icon: ShieldCheck }] : [])].map(({ label, icon: Icon }) => (
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
            {dataMode === "live" ? "Live Supabase community" : "Local demo · Saved on this device"}
          </div>
        </div>
      </aside>
      <main>
        <div className="workspace-width" key={page}>
          {dataMode === "demo" && <div className="demo-identity-note">
            <span>
              <strong>Your example workspace</strong>
              {` · Welcome, ${account.name}. Try Alice’s sample skills, matches, and exchange. Changes stay in this demo.`}
            </span>
            <button className="button small-button" onClick={() => onModeChange(false)}>Open my live workspace <ArrowUpRight size={16} /></button>
            <label>View as
              <select aria-label="Fictional demo participant" value={user} onChange={(e) => setUser(e.target.value as Person)}>
                {["alice", "bob", "charlie", "david"].map((p) => <option key={p} value={p}>{people[p as Person].name}</option>)}
              </select>
            </label>
          </div>}
          {dataMode === "live" && state.starterAvailable && <div className="notice"><Sparkles size={20} /><div><p><strong>Your live workspace</strong> · Only published listings and community exchanges appear here. Demo examples are separate and do not count toward your matches.</p><button className="button small-button" onClick={() => onModeChange(true)}>Explore a demo</button></div></div>}
          {dataMode === "live" && !hasPublishedOffer && <div className="notice" role="status"><AlertTriangle size={20} /><div><p><strong>No active published offer yet.</strong> {publishedRequests.length === 1 ? `Your ${publishedRequests[0]} request is published. ` : publishedRequests.length ? "Your requests are published. " : ""}Add a skill you can offer to unlock exchange matching. Demo offers do not count.</p><button className="button small-button" onClick={() => add("offer")}>Add an offer</button></div></div>}
          {liveError && <div className="warning"><AlertTriangle size={18} /> {liveError}</div>}
          {storageError && (
            <div className="warning">
              <AlertTriangle size={18} />
              Browser storage is unavailable. Changes will last only until this
              page closes.
            </div>
          )}
          {page === "Home" ? (
            <>
              <SkillOrbit
                onExplore={openMatches}
                onAddSkills={() => add("offer")}
              />
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
                      {matches.slice(0, 2).map((legs) => (
                        <MatchCard
                          key={legs.map((l) => l.id).join("|")}
                          legs={legs}
                          user={user}
                          onClick={() => { setInitialReviewKey(legs.map((l) => l.id).join("|")); go("Discover matches"); }}
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
              {page !== "Discover matches" && <div className="page-heading">
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
              </div>}
              {page === "Discover matches" && (
                <>
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
                  <Discovery key={discoveryEpoch} state={state} user={user} matches={matches} query={query} initialReviewKey={initialReviewKey} onInitialReviewOpened={() => setInitialReviewKey(null)} onPropose={propose} onEditListings={() => go("My offers & needs")} />
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
                            <p className="muted">{matches.filter((route) => route.some((leg) => leg.offer === l.id || leg.need === l.id)).length} available matches · {l.status !== "Active" ? "Reactivate this listing to appear in discovery." : availableListing(state, l).sessions === 0 ? "All sessions are reserved by existing exchanges." : !state.listings.some((other) => other.user !== user && other.kind !== l.kind && other.skill === l.skill && other.status === "Active") ? "No active counterpart lists this skill yet." : "A reciprocal route is missing, or session terms, mode, location or availability do not align."}</p>
                            <div className="button-row listing-actions">
                              <button className="text-link" onClick={() => edit(l)}>Edit</button>
                              <button className="text-link" onClick={() => { if (dataMode === "live") void saveListing({ ...l, id: id(), status: "Paused" }, "Draft copy saved. Review and activate it when ready."); else { act({ type: "duplicateListing", id: l.id }); setToast("Draft copy created. Review and activate it when ready."); } }}>Duplicate</button>
                              <button className="text-link" onClick={() => {
                                const inUse = state.exchanges.some((e) => !["settled", "withdrawn", "defaulted", "declined", "cancelled", "expired"].includes(e.status) && e.legs.some((leg) => leg.offer === l.id || leg.need === l.id));
                                if (inUse && !window.confirm("This listing supports an active proposal or exchange. Pause it for new matches?")) return;
                                void changeListingStatus(l, l.status === "Active" ? "Paused" : "Active");
                              }}>{l.status === "Active" ? "Pause" : "Resume"}</button>
                              <button className="text-link" onClick={() => { void changeListingStatus(l, "Fulfilled"); }}>Mark fulfilled</button>
                              <button className="text-link" onClick={() => { void changeListingStatus(l, "Archived"); }}>Archive</button>
                              <button className="text-link" onClick={() => { const inUse = state.exchanges.some((e) => !["settled", "withdrawn", "defaulted", "declined", "cancelled", "expired"].includes(e.status) && e.legs.some((leg) => leg.offer === l.id || leg.need === l.id)); if (inUse) { setToast("This listing supports an active proposal or exchange. Archive it when the exchange is finished."); return; } if (window.confirm("Delete this listing? This cannot be undone.")) void changeListingStatus(l, "Deleted"); }}>Delete</button>
                            </div>
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
                <Community state={state} demo={demo} user={user} onReview={legs => { setInitialReviewKey(legs.map(l => l.id).join("|")); go("Discover matches"); }} onAdd={() => add("offer")} />
              )}
              {page === "Moderation" && !demo && account.moderator && <Moderation user={account.userId} />}
            </>
          )}
          <footer className="page-footer">
            <span className="small-brand-mark">◎</span> Good things come full
            circle.{" "}
            <button onClick={() => setModal("help")}>
              Learn about Skills-Ring <ArrowUpRight size={13} />
            </button>
            {dataMode === "demo" && <button className="demo-link" onClick={() => setModal("demo")}>
              Try a demo scenario
            </button>}
          </footer>
        </div>
      </main>
      {selectedExchange && (
        <Modal title="Exchange details" onClose={() => setSelected(null)} wide>
          <ExchangeDetails
            e={selectedExchange}
            state={state}
            user={user}
            dataMode={dataMode}
            act={act}
          />
        </Modal>
      )}
      {modal === "listing" && (
        <Modal
          title={editingListing ? "Edit your listing" : "Make a new connection possible"}
          onClose={() => setModal(null)}
        >
          <ListingForm
            key={editingListing?.id || `new-${listingKind}`}
            kind={listingKind}
            user={user}
            initial={editingListing}
            live={dataMode === "live"}
            catalog={dataMode === "live" && !editingListing?.id.startsWith("starter_") ? state.liveCatalog : undefined}
            onSave={saveListing}
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
                Profiles and live exchanges are saved in Supabase. The example
                workspace uses fictional participants and browser storage; dispute
                administration and completion bonds in the demo are simulated.
                There are no real payments, safeguarded funds, or transferable credits.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {modal === "demo" && (
        <Modal title="The Demo Studio" onClose={() => setModal(null)}>
          <p className="modal-intro">
            Take Skills-Ring for a spin. These stories use the same matching and
            service ledger. Starting a scenario replaces the current local demo
            data.
          </p>
          <div className="button-row">
            <button className="button" onClick={() => onModeChange(dataMode !== "demo")}>
              {dataMode === "demo" ? "Open my live workspace" : "Explore the example demo"}
            </button>
          </div>
          {dataMode === "demo" && <div className="scenario-list">
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
                  try { for (const key of Object.keys(localStorage)) if (key.startsWith("skills-ring-discovery-v1-")) localStorage.removeItem(key); } catch { /* Demo still runs when storage is unavailable. */ }
                  setDiscoveryEpoch((n) => n + 1);
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
          </div>}
          {dataMode === "demo" && state.listings.some((l) => l.status === "Pending review") && <section className="recovery-section"><h3>Demo skill review queue</h3><p>These fictional suggestions stay out of matching until reviewed. Production moderation requires P0 accounts and P2 moderator permissions.</p>{state.listings.filter((l) => l.status === "Pending review").map((l) => <div className="booking-card" key={l.id}><strong>{people[l.user].name}: {l.otherSkill}</strong><p>{l.kind} · {l.category}</p><div className="button-row"><button className="button" onClick={() => act({ type: "reviewListing", id: l.id, approved: true })}>Approve suggestion</button><button className="button" onClick={() => act({ type: "reviewListing", id: l.id, approved: false })}>Reject suggestion</button></div></div>)}</section>}
        </Modal>
      )}
      {modal === "notifications" && (
        <Modal title="Your updates" onClose={() => setModal(null)}>
          {(state.notifications || []).filter((n) => n.user === user).length ? (
            (state.notifications || []).filter((n) => n.user === user).slice().reverse().map((n) => (
              <button
                className="scenario"
                key={n.id}
                onClick={() => {
                  act({ type: "readNotifications", user });
                  setModal(null);
                  setSelected(n.exchange);
                }}
              >
                <ArrowLeftRight size={22} />
                <span>
                  <strong>{n.read ? "" : "New · "}{n.text}</strong>
                  <small>{new Date(n.createdAt).toLocaleString()}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <Empty
              title="You’re up to date"
              text="Proposal, message and session activity will appear here."
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
      <strong>
        <AnimatedValue value={value} />
      </strong>
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
      <SkillCover key={get.skill} skill={get.skill} />
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
      {legs.length > 2 && <div className="match-reason ring-summary">{legs.map((l) => `${name(l.provider)} gives ${l.skill} to ${name(l.receiver)}`).join(" · ")}</div>}
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
      <SkillCover key={get.skill} skill={get.skill} />
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
  initial,
  onSave,
  live = false,
  catalog,
}: {
  catalog?: Record<string, string[]>;
  live?: boolean;
  kind: Listing["kind"];
  user: Person;
  initial?: Listing | null;
  onSave: (l: Listing) => void | Promise<void>;
}) {
  const choices = catalog || library;
  const [saving, setSaving] = useState(false);
  const initialCategory = initial?.category && choices[initial.category] ? initial.category : Object.keys(choices)[0] || "";
  const [currentKind, setKind] = useState(kind),
    [category, setCategory] = useState(initialCategory),
    [skill, setSkill] = useState(initial?.skill && choices[initialCategory]?.includes(initial.skill) ? initial.skill : choices[initialCategory]?.[0] || "");
  return (
    <form
      className="listing-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (saving) return;
        const f = new FormData(e.currentTarget);
        setSaving(true);
        try { await onSave({
          id: initial?.id || id(),
          user,
          kind: initial?.kind || currentKind,
          category,
          skill,
          otherSkill: skill === "Other" ? (f.get("otherSkill") as string).trim() : undefined,
          duration: Number(f.get("duration")),
          sessions: Number(f.get("sessions")),
          mode: f.get("mode") as Listing["mode"],
          location: f.get("location") as string,
          availability: f.getAll("availability") as string[],
          level: Number(f.get("level")),
          conditions: (f.get("conditions") as string).trim(),
          dateFrom: (f.get("dateFrom") as string) || undefined,
          dateTo: (f.get("dateTo") as string) || undefined,
          status: initial?.status || "Active",
        }); } finally { setSaving(false); }
      }}
    >
      {!initial && <div className="segmented">
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
      </div>}
      <p>
        {live ? "Posting as" : "Demo only · posting as fictional participant"} <strong>{people[user].name}</strong>.
        Each offer and need has its own preferences.
      </p>
      <div className="form-grid">
        <label>
          Category
          <select
            value={category}
            onChange={(e) => { const next = e.target.value; setCategory(next); setSkill(choices[next][0]); }}
          >
            {Object.keys(choices).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          Skill
          <select name="skill" value={skill} onChange={(e) => setSkill(e.target.value)}>
            {(choices[category] || []).filter(s => !live || s !== "Other").map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        {skill === "Other" && <label>Specific skill suggestion<input name="otherSkill" list="skill-suggestions" defaultValue={initial?.otherSkill || ""} placeholder="Search or suggest a skill" required maxLength={80} /><datalist id="skill-suggestions"><option value="TypeScript" /><option value="Portrait photography" /><option value="Language exchange" /><option value="Yoga" /></datalist></label>}
        <label>
          Level
          <select
            name="level"
            defaultValue={initial?.level ?? (currentKind === "offer" ? "2" : "0")}
          >
            <option value="0">Beginner</option>
            <option value="1">Intermediate</option>
            <option value="2">Advanced</option>
          </select>
        </label>
        <label>
          Length per session
          <select name="duration" defaultValue={initial?.duration || 60}>
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
            defaultValue={initial?.sessions || 1}
            required
          />
        </label>
        <label>
          How we meet
          <select name="mode" defaultValue={initial?.mode || "Online"}>
            <option>Online</option>
            <option>Offline</option>
            <option>Either</option>
          </select>
        </label>
        <label>
          Location
          <input
            name="location"
            defaultValue={initial?.location || "Anywhere"}
            placeholder="City or agreed meeting place"
            maxLength={100}
            required
          />
        </label>
        <label>
          Availability
          <select name="availability" multiple size={5} defaultValue={initial?.availability || ["Saturday Afternoon"]}>
            {slots.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <small>Choose one or more slots (hold Command or Control for multiple).</small>
        </label>
        {!live && <><label>From date <span className="muted">(optional)</span><input name="dateFrom" type="date" defaultValue={initial?.dateFrom || ""} /></label>
        <label>Until date <span className="muted">(optional)</span><input name="dateTo" type="date" defaultValue={initial?.dateTo || ""} /></label></>}
      </div>
      <label>
        Conditions <span className="muted">(optional)</span>
        <input
          name="conditions"
          placeholder="For example: Bring your own racket"
          maxLength={180}
          defaultValue={initial?.conditions || ""}
        />
      </label>
      <small className="muted">
        Conditions must match exactly for automatic matching. Agree on exact session dates within an exchange.
      </small>
      <button className="button primary full-width" type="submit" disabled={saving || !category || !skill}>
        {saving ? "Saving and refreshing matches…" : initial ? "Save changes" : `Publish ${currentKind}`}
      </button>
    </form>
  );
}
function ExchangeDetails({
  e,
  state,
  user,
  dataMode,
  act,
}: {
  e: Exchange;
  state: State;
  user: Person;
  dataMode: "loading" | "live" | "demo" | "error";
  act: (a: Action) => boolean;
}) {
  const [tab, setTab] = useState("Overview"),
    [reason, setReason] = useState(""),
    [amendCount, setAmendCount] = useState("1"),
    [amendLeg, setAmendLeg] = useState(e.legs[0].id),
    [disputeReason, setDisputeReason] = useState(""),
    [declineReason, setDeclineReason] = useState(""),
    [revisionOpen, setRevisionOpen] = useState(false),
    [revisionLegs, setRevisionLegs] = useState(e.legs.map((l) => ({ ...l })));
  const revise = (legId: string, field: keyof Leg, value: string | number) => setRevisionLegs((legs) => legs.map((l) => l.id === legId ? { ...l, [field]: value } : l));
  const pending = e.amendments.find((a) => a.status === "pending");
  const sessions = state.sessions.filter((s) => s.exchange === e.id);
  const bonds = exchangeBonds(state, e.id);
  const bondLedger = (state.bondLedger || []).filter((entry) => entry.exchange === e.id).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
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
      <ExchangeJourney status={e.status} />
      <div className="tabs">
        {["Overview", "Bond protection", "Conversation & schedule", "Sessions & trust", "Changes & recovery", "Activity"].map(
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
          {e.status === "settled" && <SettlementMoment />}
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
                {canComplete && remaining(state, e, l) > 0 && (dataMode !== "live" || l.provider === user) && (
                  <button
                    className="button full-width"
                    disabled={!!pending || !!state.bookings?.some((b) => b.exchange === e.id && b.leg === l.id && b.status === "accepted" && Date.parse(b.start) > Date.now())}
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
              {e.expiresAt && <p>Proposal expires {new Date(e.expiresAt).toLocaleString()}.</p>}
              <p>One confirmation accepts the complete service route, the automatically calculated reference values, and the simulated refundable bonds shown under Bond protection.</p>
              <button className="button" onClick={() => { setRevisionLegs(e.legs.map((l) => ({ ...l }))); setRevisionOpen(!revisionOpen); }}>{revisionOpen ? "Close changes" : "Suggest changed terms"}</button>
              {revisionOpen && <div className="proposal-revision"><p>Updating any term clears prior confirmations. Every participant will review the full route again.</p>{revisionLegs.map((l) => <div className="review-leg" key={l.id}><strong>{name(l.provider)} gives {l.skill} to {name(l.receiver)}</strong><div className="review-fields"><label>Sessions<input type="number" min="1" max={state.listings.find((x) => x.id === l.need)?.sessions || l.sessions} value={l.sessions} onChange={(ev) => revise(l.id, "sessions", Number(ev.target.value))} /></label><label>Minutes<input type="number" min="15" max="180" step="15" value={l.duration} onChange={(ev) => revise(l.id, "duration", Number(ev.target.value))} /></label><label>Mode<select value={l.mode} onChange={(ev) => revise(l.id, "mode", ev.target.value)}><option>Online</option><option>Offline</option></select></label><label>Location<input value={l.location} onChange={(ev) => revise(l.id, "location", ev.target.value)} /></label><label>Availability<input value={l.availability} onChange={(ev) => revise(l.id, "availability", ev.target.value)} /></label></div></div>)}<button className="button primary" onClick={() => { if (act({ type: "reviseProposal", exchange: e.id, user, legs: revisionLegs })) setRevisionOpen(false); }}>Send changed proposal</button></div>}
              <p>
                {dataMode === "live"
                  ? "Each participant confirms from their own account."
                  : "Demo: each button simulates that participant’s explicit acceptance of the complete route and any quantity imbalance."}
              </p>
              {participants(e).map((p) => (
                <div className="confirmation-row" key={p}>
                  <Avatar user={p} />
                  <strong>{people[p].name}</strong>
                  <button
                    className={`button ${e.confirmations.includes(p) ? "" : "primary"}`}
                    disabled={e.confirmations.includes(p) || (dataMode === "live" && p !== user)}
                    onClick={() =>
                      act({ type: "confirm", exchange: e.id, user: dataMode === "live" ? user : p })
                    }
                  >
                    {e.confirmations.includes(p)
                      ? "Confirmed"
                      : dataMode === "live" && p !== user
                        ? `Waiting for ${name(p)}`
                        : `Confirm as ${name(p)}`}
                  </button>
                </div>
              ))}
              <label>Reason to decline<input value={declineReason} onChange={(ev) => setDeclineReason(ev.target.value)} placeholder="What does not work for you?" /></label>
              <div className="button-row"><button className="button" disabled={!declineReason.trim()} onClick={() => act({ type: "decline", exchange: e.id, user, reason: declineReason })}>Decline proposal</button><button className="button danger" onClick={() => act({ type: "cancelProposal", exchange: e.id, user })}>Cancel proposal</button></div>
            </section>
          )}
          {e.declineReason && <p className="notice amber">Proposal ended: {e.declineReason}. You can discover a compatible route and propose again.</p>}
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
            attestation. No service is independently verified. Bond amounts are
            simulated HKD; no real funds are collected or held.
          </p>
        </>
      )}
      {tab === "Bond protection" && (
        <section className="bond-panel">
          <div className="bond-panel-intro">
            <ShieldCheck size={24} />
            <div><h3>Refundable completion bonds</h3><p>Each promised service receives a platform-calculated reference value. The fixed percentage below limits non-performance exposure; it is not a price for the skill.</p></div>
          </div>
          {bonds.length ? <div className="bond-list">{bonds.map((bond) => { const leg = e.legs.find((candidate) => candidate.id === bond.leg); return <article className="bond-card" key={bond.id}>
            <div><span className="eyebrow">{bond.status}</span><h3>{name(bond.owner)} · {leg?.skill || "Original service"}</h3><p>{hkd(bond.reference_value)} reference value × {Math.round(bond.rate * 100)}%</p></div>
            <strong>{hkd(bond.amount)}</strong>
            <dl><div><dt>Returned</dt><dd>{hkd(bond.returned_amount)}</dd></div><div><dt>Applied</dt><dd>{hkd(bond.applied_amount)}</dd></div></dl>
          </article>; })}</div> : <Empty title="No simulated bond" text="This exchange predates completion bonds or has no calculated bond record." />}
          <div className="bond-ledger"><h3>Bond ledger</h3>{bondLedger.length ? bondLedger.map((entry) => <div key={entry.id} className="bond-ledger-row"><Badge tone={entry.event === "RETURNED" ? "green" : "yellow"}>{entry.event}</Badge><div><strong>{hkd(entry.amount)}</strong><p>{entry.reason}</p>{entry.recipient && <small>Recipient: {name(entry.recipient)}</small>}</div><time dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time></div>) : <p className="muted">No bond events yet.</p>}</div>
          <p className="simulation-note">Simulation only · No real funds are processed. A production version would require regulated custody or payment infrastructure and specialist review.</p>
        </section>
      )}
      {tab === "Conversation & schedule" && <Coordination e={e} state={state} user={user} act={act} />}
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
              {(dataMode === "demo" || [s.provider, s.receiver].includes(user)) && !state.disputes.some((d) => d.session === s.id) && (
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
                        user: dataMode === "live" ? user : s.receiver,
                        reason: disputeReason,
                      })
                    }
                  >
                    Raise as {name(dataMode === "live" ? user : s.receiver)}
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
                      {d.status === "Open" && dataMode === "live" ? <p>This exchange is on hold pending moderator review.</p> : d.status === "Open" ? (
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
                          {d.resolution_reason && <> Decision: {d.resolution_reason}. Reviewed by {d.resolved_by} on {d.resolved_at}.</>}
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
                  {(() => { const leg = e.legs.find((candidate) => candidate.id === pending.leg)!; const currentBond = bonds.find((bond) => bond.leg === leg.id && bond.owner === leg.provider && bond.status === "Held"); const quote = bondQuote(state, { ...leg, sessions: pending.after }); return currentBond ? <p>Simulated bond: {hkd(currentBond.amount)} → {hkd(quote.amount)}. Accepting this amendment also accepts the automatically recalculated bond.</p> : null; })()}
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
                        ["settled", "defaulted", "disputed", "declined", "cancelled", "expired"].includes(e.status)
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
                  disabled={dataMode === "live"}
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
    <AuthGate>{(account, logout) => <App key={account.userId} account={account} onLogout={logout} />}</AuthGate>
  </React.StrictMode>,
);
