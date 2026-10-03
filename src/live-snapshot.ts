import { mergeStarterWorkspace, type StarterWorkspace } from "./starter";
import { library, registerPerson, proposalStatus, type Exchange, type Leg, type Listing, type Person, type State } from "./domain";

type LiveRow = Record<string, unknown>;
export type LiveSnapshot = {
  starter?: StarterWorkspace;
  source: "supabase";
  fetchedAt: string;
  liveUserId: string | null;
  users: LiveRow[];
  categories: LiveRow[];
  skills: LiveRow[];
  skill_values?: LiveRow[];
  system_config?: LiveRow[];
  time_slots: LiveRow[];
  offers: LiveRow[];
  needs: LiveRow[];
  offer_availability: LiveRow[];
  need_availability: LiveRow[];
  reliability_history: LiveRow[];
  current_user_reliability: LiveRow[];
  exchanges: LiveRow[];
  exchange_matches: LiveRow[];
  matches: LiveRow[];
  recommendation_rankings: LiveRow[];
  exchange_participants: LiveRow[];
  exchange_legs: LiveRow[];
  exchange_confirmations: LiveRow[];
  sessions: LiveRow[];
  contributions: LiveRow[];
  completion_bonds?: LiveRow[];
  bond_ledger_entries?: LiveRow[];
};

function text(row: LiveRow, key: string, fallback = "") {
  const value = row[key];
  return value === null || value === undefined ? fallback : String(value);
}

function integer(row: LiveRow, key: string, fallback: number) {
  const value = Number(row[key]);
  return Number.isFinite(value) ? value : fallback;
}

function listingStatus(value: string): Listing["status"] {
  if (value === "Paused") return "Paused";
  if (value === "Fulfilled") return "Fulfilled";
  if (value === "Deleted") return "Archived";
  return "Active";
}

function levelIndex(value: string) {
  return Math.max(0, ["Beginner", "Intermediate", "Advanced", "Expert"].indexOf(value));
}

export function liveSkillCatalog(snapshot: Pick<LiveSnapshot, "categories" | "skills">): Record<string, string[]> {
  const catalog: Record<string, string[]> = {};
  for (const category of snapshot.categories.filter(row => row.status === "Active")) {
    const names = snapshot.skills.filter(row => row.status === "Active" && row.category_id === category.category_id)
      .map(row => text(row, "skill_name")).filter(Boolean);
    if (names.length) catalog[text(category, "category_name")] = [...new Set(names)];
  }
  return catalog;
}

