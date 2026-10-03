export const library: Record<string, string[]> = {
  Programming: [
    "Python",
    "Java",
    "C++",
    "Web Development",
    "Mobile Development",
    "Other",
  ],
  Data: [
    "Excel",
    "SQL",
    "Data Analysis",
    "Data Visualization",
    "Machine Learning",
    "Other",
  ],
  Languages: ["English", "Chinese", "Japanese", "Korean", "Other"],
  Sports: ["Tennis", "Badminton", "Swimming", "Running", "Basketball", "Other"],
  Creative: [
    "Photography",
    "Graphic Design",
    "Video Editing",
    "Music Production",
    "Other",
  ],
  Academic: [
    "Mathematics",
    "Statistics",
    "Academic Writing",
    "Presentation",
    "Other",
  ],
  Career: [
    "Resume Review",
    "Interview Practice",
    "Career Advice",
    "Public Speaking",
    "Other",
  ],
  Productivity: ["Notion Setup", "Time Planning", "Slide Design", "Personal Budgeting", "Other"],
  "Daily Life": ["Cooking Basics", "Moving Help", "Grocery Planning", "Plant Care", "Basic Sewing", "Other"],
  Music: ["Guitar", "Piano", "Singing", "Other"],
};
export const slots = [
  "Weekday Morning",
  "Weekday Afternoon",
  "Weekday Evening",
  "Saturday Morning",
  "Saturday Afternoon",
  "Saturday Evening",
  "Sunday Morning",
  "Sunday Afternoon",
  "Sunday Evening",
];
export type Person = string;
export const demoPeople: Readonly<Record<Person, { name: string; initials: string; color: string }>> = Object.freeze({
  alice: { name: "Alice Chen", initials: "AC", color: "purple" },
  bob: { name: "Bob Wilson", initials: "BW", color: "orange" },
  charlie: { name: "Charlie Lee", initials: "CL", color: "blue" },
  david: { name: "David Park", initials: "DP", color: "pink" },
  maya: { name: "Maya Patel", initials: "MP", color: "green" },
  james: { name: "James Wong", initials: "JW", color: "yellow" },
});
export const people = { ...demoPeople };
const personColors = ["purple", "orange", "blue", "pink", "green", "yellow"];
export function registerPerson(userId: Person, displayName: string) {
  const initials = displayName.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "?";
  const color = personColors[Math.abs([...userId].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % personColors.length];
  people[userId] = { name: displayName || userId, initials, color };
  return people[userId];
}
export type Listing = {
  id: string;
  user: Person;
  kind: "offer" | "need";
  category: string;
  skill: string;
  duration: number;
  sessions: number;
  mode: "Online" | "Offline" | "Either";
  location: string;
  availability: string[];
  level: number;
  conditions: string;
  status: "Active" | "Paused" | "Archived" | "Fulfilled" | "Pending review" | "Rejected";
  otherSkill?: string;
  otherApproved?: boolean;
  dateFrom?: string;
  dateTo?: string;
};
export type Leg = {
  id: string;
  offer: string;
  need: string;
  provider: Person;
  receiver: Person;
  skill: string;
  duration: number;
  sessions: number;
  availability: string;
  mode: string;
  location: string;
  capacity: number;
  replaces?: string;
};
export type Status =
  | "proposed"
  | "confirmed"
  | "active"
  | "partially settled"
  | "settled"
  | "disputed"
  | "withdrawn"
  | "declined"
  | "cancelled"
  | "expired"
  | "defaulted";
export type Amendment = {
  id: string;
  leg: string;
  before: number;
  after: number;
  confirmations: Person[];
  status: "pending" | "applied";
};
export type Exchange = {
  id: string;
  title: string;
  legs: Leg[];
  confirmations: Person[];
  status: Status;
  audit: string[];
  amendments: Amendment[];
  createdAt?: string;
  expiresAt?: string;
  declineReason?: string;
  proposedTerms?: Partial<Record<Leg["id"], { sessions?: number; duration?: number; mode?: string; location?: string; availability?: string }>>;
  recovery?: {
    withdrawn: Person;
    replacement?: Person;
    leg?: Leg;
    confirmations: Person[];
    applied: boolean;
  };
};
export function proposalStatus(exchange: Pick<Exchange, "status" | "declineReason" | "recovery">): Status {
  if (exchange.status !== "withdrawn" || exchange.recovery || !exchange.declineReason) return exchange.status;
  return exchange.declineReason === "Cancelled by proposer" ? "cancelled" : exchange.declineReason === "Expired before everyone confirmed" ? "expired" : "declined";
}
export type Session = {
  id: string;
  exchange: string;
  leg: string;
  provider: Person;
  receiver: Person;
  skill: string;
  duration: number;
  actual_duration: number;
  scheduled_time: string;
  notes: string;
};
export type Contribution = {
  id: string;
  session: string;
  exchange: string;
  provider: Person;
  receiver: Person;
  skill: string;
  duration: number;
  created_at: string;
};
export type BondStatus = "Calculated" | "Held" | "Returned" | "Settled";
export type CompletionBond = {
  id: string;
  exchange: string;
  leg: string;
  owner: Person;
  currency: "HKD";
  reference_value: number;
  rate: number;
  amount: number;
  status: BondStatus;
  returned_amount: number;
  applied_amount: number;
  terms_version: string;
};
export type BondLedgerEntry = {
  id: string;
  bond: string;
  exchange: string;
  event: "CALCULATED" | "HELD" | "RETURNED" | "SETTLED";
  amount: number;
  recipient?: Person;
  reason: string;
  created_at: string;
};
export type Commitment = {
  id: string;
  exchange: string;
  leg: string;
  debtor: Person;
  beneficiary: Person;
  skill: string;
  duration: number;
  total_sessions: number;
  completed_sessions: number;
  remaining_sessions: number;
  status: "Proposed" | "Active" | "Fulfilled" | "Disputed" | "Defaulted";
};
export type Dispute = {
  id: string;
  exchange: string;
  session: string;
  raised_by: Person;
  reason: string;
  status: "Open" | "Resolved";
  resolution?: "Full release" | "Partial release" | "Default";
  released_minutes?: number;
  resolved_by?: Person;
  resolved_at?: string;
  resolution_reason?: string;
};
export type Evaluation = {
  session: string;
  on_time: boolean;
  completed_as_agreed: boolean;
  engaged: boolean;
  would_exchange_again: boolean;
  comment: string;
};
export type State = {
  liveCatalog?: Record<string, string[]>;
  starterAvailable?: boolean;
  version: 1;
  listings: Listing[];
  exchanges: Exchange[];
  sessions: Session[];
  contributions: Contribution[];
  bonds?: CompletionBond[];
  bondLedger?: BondLedgerEntry[];
  disputes: Dispute[];
  evaluations: Evaluation[];
  withdrawals: { exchange: string; user: Person; reason: string }[];
  messages?: { id: string; exchange: string; author: Person; text: string; createdAt: string }[];
  bookings?: { id: string; exchange: string; leg: string; start: string; timezone: string; place: string; status: "proposed" | "accepted" | "cancelled" | "completed" | "no-show"; acceptedBy: Person[]; reminded?: boolean }[];
  notifications?: { id: string; user: Person; exchange: string; text: string; createdAt: string; read: boolean }[];
  liveStats?: Record<string, { reliability: number; coldStart: boolean; services: number }>;
  liveMatches?: Record<Person, Leg[][]>;
  skillValueMultipliers?: Record<string, number>;
  referenceHourlyHkd?: number;
  completionBondRate?: number;
};
export const DEFAULT_REFERENCE_HOURLY_HKD = 200;
export const DEFAULT_COMPLETION_BOND_RATE = 0.2;
export const COMPLETION_BOND_TERMS_VERSION = "simulated-hkd-v1";
export const id = () => crypto.randomUUID();
export const name = (p: Person) => (people[p]?.name || p).split(" ")[0];
export const participants = (e: Exchange) => [
  ...new Set(e.legs.flatMap((l) => [l.provider, l.receiver])),
];
export const minutes = (n: number) =>
  n % 60 === 0 ? `${n / 60} hr` : `${n} min`;
const money = (amount: number) => Math.round((amount + Number.EPSILON) * 100) / 100;
export const hkd = (amount: number) => new Intl.NumberFormat("en-HK", {
  style: "currency",
  currency: "HKD",
  maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
}).format(amount);
export function bondQuote(state: State, leg: Leg) {
  const hourly = state.referenceHourlyHkd ?? DEFAULT_REFERENCE_HOURLY_HKD;
  const rate = state.completionBondRate ?? DEFAULT_COMPLETION_BOND_RATE;
  const multiplier = state.skillValueMultipliers?.[leg.skill] ?? 1;
  const referenceValue = money(hourly * multiplier * (leg.duration / 60) * leg.sessions);
  return {
    referenceValue,
    rate,
    amount: money(referenceValue * rate),
    multiplier,
    termsVersion: COMPLETION_BOND_TERMS_VERSION,
  };
}
export const exchangeBonds = (state: State, exchange: string) =>
  (state.bonds || []).filter((bond) => bond.exchange === exchange);

function recordBondEvent(state: State, bond: CompletionBond, event: BondLedgerEntry["event"], amount: number, reason: string, recipient?: Person) {
  state.bondLedger!.push({
    id: id(), bond: bond.id, exchange: bond.exchange, event, amount: money(amount),
    ...(recipient ? { recipient } : {}), reason, created_at: new Date().toISOString(),
  });
}
function calculateBonds(state: State, exchange: Exchange) {
  state.bonds ??= [];
  state.bondLedger ??= [];
  for (const leg of exchange.legs) {
    const current = exchangeBonds(state, exchange.id).find((bond) => bond.leg === leg.id && bond.owner === leg.provider && bond.status === "Calculated");
    const active = exchangeBonds(state, exchange.id).find((bond) => bond.leg === leg.id && bond.owner === leg.provider && bond.status === "Held");
    if (active) continue;
    const quote = bondQuote(state, leg);
    const bond: CompletionBond = {
      id: current?.id || `bond:${exchange.id}:${leg.id}:${leg.provider}`.slice(0, 240),
      exchange: exchange.id,
      leg: leg.id,
      owner: leg.provider,
      currency: "HKD",
      reference_value: quote.referenceValue,
      rate: quote.rate,
      amount: quote.amount,
      status: "Calculated",
      returned_amount: 0,
      applied_amount: 0,
      terms_version: quote.termsVersion,
    };
    if (current) state.bonds[state.bonds.indexOf(current)] = bond;
    else state.bonds.push(bond);
    state.bondLedger = state.bondLedger.filter((entry) => !(entry.bond === bond.id && entry.event === "CALCULATED"));
    recordBondEvent(state, bond, "CALCULATED", bond.amount, `Automatically calculated from ${hkd(bond.reference_value)} simulated service reference value at ${Math.round(bond.rate * 100)}%.`);
  }
}
function repriceHeldBond(state: State, exchange: Exchange, leg: Leg) {
  const bond = exchangeBonds(state, exchange.id).find((candidate) => candidate.leg === leg.id && candidate.owner === leg.provider && candidate.status === "Held");
  if (!bond) return;
  const quote = bondQuote(state, leg);
  if (bond.reference_value === quote.referenceValue && bond.amount === quote.amount) return;
  const before = bond.amount;
  bond.reference_value = quote.referenceValue;
  bond.rate = quote.rate;
  bond.amount = quote.amount;
  bond.terms_version = quote.termsVersion;
  recordBondEvent(state, bond, "HELD", money(quote.amount - before), `All participants accepted the amendment; the simulated bond changed from ${hkd(before)} to ${hkd(quote.amount)}.`);
}
function holdCalculatedBonds(state: State, exchange: Exchange) {
  for (const bond of exchangeBonds(state, exchange.id)) {
    if (bond.status !== "Calculated") continue;
    bond.status = "Held";
    recordBondEvent(state, bond, "HELD", bond.amount, "All participants confirmed the service terms and the simulated completion bond.");
  }
}
function returnBond(state: State, bond: CompletionBond, reason: string) {
  if (bond.status !== "Held") return;
  bond.status = "Returned";
  bond.returned_amount = bond.amount;
  recordBondEvent(state, bond, "RETURNED", bond.amount, reason, bond.owner);
}
function settleBond(state: State, bond: CompletionBond, appliedAmount: number, reason: string, recipient?: Person) {
  if (bond.status !== "Held") return;
  bond.status = "Settled";
  bond.applied_amount = money(Math.min(bond.amount, Math.max(0, appliedAmount)));
  bond.returned_amount = money(bond.amount - bond.applied_amount);
  recordBondEvent(state, bond, "SETTLED", bond.applied_amount, reason, recipient);
}
function reconcileBonds(state: State, exchange: Exchange, responsible?: Person) {
  const bonds = exchangeBonds(state, exchange.id);
  if (exchange.status === "settled") {
    for (const bond of bonds) {
      if (exchange.recovery?.applied && exchange.recovery.withdrawn === bond.owner)
        settleBond(state, bond, 0, "Accepted replacement completed the original obligation; no additional replacement cost was recorded.", exchange.recovery.replacement);
      else returnBond(state, bond, "The promised contribution was completed and the exchange settled.");
    }
    return;
  }
  if (exchange.status === "withdrawn") {
    for (const bond of bonds) {
      const leg = exchange.legs.find((candidate) => candidate.id === bond.leg);
      if (leg && remaining(state, exchange, leg) === 0)
        returnBond(state, bond, "The owner completed the promised contribution before the exchange was withdrawn.");
    }
    return;
  }
  if (exchange.status === "defaulted") {
    const unsettled = state.contributions.filter((contribution) => contribution.exchange === exchange.id && !contributionSettled(state, contribution));
    const withdrawn = responsible || exchange.recovery?.withdrawn;
    for (const bond of bonds) {
      if (bond.owner !== withdrawn) {
        returnBond(state, bond, "This participant was not responsible for the unresolved withdrawal.");
        continue;
      }
      const recipient = unsettled.find((contribution) => contribution.provider !== withdrawn)?.provider;
      settleBond(state, bond, recipient ? bond.amount : 0, recipient ? "No accepted replacement was found; the simulated bond was allocated to an affected contributor." : "No completed contribution was exposed, so the simulated bond was returned.", recipient);
    }
  }
}
export function compatible(o: Listing, n: Listing) {
  return (
    o.kind === "offer" &&
    n.kind === "need" &&
    o.user !== n.user &&
    o.status === "Active" &&
    n.status === "Active" &&
    n.sessions > 0 &&
    o.skill === n.skill &&
    (o.skill !== "Other" || (!!o.otherSkill?.trim() && o.otherSkill.trim().toLowerCase() === n.otherSkill?.trim().toLowerCase())) &&
    o.category === n.category &&
    o.duration === n.duration &&
    o.sessions >= n.sessions &&
    o.level >= n.level &&
    (o.mode === n.mode || o.mode === "Either" || n.mode === "Either") &&
    (o.mode === "Online" ||
      n.mode === "Online" ||
      o.location === n.location ||
      o.location === "Anywhere" ||
      n.location === "Anywhere") &&
    o.availability.some((s) => n.availability.includes(s)) &&
    (!o.dateTo || !n.dateFrom || o.dateTo >= n.dateFrom) &&
    (!n.dateTo || !o.dateFrom || n.dateTo >= o.dateFrom) &&
    (!n.conditions || n.conditions === o.conditions) &&
    (!o.conditions || n.conditions === o.conditions)
  );
}
export function matchLeg(o: Listing, n: Listing): Leg {
  return {
    id: `${o.id}:${n.id}`,
    offer: o.id,
    need: n.id,
    provider: o.user,
    receiver: n.user,
    skill: o.skill,
    duration: n.duration,
    sessions: n.sessions,
    availability: o.availability.find((s) => n.availability.includes(s))!,
    mode: o.mode === "Either" ? n.mode : o.mode,
    location: o.location,
    capacity: o.sessions,
  };
}
export function availableListing(state: State, listing: Listing): Listing {
  const reserved = state.exchanges.reduce(
    (total, e) =>
      total +
      e.legs
        .filter((l) =>
          listing.kind === "offer"
            ? l.offer === listing.id
            : l.need === listing.id,
        )
        .reduce((n, l) => {
          // A withdrawn proposal reserves nothing; performed or agreed services keep their allocation.
          if (
            ["withdrawn", "declined", "cancelled", "expired"].includes(e.status) &&
            !state.sessions.some((s) => s.exchange === e.id)
          )
            return n;
          return n + l.sessions;
        }, 0),
    0,
  );
  return { ...listing, sessions: Math.max(0, listing.sessions - reserved) };
}
export function findMatches(state: State, user: Person): Leg[][] {
  if (state.liveMatches) {
    return (state.liveMatches[user] || []).filter((route) =>
      !state.exchanges.some((exchange) =>
        !["withdrawn", "defaulted", "declined", "cancelled", "expired"].includes(exchange.status) &&
        route.every((leg) => exchange.legs.some((existing) => existing.id === leg.id)),
      ),
    );
  }
  const listings = state.listings
    .map((l) => availableListing(state, l))
    .filter((l) => l.sessions > 0);
  const edges = listings
    .filter((l) => l.kind === "offer")
    .flatMap((o) =>
      listings.filter((n) => compatible(o, n)).map((n) => matchLeg(o, n)),
    );
  const results: Leg[][] = [];
  function visit(at: Person, path: Leg[], visited: Person[]) {
    for (const leg of edges.filter((e) => e.provider === at)) {
      if (leg.receiver === user && path.length >= 1)
        results.push([...path, leg]);
      else if (path.length < 3 && !visited.includes(leg.receiver))
        visit(leg.receiver, [...path, leg], [...visited, leg.receiver]);
    }
  }
  visit(user, [], [user]);
  return results
    .filter(
      (route) =>
        !state.exchanges.some(
          (e) =>
            e.status !== "defaulted" &&
            !["withdrawn", "declined", "cancelled", "expired"].includes(e.status) &&
            route.every((l) => e.legs.some((el) => el.id === l.id)),
        ),
    )
    .sort((a, b) => a.length - b.length);
}
export const imbalance = (legs: Leg[], threshold = 0.25) => {
  const totals = legs.map((l) => l.duration * l.sessions);
  return (
    Math.max(...totals) / Math.min(...totals) - 1 > threshold ||
    new Set(legs.map((l) => l.sessions)).size > 1
  );
};
export function done(state: State, exchange: string, leg: string) {
  return state.sessions
    .filter((s) => s.exchange === exchange && s.leg === leg)
    .reduce((sum, s) => {
      const d = state.disputes.find(
        (d) => d.session === s.id && d.status === "Resolved",
      );
      return sum + (d?.released_minutes ?? s.actual_duration);
    }, 0);
}
export function remaining(state: State, e: Exchange, l: Leg) {
  return Math.max(0, l.sessions * l.duration - done(state, e.id, l.id));
}
export function commitments(state: State): Commitment[] {
  return state.exchanges
    .filter((e) => e.status !== "proposed")
    .flatMap((e) =>
      e.legs.map((l) => {
        const received = state.sessions.some(
          (s) => s.exchange === e.id && s.receiver === l.provider,
        );
        const rem = remaining(state, e, l);
        return {
          id: `${e.id}:${l.id}`,
          exchange: e.id,
          leg: l.id,
          debtor: l.provider,
          beneficiary: l.receiver,
          skill: l.skill,
          duration: l.duration,
          total_sessions: l.sessions,
          completed_sessions: done(state, e.id, l.id) / l.duration,
          remaining_sessions: rem / l.duration,
          status: (rem === 0
            ? "Fulfilled"
            : e.status === "defaulted" && received
              ? "Defaulted"
              : e.status === "disputed"
                ? "Disputed"
                : received
                  ? "Active"
                  : "Proposed") as Commitment["status"],
        };
      }),
    );
}
export function outstanding(state: State, user: Person) {
  return commitments(state).filter(
    (c) =>
      c.debtor === user &&
      ["Active", "Defaulted", "Disputed"].includes(c.status) &&
      c.remaining_sessions > 0,
  );
}
export function contributionSettled(state: State, c: Contribution) {
  const e = state.exchanges.find((e) => e.id === c.exchange)!;
  return (
    e.status !== "disputed" &&
    e.legs
      .filter((l) => l.receiver === c.provider)
      .every((l) => remaining(state, e, l) === 0)
  );
}
function refresh(state: State, e: Exchange) {
  if (["disputed", "withdrawn", "defaulted", "proposed", "declined", "cancelled", "expired"].includes(e.status))
    return;
  const amounts = e.legs.map((l) => remaining(state, e, l));
  e.status = amounts.every((x) => x === 0)
    ? "settled"
    : state.sessions.some((s) => s.exchange === e.id)
      ? amounts.some((x, i) => x < e.legs[i].duration * e.legs[i].sessions) &&
        e.legs.filter((l) => done(state, e.id, l.id) > 0).length > 1
        ? "partially settled"
        : "active"
      : "confirmed";
}
export type Action =
  | { type: "listing"; listing: Listing }
  | { type: "editListing"; listing: Listing }
  | { type: "duplicateListing"; id: string }
  | { type: "setListingStatus"; id: string; status: Listing["status"] | "Deleted" }
  | { type: "reviewListing"; id: string; approved: boolean }
  | { type: "pause"; id: string }
  | { type: "propose"; legs: Leg[] }
  | { type: "decline"; exchange: string; user: Person; reason: string }
  | { type: "cancelProposal"; exchange: string; user: Person }
  | { type: "reviseProposal"; exchange: string; user: Person; legs: Leg[] }
  | { type: "expireProposal"; exchange: string }
  | { type: "message"; exchange: string; user: Person; text: string }
  | { type: "booking"; exchange: string; leg: string; user: Person; start: string; timezone: string; place: string }
  | { type: "acceptBooking"; exchange: string; booking: string; user: Person }
  | { type: "cancelBooking"; exchange: string; booking: string; user: Person }
  | { type: "noShow"; exchange: string; booking: string; user: Person }
  | { type: "remindBooking"; exchange: string; booking: string }
  | { type: "readNotifications"; user: Person }
  | { type: "confirm"; exchange: string; user: Person }
  | { type: "complete"; exchange: string; leg: string; booking?: string; notes?: string }
  | { type: "withdraw"; exchange: string; user: Person; reason: string }
  | { type: "replacement"; exchange: string; user: Person }
  | { type: "reconfirm"; exchange: string; user: Person }
  | { type: "default"; exchange: string }
  | { type: "amend"; exchange: string; leg: string; sessions: number }
  | { type: "confirmAmend"; exchange: string; user: Person }
  | { type: "dispute"; session: string; user: Person; reason: string }
  | {
      type: "resolve";
      dispute: string;
      resolution: "Full release" | "Partial release" | "Default";
      moderator?: Person;
      reason?: string;
    }
  | { type: "evaluate"; evaluation: Evaluation };
export function transition(input: State, action: Action): State {
  const state = structuredClone(input);
  state.messages ??= [];
  state.bookings ??= [];
  state.notifications ??= [];
  state.bonds ??= [];
  state.bondLedger ??= [];
  const notify = (users: Person[], exchange: string, text: string) => {
    for (const user of users) state.notifications!.push({ id: id(), user, exchange, text, createdAt: new Date().toISOString(), read: false });
  };
  if (action.type === "readNotifications") {
    state.notifications.filter((n) => n.user === action.user).forEach((n) => { n.read = true; });
    return state;
  }
  if (action.type === "editListing" || action.type === "duplicateListing") {
    const original = state.listings.find((l) => l.id === (action.type === "editListing" ? action.listing.id : action.id));
    if (!original) throw Error("Listing not found.");
    if (action.type === "duplicateListing") {
      state.listings.push({ ...original, id: id(), status: "Paused" });
      return state;
    }
    const reserved = original.sessions - availableListing(state, original).sessions;
    if (action.listing.user !== original.user || action.listing.kind !== original.kind || action.listing.sessions < reserved || (reserved > 0 && (action.listing.skill !== original.skill || action.listing.duration !== original.duration)))
      throw Error("Keep reserved sessions and their service terms; create a new listing for a different skill.");
    if (!action.listing.availability.length || (action.listing.skill === "Other" && !action.listing.otherSkill?.trim()) || (action.listing.dateFrom && action.listing.dateTo && action.listing.dateFrom > action.listing.dateTo)) throw Error("Choose availability, a specific skill and a valid date range.");
    state.listings[state.listings.indexOf(original)] = action.listing.skill === "Other" && (!original.otherApproved || original.otherSkill !== action.listing.otherSkill) ? { ...action.listing, otherApproved: false, status: "Pending review" } : action.listing;
    return state;
  }
  if (action.type === "reviewListing") {
    const listing = state.listings.find((l) => l.id === action.id);
    if (!listing || listing.skill !== "Other" || listing.status !== "Pending review") throw Error("No skill suggestion is waiting for review.");
    listing.otherApproved = action.approved;
    listing.status = action.approved ? "Active" : "Rejected";
    return state;
  }
  if (action.type === "setListingStatus") {
    const listing = state.listings.find((l) => l.id === action.id);
    if (!listing) throw Error("Listing not found.");
    const involved = state.exchanges.some((e) => !["settled", "defaulted", "withdrawn", "declined", "cancelled", "expired"].includes(e.status) && e.legs.some((l) => l.offer === listing.id || l.need === listing.id));
    if (action.status === "Deleted" && involved) throw Error("This listing supports an active proposal or exchange. Archive it instead.");
    if (action.status === "Active" && listing.skill === "Other" && !listing.otherApproved) throw Error("This skill suggestion needs review before matching.");
    if (action.status === "Deleted") state.listings = state.listings.filter((l) => l.id !== listing.id);
    else listing.status = action.status;
    return state;
  }
  if (action.type === "listing") {
    const l = action.listing;
    if (
      !library[l.category]?.includes(l.skill) ||
      l.sessions < 1 ||
      !Number.isInteger(l.sessions) ||
      l.duration <= 0 ||
      !l.availability.length ||
      (l.skill === "Other" && !l.otherSkill?.trim()) ||
      (!!l.dateFrom && !!l.dateTo && l.dateFrom > l.dateTo)
    )
      throw Error(
        "Choose a skill, session length, capacity, and availability.",
      );
    state.listings.push(l.skill === "Other" ? { ...l, otherApproved: false, status: "Pending review" } : l);
    return state;
  }
  if (action.type === "pause") {
    const l = state.listings.find((l) => l.id === action.id)!;
    l.status = l.status === "Active" ? "Paused" : "Active";
    return state;
  }
  if (action.type === "propose") {
    if (
      action.legs.length < 2 ||
      !action.legs.every(
        (l, i) =>
          l.receiver === action.legs[(i + 1) % action.legs.length].provider,
      )
    )
      throw Error("The route must form a complete cycle.");
    const rankedRoute = state.liveMatches && Object.values(state.liveMatches).some((routes) =>
      routes.some((route) => route.length === action.legs.length &&
        route.every((leg) => action.legs.some((candidate) => candidate.id === leg.id))));
    if (state.liveMatches && !rankedRoute) throw Error("This match is no longer available.");
    if (
      !action.legs.every((l) => {
        const o = state.listings.find((x) => x.id === l.offer),
          n = state.listings.find((x) => x.id === l.need);
        return (
          o &&
          n &&
          (rankedRoute
            ? o.status === "Active" && n.status === "Active" &&
              availableListing(state, o).sessions >= n.sessions && o.skill === n.skill
            : compatible(availableListing(state, o), availableListing(state, n))) &&
          Number.isInteger(l.sessions) && l.sessions >= 1 && l.sessions <= availableListing(state, n).sessions &&
          Number.isInteger(l.duration) && l.duration >= 15 && l.duration <= 180 &&
          ["Online", "Offline"].includes(l.mode) &&
          !!l.availability.trim() && !!l.location.trim() &&
          l.provider === o.user &&
          l.receiver === n.user &&
          l.skill === o.skill
        );
      })
    )
      throw Error("This route is no longer compatible.");
    if (
      state.exchanges.some(
        (e) =>
          !["withdrawn", "defaulted", "declined", "cancelled", "expired"].includes(e.status) &&
          action.legs.every((l) => e.legs.some((x) => x.id === l.id)),
      )
    )
      throw Error("This exchange already exists.");
    state.exchanges.push({
      id: id(),
      title: action.legs.map((l) => l.skill).join(" & "),
      legs: action.legs,
      confirmations: [],
      status: "proposed",
      audit: ["Exchange proposed. All participants must confirm."],
      amendments: [],
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    });
    calculateBonds(state, state.exchanges.at(-1)!);
    notify([...new Set(action.legs.map((l) => l.receiver))], state.exchanges.at(-1)!.id, "A new exchange proposal and its simulated completion bonds need your review.");
    return state;
  }
  if (action.type === "evaluate") {
    if (!state.sessions.some((s) => s.id === action.evaluation.session))
      throw Error("Session not found.");
    state.evaluations = state.evaluations.filter(
      (e) => e.session !== action.evaluation.session,
    );
    state.evaluations.push(action.evaluation);
    return state;
  }
  if (action.type === "dispute") {
    const session = state.sessions.find((s) => s.id === action.session)!;
    if (
      !session ||
      ![session.provider, session.receiver].includes(action.user) ||
      !action.reason.trim()
    )
      throw Error("A participant and reason are required.");
    if (state.disputes.some((d) => d.session === session.id))
      throw Error("This session already has a dispute record.");
    state.disputes.push({
      id: id(),
      exchange: session.exchange,
      session: session.id,
      raised_by: action.user,
      reason: action.reason,
      status: "Open",
    });
    const e = state.exchanges.find((e) => e.id === session.exchange)!;
    e.status = "disputed";
    e.audit.push(
      `${name(action.user)} disputed ${session.skill}: ${action.reason}. Settlement on hold.`,
    );
    return state;
  }
  if (action.type === "resolve") {
    const d = state.disputes.find((d) => d.id === action.dispute)!;
    if (!d || d.status !== "Open") throw Error("Dispute already resolved or unavailable.");
    if (!["Full release", "Partial release", "Default"].includes(action.resolution)) throw Error("Choose a valid resolution.");
    const s = state.sessions.find((s) => s.id === d.session)!;
    d.status = "Resolved";
    d.resolution = action.resolution;
    d.resolved_by = action.moderator;
    d.resolved_at = new Date().toISOString();
    d.resolution_reason = action.reason?.trim();
    d.released_minutes =
      action.resolution === "Full release"
        ? s.actual_duration
        : action.resolution === "Partial release"
          ? s.actual_duration / 2
          : 0;
    const e = state.exchanges.find((e) => e.id === d.exchange)!;
    e.status = state.disputes.some(x => x.exchange === e.id && x.status === "Open")
      ? "disputed"
      : state.disputes.some(x => x.exchange === e.id && x.resolution === "Default") ? "defaulted" : "active";
    e.audit.push(
      `Recorded resolution: ${action.resolution}; ${d.released_minutes} min released.${action.moderator ? ` Moderator ${action.moderator}: ${d.resolution_reason}.` : ""} Original contribution preserved.`,
    );
    notify(participants(e), e.id, `Dispute resolved: ${action.resolution}. ${d.resolution_reason || "Review the session decision."}`);
    refresh(state, e);
    reconcileBonds(state, e, action.resolution === "Default" ? s.provider : undefined);
    return state;
  }
  const e = state.exchanges.find((e) => e.id === action.exchange);
  if (!e) throw Error("Exchange not found.");
  if (action.type === "expireProposal") {
    if (e.status !== "proposed" || !e.expiresAt || Date.parse(e.expiresAt) > Date.now()) throw Error("This proposal has not expired.");
    e.status = "expired";
    e.declineReason = "Expired before everyone confirmed";
    e.audit.push("Proposal expired; reserved capacity released. A fresh proposal needs new consent.");
    notify(participants(e), e.id, "An exchange proposal expired before everyone confirmed.");
    return state;
  }
  if (action.type === "reviseProposal") {
    if (e.status !== "proposed" || !participants(e).includes(action.user) || action.legs.length !== e.legs.length || !action.legs.every((l) => e.legs.some((old) => old.id === l.id && old.provider === l.provider && old.receiver === l.receiver && old.skill === l.skill))) throw Error("The proposal route has changed. Find a new match instead.");
    for (const leg of action.legs) {
      const offer = state.listings.find((l) => l.id === leg.offer);
      const need = state.listings.find((l) => l.id === leg.need);
      if (!offer || !need || !compatible(offer, need) || !Number.isInteger(leg.sessions) || leg.sessions < 1 || leg.sessions > Math.min(offer.sessions, need.sessions) || !Number.isInteger(leg.duration) || leg.duration < 15 || leg.duration > 180 || !["Online", "Offline"].includes(leg.mode) || !leg.location.trim() || !leg.availability.trim()) throw Error("Review the changed session terms and listing capacity.");
    }
    e.legs = action.legs;
    e.confirmations = [];
    calculateBonds(state, e);
    e.expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    e.audit.push(`${name(action.user)} revised the proposed terms. Everyone must confirm again.`);
    notify(participants(e).filter((p) => p !== action.user), e.id, `${name(action.user)} changed the proposal. Review and confirm the new terms.`);
    return state;
  }
  if (action.type === "decline" || action.type === "cancelProposal") {
    if (e.status !== "proposed" || !participants(e).includes(action.user)) throw Error("This proposal is no longer open.");
    if (action.type === "decline" && !action.reason.trim()) throw Error("Please give a reason.");
    e.status = action.type === "decline" ? "declined" : "cancelled";
    e.declineReason = action.type === "decline" ? action.reason.trim() : "Cancelled by proposer";
    e.audit.push(`${name(action.user)} ${action.type === "decline" ? "declined" : "cancelled"} the proposal: ${e.declineReason}.`);
    notify(participants(e).filter((p) => p !== action.user), e.id, `Proposal ${action.type === "decline" ? "declined" : "cancelled"} by ${name(action.user)}.`);
    return state;
  }
  if (action.type === "message") {
    if (!participants(e).includes(action.user) || !action.text.trim() || action.text.length > 1000) throw Error("Enter a message of up to 1,000 characters.");
    if (e.status === "proposed" && /(?:\+?\d[\d\s-]{7,}|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|https?:\/\/|www\.|\b\d{1,5}\s+\w+(?:\s+\w+){0,3}\s+(?:street|st|road|rd|avenue|ave)\b)/i.test(action.text)) throw Error("Keep contact details private until everyone has confirmed.");
    state.messages.push({ id: id(), exchange: e.id, author: action.user, text: action.text.trim(), createdAt: new Date().toISOString() });
    notify(participants(e).filter((p) => p !== action.user), e.id, `${name(action.user)} sent a message.`);
    return state;
  }
  if (action.type === "booking") {
    const leg = e.legs.find((l) => l.id === action.leg);
    if (!leg || ![leg.provider, leg.receiver].includes(action.user) || !["confirmed", "active", "partially settled"].includes(e.status) || !Number.isFinite(Date.parse(action.start)) || Date.parse(action.start) <= Date.now()) throw Error("Choose a future session time for an agreed exchange.");
    state.bookings.push({ id: id(), exchange: e.id, leg: leg.id, start: action.start, timezone: action.timezone, place: action.place.trim(), status: "proposed", acceptedBy: [action.user] });
    notify([leg.provider, leg.receiver].filter((p) => p !== action.user), e.id, `${name(action.user)} proposed a session time.`);
    return state;
  }
  if (action.type === "acceptBooking" || action.type === "cancelBooking") {
    const booking = state.bookings.find((b) => b.id === action.booking && b.exchange === e.id);
    const leg = e.legs.find((l) => l.id === booking?.leg);
    if (!booking || !leg || ![leg.provider, leg.receiver].includes(action.user) || !["proposed", "accepted"].includes(booking.status)) throw Error("This session time is no longer available.");
    if (action.type === "cancelBooking") booking.status = "cancelled";
    else {
      if (!booking.acceptedBy.includes(action.user)) booking.acceptedBy.push(action.user);
      if ([leg.provider, leg.receiver].every((p) => booking.acceptedBy.includes(p))) booking.status = "accepted";
    }
    notify([leg.provider, leg.receiver].filter((p) => p !== action.user), e.id, `Session time ${action.type === "cancelBooking" ? "cancelled" : "accepted"} by ${name(action.user)}.`);
    return state;
  }
  if (action.type === "noShow") {
    const booking = state.bookings.find((b) => b.id === action.booking && b.exchange === e.id);
    const leg = e.legs.find((l) => l.id === booking?.leg);
    if (!booking || !leg || ![leg.provider, leg.receiver].includes(action.user) || booking.status !== "accepted" || Date.now() < Date.parse(booking.start) + 15 * 60000) throw Error("No-show reports open 15 minutes after an accepted session time.");
    booking.status = "no-show";
    e.audit.push(`${name(action.user)} reported a no-show for ${leg.skill}. This is a participant report, not an independent finding.`);
    notify([leg.provider, leg.receiver].filter((p) => p !== action.user), e.id, `${name(action.user)} reported a no-show.`);
    return state;
  }
  if (action.type === "remindBooking") {
    const booking = state.bookings.find((b) => b.id === action.booking && b.exchange === e.id);
    const leg = e.legs.find((l) => l.id === booking?.leg);
    if (!booking || !leg || booking.status !== "accepted" || booking.reminded || Date.parse(booking.start) - Date.now() > 86400000 || Date.parse(booking.start) < Date.now()) throw Error("No session reminder is due.");
    booking.reminded = true;
    notify([leg.provider, leg.receiver], e.id, `${leg.skill} session starts within 24 hours. Check the agreed time and place.`);
    return state;
  }
  if (action.type === "confirm") {
    if (e.status !== "proposed" || !participants(e).includes(action.user))
      throw Error("Confirmation is unavailable.");
    if (e.expiresAt && Date.parse(e.expiresAt) < Date.now()) throw Error("This proposal expired. Find the match again to re-propose.");
    if (!e.confirmations.includes(action.user))
      e.confirmations.push(action.user);
    e.audit.push(
      `${name(action.user)} explicitly confirmed all terms${imbalance(e.legs) ? " and the potential imbalance" : ""}.`,
    );
    if (participants(e).every((u) => e.confirmations.includes(u))) {
      e.status = "confirmed";
      holdCalculatedBonds(state, e);
      e.audit.push("All simulated completion bonds are held. No real funds were processed.");
    }
    notify(participants(e).filter((p) => p !== action.user), e.id, `${name(action.user)} confirmed the exchange.`);
  }
  if (action.type === "complete") {
    if (!["confirmed", "active", "partially settled"].includes(e.status))
      throw Error(
        "All participants must confirm; held exchanges cannot settle.",
      );
    if (e.amendments.some((a) => a.status === "pending"))
      throw Error("Confirm the pending amendment first.");
    const l = e.legs.find((l) => l.id === action.leg)!;
    const acceptedBookings = state.bookings!.filter((b) => b.exchange === e.id && b.leg === l.id && b.status === "accepted");
    const booked = action.booking ? acceptedBookings.find((b) => b.id === action.booking) : acceptedBookings[0];
    if (action.booking && !booked) throw Error("Select an accepted session time.");
    if (booked && Date.parse(booked.start) > Date.now()) throw Error("Record this session after its agreed start time.");
    const rem = remaining(state, e, l);
    if (rem <= 0) throw Error("This service is already fulfilled.");
    const blocked = outstanding(state, l.receiver).filter(
      (c) => c.exchange !== e.id,
    );
    const owesHere = e.legs.some(
      (x) => x.provider === l.receiver && remaining(state, e, x) > 0,
    );
    if (blocked.length && owesHere)
      throw Error(
        `${name(l.receiver)} must fulfil ${blocked[0].skill} for ${name(blocked[0].beneficiary)} before receiving first again.`,
      );
    const actual = Math.min(l.duration, rem),
      sid = id();
    state.sessions.push({
      id: sid,
      exchange: e.id,
      leg: l.id,
      provider: l.provider,
      receiver: l.receiver,
      skill: l.skill,
      duration: l.duration,
      actual_duration: actual,
      scheduled_time: booked?.start || l.availability,
      notes: action.notes || "Completion recorded in the local demo.",
    });
    state.contributions.push({
      id: id(),
      session: sid,
      exchange: e.id,
      provider: l.provider,
      receiver: l.receiver,
      skill: l.skill,
      duration: actual,
      created_at: new Date().toISOString(),
    });
    e.audit.push(
      `${name(l.provider)} delivered ${minutes(actual)} of ${l.skill} to ${name(l.receiver)}.`,
    );
    if (booked) booked.status = "completed";
    notify(participants(e).filter((p) => p !== l.provider), e.id, `${name(l.provider)} recorded a completed ${l.skill} session.`);
    refresh(state, e);
  }
  if (action.type === "withdraw") {
    if (
      !participants(e).includes(action.user) ||
      ["settled", "defaulted", "disputed", "withdrawn", "declined", "cancelled", "expired"].includes(e.status)
    )
      throw Error("Withdrawal is unavailable.");
    if (!action.reason.trim()) throw Error("Please record a reason.");
    e.status = "withdrawn";
    e.recovery = { withdrawn: action.user, confirmations: [], applied: false };
    state.withdrawals.push({
      exchange: e.id,
      user: action.user,
      reason: action.reason,
    });
    e.audit.push(
      `${name(action.user)} withdrew: ${action.reason}. Completed work preserved; remaining services frozen.`,
    );
  }
  if (action.type === "replacement") {
    if (e.status !== "withdrawn" || !e.recovery)
      throw Error("No broken route to recover.");
    const old = e.legs.find(
      (l) => l.provider === e.recovery!.withdrawn && remaining(state, e, l) > 0,
    );
    if (!old) throw Error("No outstanding service to replace.");
    const need = state.listings.find((n) => n.id === old.need)!;
    const offer = state.listings.find(
      (o) =>
        o.user === action.user &&
        compatible(o, {
          ...need,
          sessions: Math.ceil(remaining(state, e, old) / old.duration),
        }),
    );
    if (!offer) throw Error("No compatible replacement is available.");
    if (!state.sessions.some((s) => s.exchange === e.id)) {
      const incoming = e.legs.find(
        (l) => l.receiver === e.recovery!.withdrawn,
      )!;
      const incomingOffer = state.listings.find(
        (o) => o.id === incoming.offer,
      )!;
      if (
        !state.listings.some(
          (n) => n.user === action.user && compatible(incomingOffer, n),
        )
      )
        throw Error("Replacement also needs a compatible incoming service.");
    }
    e.recovery.replacement = action.user;
    e.recovery.leg = {
      ...matchLeg(offer, need),
      sessions: remaining(state, e, old) / old.duration,
      replaces: old.id,
    };
    e.recovery.confirmations = [];
    e.audit.push(
      `${name(action.user)} proposed a voluntary replacement service. No debt transferred.`,
    );
  }
  if (action.type === "reconfirm") {
    const r = e.recovery;
    if (e.status !== "withdrawn" || !r?.leg || !r.replacement)
      throw Error("Choose a replacement first.");
    if (![...participants(e), r.replacement].includes(action.user))
      throw Error("Participant not affected.");
    if (!r.confirmations.includes(action.user))
      r.confirmations.push(action.user);
    if (
      [...participants(e), r.replacement].every((u) =>
        r.confirmations.includes(u),
      )
    ) {
      // The original debtor stays on the leg after performance. Replacement sessions explicitly cover that obligation.
      r.applied = true;
      e.status =
        e.confirmations.length === participants(e).length
          ? "active"
          : "proposed";
      if (!state.sessions.some((s) => s.exchange === e.id)) {
        const old = r.withdrawn;
        for (const bond of exchangeBonds(state, e.id).filter((candidate) => candidate.owner === old))
          returnBond(state, bond, "The participant withdrew before any service was delivered; the simulated bond was returned.");
        e.legs = e.legs.map((l) =>
          l.provider === old
            ? { ...r.leg!, id: l.id }
            : l.receiver === old
              ? {
                  ...l,
                  receiver: r.replacement!,
                  need: state.listings.find(
                    (n) =>
                      n.user === r.replacement &&
                      compatible(
                        state.listings.find((o) => o.id === l.offer)!,
                        n,
                      ),
                  )!.id,
                }
              : l,
        );
        e.confirmations = participants(e);
        e.status = "confirmed";
        calculateBonds(state, e);
        holdCalculatedBonds(state, e);
      }
      e.audit.push(
        "All affected participants accepted the replacement. Existing responsibility and contribution history preserved.",
      );
      refresh(state, e);
    }
  }
  if (action.type === "default") {
    if (e.status !== "withdrawn")
      throw Error("Default is available only for an unresolved withdrawal.");
    e.status = "defaulted";
    e.audit.push(
      "No accepted replacement by the demo deadline. Uncovered contributions preserved; obligation defaulted.",
    );
  }
  if (action.type === "amend") {
    if (
      !["confirmed", "active", "partially settled"].includes(e.status) ||
      e.amendments.some((a) => a.status === "pending")
    )
      throw Error("An amendment is unavailable right now.");
    const l = e.legs.find((l) => l.id === action.leg)!;
    const originalOffer = state.listings.find((o) => o.id === l.offer)!;
    const availableTotal =
      availableListing(state, originalOffer).sessions + l.sessions;
    if (
      !Number.isInteger(action.sessions) ||
      action.sessions < 1 ||
      action.sessions > Math.min(l.capacity, availableTotal) ||
      action.sessions * l.duration < done(state, e.id, l.id) ||
      action.sessions === l.sessions
    )
      throw Error(
        "Use a different session count within capacity, preserving completed work.",
      );
    e.amendments.push({
      id: id(),
      leg: l.id,
      before: l.sessions,
      after: action.sessions,
      confirmations: [],
      status: "pending",
    });
    e.audit.push(
      `Proposed amendment: ${l.skill}, ${l.sessions} to ${action.sessions} sessions. Completion held until all confirm.`,
    );
    notify(participants(e), e.id, `Future ${l.skill} session count changed; everyone must review and confirm.`);
  }
  if (action.type === "confirmAmend") {
    const a = e.amendments.find((a) => a.status === "pending");
    if (!a || !participants(e).includes(action.user))
      throw Error("No amendment to confirm.");
    if (!a.confirmations.includes(action.user))
      a.confirmations.push(action.user);
    e.audit.push(
      `${name(action.user)} accepted amended terms and recalculated quantities.`,
    );
    if (participants(e).every((u) => a.confirmations.includes(u))) {
      const amendedLeg = e.legs.find((l) => l.id === a.leg)!;
      amendedLeg.sessions = a.after;
      a.status = "applied";
      repriceHeldBond(state, e, amendedLeg);
      refresh(state, e);
    }
    notify(participants(e).filter((p) => p !== action.user), e.id, `${name(action.user)} accepted changed exchange terms.`);
  }
  // Preserve actual provider identity when an accepted replacement performs an original debtor's service.
  if (
    action.type === "complete" &&
    e.recovery?.applied &&
    e.recovery.leg?.replaces === action.leg
  ) {
    state.sessions[state.sessions.length - 1].provider =
      e.recovery.replacement!;
    state.contributions[state.contributions.length - 1].provider =
      e.recovery.replacement!;
    e.audit[e.audit.length - 1] =
      `${name(e.recovery.replacement!)} delivered replacement ${e.recovery.leg.skill}; covered ${name(e.recovery.withdrawn)}'s original obligation by explicit agreement.`;
  }
  if (["settled", "withdrawn", "defaulted"].includes(e.status)) reconcileBonds(state, e);
  return state;
}
export function reliability(state: State, user: Person) {
  const sessions = state.sessions.filter((s) => s.provider === user),
    evals = state.evaluations.filter((e) =>
      sessions.some((s) => s.id === e.session),
    );
  const live = state.liveStats?.[user];
  if (live && sessions.length === 0 && evals.length === 0) {
    return {
      sessions: live.services,
      reviews: live.coldStart ? 0 : 1,
      onTime: live.coldStart ? null : Math.round(live.reliability),
      completed: live.coldStart ? null : Math.round(live.reliability),
      fulfilled: 0,
    };
  }
  return {
    sessions: sessions.length,
    reviews: evals.length,
    onTime: evals.length
      ? Math.round((evals.filter((e) => e.on_time).length / evals.length) * 100)
      : null,
    completed: evals.length
      ? Math.round(
          (evals.filter((e) => e.completed_as_agreed).length / evals.length) *
            100,
        )
      : null,
    fulfilled: commitments(state).filter(
      (c) => c.debtor === user && c.status === "Fulfilled",
    ).length,
  };
}
export function recommendations(state: State, user: Person) {
  return [
    ...outstanding(state, user).map((c) => ({
      priority: 1,
      title: `Finish ${c.skill} with ${name(c.beneficiary)}`,
      reason: `Fulfils your existing obligation: ${minutes(c.remaining_sessions * c.duration)} remaining.`,
      exchange: c.exchange,
    })),
    ...state.exchanges
      .filter((e) => e.status === "withdrawn" && participants(e).includes(user))
      .map((e) => ({
        priority: 2,
        title: "Repair your exchange ring",
        reason:
          "Completed work is preserved. A replacement needs everyone’s confirmation.",
        exchange: e.id,
      })),
    ...findMatches(state, user).map((legs) => ({
      priority: legs.length === 2 ? 3 : 4,
      title: legs.length === 2 ? "A direct exchange" : "A new exchange ring",
      reason:
        "Skills, session length, capacity, mode, level, conditions and availability align.",
      legs,
    })),
  ].sort((a, b) => a.priority - b.priority);
}
function listing(
  user: Person,
  kind: Listing["kind"],
  skill: string,
  duration = 60,
  sessions = 1,
): Listing {
  return {
    id: `${user}-${kind}-${skill}`,
    user,
    kind,
    category: Object.entries(library).find(([, v]) =>
      v.includes(skill),
    )![0] as keyof typeof library,
    skill,
    duration,
    sessions,
    mode: skill === "Tennis" ? "Offline" : "Online",
    location: skill === "Tennis" ? "Local meeting point" : "Anywhere",
    availability: ["Saturday Afternoon", "Weekday Evening"],
    level: kind === "offer" ? 2 : 0,
    conditions: "",
    status: "Active",
  };
}
export function seed(scenario: "home" | "direct" | "ring" = "home"): State {
  const direct = [
    listing("alice", "offer", "Python", 60, 2),
    listing("alice", "need", "Tennis", 30, 2),
    listing("bob", "offer", "Tennis", 30, 3),
    listing("bob", "need", "Python", 60, 2),
  ];
  const ring = [
    listing("alice", "offer", "Python"),
    listing("alice", "need", "Photography"),
    listing("charlie", "offer", "Tennis"),
    listing("charlie", "need", "Python"),
    listing("bob", "offer", "Photography"),
    listing("bob", "need", "Tennis"),
    listing("david", "offer", "Tennis"),
    listing("david", "need", "Python"),
  ];
  let state: State = {
    version: 1,
    listings: scenario === "ring" ? ring : direct,
    exchanges: [],
    sessions: [],
    contributions: [],
    disputes: [],
    evaluations: [],
    withdrawals: [],
  };
  if (scenario === "home") {
    state.listings[0].sessions = 5;
    state = transition(state, {
      type: "propose",
      legs: findMatches(state, "alice")[0],
    });
    const e = state.exchanges[0];
    for (const user of participants(e))
      state = transition(state, { type: "confirm", exchange: e.id, user });
    for (let n = 0; n < 2; n++)
      state = transition(state, {
        type: "complete",
        exchange: e.id,
        leg: e.legs[0].id,
      });
    state = transition(state, {
      type: "complete",
      exchange: e.id,
      leg: e.legs[1].id,
    });
    state.listings.push(
      listing("alice", "offer", "Graphic Design"),
      listing("alice", "need", "Photography"),
      listing("maya", "offer", "Photography"),
      listing("maya", "need", "Graphic Design"),
      listing("alice", "need", "Guitar"),
      listing("james", "offer", "Guitar"),
      listing("james", "need", "Python"),
      listing("david", "offer", "Tennis"),
      listing("david", "need", "Guitar", 60, 1),
    );
  }
  return state;
}