export function liveSnapshotToState(snapshot: LiveSnapshot): State {
  const categories = new Map(snapshot.categories.map((row) => [text(row, "category_id"), text(row, "category_name")]));
  const skills = new Map(snapshot.skills.map((row) => [text(row, "skill_id"), row]));
  const skillValueMultipliers = Object.fromEntries((snapshot.skill_values || []).flatMap((row) => {
    const skill = skills.get(text(row, "skill_id"));
    const value = Number(row.base_value);
    return skill && Number.isFinite(value) ? [[text(skill, "skill_name"), value]] : [];
  }));
  const config = new Map((snapshot.system_config || []).map((row) => [text(row, "config_key"), Number(row.config_value)]));
  const slots = new Map(snapshot.time_slots.map((row) => [text(row, "slot_id"), text(row, "slot_name")]));
  const offerSlots = new Map<string, string[]>();
  for (const row of snapshot.offer_availability) {
    const id = text(row, "offer_id");
    offerSlots.set(id, [...(offerSlots.get(id) || []), slots.get(text(row, "slot_id")) || text(row, "slot_id")]);
  }
  const needSlots = new Map<string, string[]>();
  for (const row of snapshot.need_availability) {
    const id = text(row, "need_id");
    needSlots.set(id, [...(needSlots.get(id) || []), slots.get(text(row, "slot_id")) || text(row, "slot_id")]);
  }

  for (const user of snapshot.users) {
    registerPerson(text(user, "user_id"), text(user, "name"));
  }

  const makeListing = (row: LiveRow, kind: Listing["kind"]): Listing => {
    const skillRow = skills.get(text(row, "skill_id"));
    const skill = text(skillRow || {}, "skill_name", text(row, "skill_id"));
    const category = categories.get(text(skillRow || {}, "category_id")) || "Other";
    if (!library[category]) library[category] = [skill, "Other"];
    else if (!library[category].includes(skill)) library[category].push(skill);
    const listingId = text(row, kind === "offer" ? "offer_id" : "need_id");
    return {
      id: listingId,
      user: text(row, "user_id") as Person,
      kind,
      category,
      skill,
      duration: integer(row, "duration_minutes", 30),
      sessions: integer(row, kind === "offer" ? "max_sessions" : "sessions_needed", 1),
      mode: text(row, "mode", "Either") as Listing["mode"],
      location: text(row, "location", "Anywhere"),
      availability: kind === "offer" ? (offerSlots.get(listingId) || []) : (needSlots.get(listingId) || []),
      level: levelIndex(text(row, kind === "offer" ? "level" : "required_provider_level", "Beginner")),
      conditions: text(row, "conditions"),
      status: listingStatus(text(row, "status", "Active")),
    };
  };

  const offers = new Map(snapshot.offers.map((row) => [text(row, "offer_id"), row]));
  const needs = new Map(snapshot.needs.map((row) => [text(row, "need_id"), row]));
  const matchRows = new Map(snapshot.matches.map((row) => [text(row, "match_id"), row]));
  const liveMatches: Record<Person, Leg[][]> = {};
  const rankings = [...(snapshot.recommendation_rankings || [])].sort((a, b) =>
    integer(a, "rank_position", Number.MAX_SAFE_INTEGER) - integer(b, "rank_position", Number.MAX_SAFE_INTEGER));
  for (const ranking of rankings) {
    const userId = text(ranking, "target_user_id");
    const match = matchRows.get(text(ranking, "match_id"));
    if (!userId || !match) continue;
    const suffixes = text(match, "match_type") === "Cycle" ? ["a", "b", "c"] : ["a", "b"];
    const route = suffixes.map((suffix): Leg | null => {
      const offerId = text(match, `offer_id_${suffix}`);
      const needId = text(match, `need_id_${suffix}`);
      const offer = offers.get(offerId);
      const need = needs.get(needId);
      if (!offer || !need || text(offer, "status") !== "Active" || text(need, "status") !== "Active") return null;
      const commonSlot = (offerSlots.get(offerId) || []).find((slot) => (needSlots.get(needId) || []).includes(slot));
      if (!commonSlot) return null;
      const skill = skills.get(text(offer, "skill_id"));
      const offerMode = text(offer, "mode");
      const needMode = text(need, "mode");
      return {
        id: `${offerId}:${needId}`, offer: offerId, need: needId,
        provider: text(offer, "user_id"), receiver: text(need, "user_id"),
        skill: text(skill || {}, "skill_name", text(offer, "skill_id")),
        duration: integer(need, "duration_minutes", 60),
        sessions: integer(need, "sessions_needed", 1),
        availability: commonSlot,
        mode: offerMode === "Either" ? (needMode === "Either" ? "Online" : needMode) : offerMode,
        location: text(offer, "location", "Anywhere"),
        capacity: integer(offer, "max_sessions", 1),
      };
    });
    if (route.some((leg) => !leg)) continue;
    const legs = route as Leg[];
    const first = legs.findIndex((leg) => leg.provider === userId);
    if (first < 0) continue;
    const ordered = [...legs.slice(first), ...legs.slice(0, first)];
    if (!ordered.every((leg, index) => leg.receiver === ordered[(index + 1) % ordered.length].provider)) continue;
    (liveMatches[userId] ??= []).push(ordered);
  }

  const stats: State["liveStats"] = {};
  for (const row of snapshot.current_user_reliability) {
    const userId = text(row, "user_id");
    stats![userId] = {
      reliability: Number(row.reliability_score) || 50,
      coldStart: Boolean(row.is_cold_start),
      services: 0,
    };
  }
  for (const row of snapshot.offers) {
    const userId = text(row, "user_id");
    if (stats![userId]) stats![userId].services += 1;
  }

  const listingRows = new Map<string, LiveRow>();
  for (const row of [...(snapshot.offers || []), ...(snapshot.needs || [])]) {
    const id = text(row, "offer_id", text(row, "need_id"));
    if (id) listingRows.set(id, row);
  }
  const makeLegacyLeg = (exchangeId: string, match: LiveRow, offerKey: string, needKey: string, index: number) => {
    const offerId = text(match, offerKey);
    const needId = text(match, needKey);
    const offer = listingRows.get(offerId);
    const need = listingRows.get(needId);
    if (!offer || !need) return null;
    const skillId = text(offer, "skill_id", text(need, "skill_id"));
    const skillRow = skills.get(skillId);
    const provider = text(offer, "user_id");
    const receiver = text(need, "user_id");
    if (!provider || !receiver) return null;
    return {
      leg_id: `${exchangeId}:legacy:${index}`,
      exchange_id: exchangeId,
      offer_id: offerId,
      need_id: needId,
      provider_id: provider,
      receiver_id: receiver,
      skill_id: skillId,
      duration_minutes: integer(offer, "duration_minutes", integer(need, "duration_minutes", 30)),
      total_sessions: integer(offer, "max_sessions", integer(need, "sessions_needed", 1)),
      availability: "",
      mode: text(offer, "mode", text(need, "mode", "Either")),
      location: text(offer, "location", text(need, "location", "Anywhere")),
      capacity: 1,
      sort_order: index,
      skill_name: text(skillRow || {}, "skill_name", skillId),
    };
  };
  const legsById = new Map<string, LiveRow>();
  for (const row of snapshot.exchange_legs || []) legsById.set(text(row, "leg_id"), row);
  const legacyMatches = new Map<string, LiveRow>();
  for (const link of snapshot.exchange_matches || []) {
    const match = (snapshot.matches || []).find((row) => text(row, "match_id") === text(link, "match_id"));
    if (match) legacyMatches.set(text(link, "exchange_id"), match);
  }
  for (const [exchangeId, match] of legacyMatches) {
    if ([...(snapshot.exchange_legs || [])].some((row) => text(row, "exchange_id") === exchangeId)) continue;
    for (const [offerKey, needKey] of [["offer_id_a", "need_id_a"], ["offer_id_b", "need_id_b"], ["offer_id_c", "need_id_c"]] as const) {
      const leg = makeLegacyLeg(exchangeId, match, offerKey, needKey, legsById.size + 1);
      if (leg) legsById.set(text(leg, "leg_id"), leg);
    }
  }
  const confirmationsByExchange = new Map<string, Person[]>();
  for (const row of snapshot.exchange_confirmations || []) {
    const exchangeId = text(row, "exchange_id");
    confirmationsByExchange.set(exchangeId, [...(confirmationsByExchange.get(exchangeId) || []), text(row, "user_id") as Person]);
  }
  const details = (row: LiveRow) => row.details && typeof row.details === "object" ? row.details as Record<string, unknown> : {};
  const status = (value: string): State["exchanges"][number]["status"] => ({
    Proposed: "proposed",
    Confirmed: "confirmed",
    Active: "active",
    "Partially Settled": "partially settled",
    Settled: "settled",
    Disputed: "disputed",
    Withdrawn: "withdrawn",
    Defaulted: "defaulted",
  }[value] as State["exchanges"][number]["status"] || "proposed");
  const exchangeLegs = (exchangeId: string) => [...legsById.values()]
    .filter((row) => text(row, "exchange_id") === exchangeId)
    .sort((a, b) => integer(a, "sort_order", 0) - integer(b, "sort_order", 0))
    .map((row) => {
      const skillRow = skills.get(text(row, "skill_id"));
      return {
        id: text(row, "leg_id"),
        offer: text(row, "offer_id"),
        need: text(row, "need_id"),
        provider: text(row, "provider_id") as Person,
        receiver: text(row, "receiver_id") as Person,
        skill: text(skillRow || {}, "skill_name", text(row, "skill_id")),
        duration: integer(row, "duration_minutes", 30),
        sessions: integer(row, "total_sessions", 1),
        availability: text(row, "availability"),
        mode: text(row, "mode", "Either"),
        location: text(row, "location", "Anywhere"),
        capacity: integer(row, "capacity", 1),
        ...(text(row, "replaces_leg_id") ? { replaces: text(row, "replaces_leg_id") } : {}),
      };
    });
  const exchanges = (snapshot.exchanges || []).flatMap((row) => {
    const exchangeId = text(row, "exchange_id");
    const exchangeDetails = details(row);
    const legs = exchangeLegs(exchangeId);
    if (!legs.length) return [];
    return [{
      id: exchangeId,
      title: text(exchangeDetails, "title", legs.map((leg) => leg.skill).join(" & ")),
      legs,
      confirmations: confirmationsByExchange.get(exchangeId) || [],
      status: (text(row, "status") === "Withdrawn" && ["declined", "cancelled", "expired"].includes(text(exchangeDetails, "proposalOutcome"))) ? text(exchangeDetails, "proposalOutcome") as Exchange["status"] : status(text(row, "status")),
      audit: Array.isArray(exchangeDetails.audit) ? exchangeDetails.audit.filter((item): item is string => typeof item === "string") : [],
      amendments: Array.isArray(exchangeDetails.amendments) ? exchangeDetails.amendments as Exchange["amendments"] : [],
      ...(typeof exchangeDetails.createdAt === "string" ? { createdAt: exchangeDetails.createdAt } : {}),
      ...(typeof exchangeDetails.expiresAt === "string" ? { expiresAt: exchangeDetails.expiresAt } : {}),
      ...(typeof exchangeDetails.declineReason === "string" ? { declineReason: exchangeDetails.declineReason } : {}),
      ...(exchangeDetails.proposedTerms && typeof exchangeDetails.proposedTerms === "object" ? { proposedTerms: exchangeDetails.proposedTerms as Exchange["proposedTerms"] } : {}),
      ...(exchangeDetails.recovery && typeof exchangeDetails.recovery === "object" ? { recovery: exchangeDetails.recovery as Exchange["recovery"] } : {}),
    }];
  });
  for (const exchange of exchanges) exchange.status = proposalStatus(exchange);
  const exchangeMap = new Map(exchanges.map((exchange) => [exchange.id, exchange]));
  const legBySession = new Map<string, LiveRow>();
  const sessions = (snapshot.sessions || []).flatMap((row) => {
    const leg = legsById.get(text(row, "exchange_leg_id"));
    if (!leg || !exchangeMap.has(text(row, "exchange_id"))) return [];
    legBySession.set(text(row, "session_id"), leg);
    return [{
      id: text(row, "session_id"),
      exchange: text(row, "exchange_id"),
      leg: text(row, "exchange_leg_id"),
      provider: text(row, "provider_id") as Person,
      receiver: text(row, "receiver_id") as Person,
      skill: text(skills.get(text(leg, "skill_id")) || {}, "skill_name", text(leg, "skill_id")),
      duration: integer(row, "scheduled_duration_minutes", integer(leg, "duration_minutes", 30)),
      actual_duration: integer(row, "actual_duration_minutes", integer(row, "scheduled_duration_minutes", 30)),
      scheduled_time: text(row, "scheduled_time", text(leg, "availability")),
      notes: text(row, "notes"),
    }];
  });
  const contributions = (snapshot.contributions || []).flatMap((row) => exchangeMap.has(text(row, "exchange_id")) ? [{
    id: text(row, "contribution_id"),
    session: text(row, "session_id"),
    exchange: text(row, "exchange_id"),
    provider: text(row, "provider_id") as Person,
    receiver: text(row, "receiver_id") as Person,
    skill: text(skills.get(text(legBySession.get(text(row, "session_id")) || {}, "skill_id")) || {}, "skill_name", "Skill"),
    duration: integer(row, "duration_minutes", 30),
    created_at: text(row, "created_at"),
  }] : []);
  const bonds = (snapshot.completion_bonds || []).flatMap((row) => exchangeMap.has(text(row, "exchange_id")) ? [{
    id: text(row, "bond_id"),
    exchange: text(row, "exchange_id"),
    leg: text(row, "exchange_leg_id"),
    owner: text(row, "owner_id") as Person,
    currency: "HKD" as const,
    reference_value: Number(row.reference_value) || 0,
    rate: Number(row.bond_rate) || 0,
    amount: Number(row.bond_amount) || 0,
    status: text(row, "status", "Calculated") as "Calculated" | "Held" | "Returned" | "Settled",
    returned_amount: Number(row.returned_amount) || 0,
    applied_amount: Number(row.applied_amount) || 0,
    terms_version: text(row, "terms_version", "simulated-hkd-v1"),
  }] : []);
  const bondLedger = (snapshot.bond_ledger_entries || []).flatMap((row) => exchangeMap.has(text(row, "exchange_id")) ? [{
    id: text(row, "entry_id"),
    bond: text(row, "bond_id"),
    exchange: text(row, "exchange_id"),
    event: text(row, "event_type") as "CALCULATED" | "HELD" | "RETURNED" | "SETTLED",
    amount: Number(row.amount) || 0,
    ...(text(row, "recipient_id") ? { recipient: text(row, "recipient_id") as Person } : {}),
    reason: text(row, "reason"),
    created_at: text(row, "created_at"),
  }] : []);

  const saved = (field: string) => (snapshot.exchanges || []).flatMap(row => {
    const value = (details(row).state as Record<string, unknown> | undefined)?.[field];
    return Array.isArray(value) ? value : [];
  });
  return mergeStarterWorkspace({
    liveCatalog: liveSkillCatalog(snapshot),
    version: 1,
    listings: [
      ...snapshot.offers.filter((row) => text(row, "status") !== "Deleted").map((row) => makeListing(row, "offer")),
      ...snapshot.needs.filter((row) => text(row, "status") !== "Deleted").map((row) => makeListing(row, "need")),
    ],
    exchanges,
    sessions,
    contributions,
    bonds,
    bondLedger,
    disputes: saved("disputes"),
    evaluations: saved("evaluations"),
    withdrawals: saved("withdrawals"),
    messages: saved("messages"),
    bookings: saved("bookings"),
    notifications: saved("notifications"),
    liveStats: stats,
    liveMatches,
    skillValueMultipliers,
    referenceHourlyHkd: config.get("bond_reference_hourly_hkd") || 200,
    completionBondRate: config.get("completion_bond_rate") || 0.2,
  }, snapshot.starter, snapshot.liveUserId);
}
