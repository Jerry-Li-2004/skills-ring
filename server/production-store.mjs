import { createStarterStore } from "./starter-store.mjs";
import { randomUUID } from "node:crypto";
import { supabaseRequest, fetchSupabaseTable } from "./app.mjs";
import { transition, participants, library } from "./generated/domain.mjs";
import { liveSnapshotToState } from "./generated/live-snapshot.mjs";

const TABLES = ["users", "categories", "skills", "time_slots", "offers", "needs", "offer_availability", "need_availability", "reliability_history", "current_user_reliability", "exchanges", "exchange_matches", "matches", "recommendation_rankings", "exchange_participants", "exchange_legs", "exchange_confirmations", "sessions", "contributions"];
const ACTIONS = new Set(["propose", "confirm", "decline", "cancelProposal", "reviseProposal", "expireProposal", "message", "booking", "acceptBooking", "cancelBooking", "noShow", "remindBooking", "complete", "withdraw", "replacement", "reconfirm", "amend", "confirmAmend", "dispute", "evaluate"]);

export function createProductionStore({ url, key }) {
  const request = args => supabaseRequest({ url, key, ...args });
  const starter = createStarterStore(request);
  const rpc = (name, body) => request({ table: `rpc/${name}`, method: "POST", body });
  async function snapshot(account, internal = false) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const before = await request({ table: "app_revision", query: { select: "revision", id: "eq.1" } });
      const rows = Object.fromEntries(await Promise.all(TABLES.map(async table => [table, await fetchSupabaseTable({ url, key, table })])));
      const after = await request({ table: "app_revision", query: { select: "revision", id: "eq.1" } });
      if (before[0].revision !== after[0].revision) continue;
      if (!internal) {
        const allowed = new Set(rows.exchange_participants.filter(row => row.user_id === account.userId).map(row => row.exchange_id));
        for (const table of ["exchanges", "exchange_matches", "exchange_participants", "exchange_legs", "exchange_confirmations", "sessions", "contributions"]) rows[table] = rows[table].filter(row => allowed.has(row.exchange_id));
        rows.recommendation_rankings = rows.recommendation_rankings.filter(row => row.target_user_id === account.userId);
        rows.reliability_history = [];
        for (const row of rows.exchanges) {
          if (row.details?.state?.notifications) row.details.state.notifications = row.details.state.notifications.filter(n => n.user === account.userId);
        }
      }
      return { ...rows, ...(!internal ? { starter: (await starter.load(account))?.workspace } : {}), source: "supabase", liveUserId: account.userId, fetchedAt: new Date().toISOString(), revision: after[0].revision };
    }
    throw new Error("The community changed while loading. Please retry.");
  }
  async function transact(revision, fn) {
    const operations = [];
    const write = async ({ table, method, body, query }) => { operations.push({ table, method, body, query }); return null; };
    const result = await fn(write);
    await rpc("commit_app_mutation", { expected_revision: revision, operations });
    return result;
  }
  return {
    snapshot,
    async listing(account, raw, id, save) {
      if (id.startsWith("starter_")) return starter.listing(account, raw, id);
      const data = await snapshot(account, true);
      const state = liveSnapshotToState(data);
      if (raw.user !== account.userId) throw new Error("You can only publish your own listings.");
      if (!library[raw.category]?.includes(raw.skill)) throw new Error("Choose a listed skill and category.");
      if (raw.dateFrom || raw.dateTo) throw new Error("Agree on exact session dates in the exchange schedule.");
      if (!["Active", "Paused", "Fulfilled", "Archived", "Deleted"].includes(raw.status)) throw new Error("Invalid listing status.");
      if (raw.skill === "Other") throw new Error("Custom skills require moderator approval. Choose a listed skill.");
      const original = state.listings.find(row => row.id === id);
      if (original) transition(state, { type: "editListing", listing: { ...raw, id, user: account.userId } });
      return transact(data.revision, write => save(account, raw, id, write));
    },
    async exchange(account, body, requestedId, save) {
      const action = body.action;
      if (!action || !ACTIONS.has(action.type)) throw new Error("This action requires a moderator or is not supported.");
      if (requestedId?.startsWith("starter_") || (action.type === "propose" && action.legs?.some(l => l.offer?.startsWith("starter_")))) return starter.exchange(account, action, requestedId);
      const data = await snapshot(account, true);
      const state = liveSnapshotToState(data);
      if ("user" in action && action.type !== "replacement" && action.user !== account.userId) throw new Error("Act only as your signed-in account.");
      let exchangeId = requestedId;
      if (action.type === "propose") {
        if (!Array.isArray(action.legs) || action.legs.length > 4 || !action.legs.some(l => l.provider === account.userId)) throw new Error("You must participate in the proposed route.");
      } else {
        if (action.type === "dispute" || action.type === "evaluate") {
          const session = state.sessions.find(s => s.id === (action.session || action.evaluation?.session));
          if (!session || (action.type === "evaluate" ? session.receiver !== account.userId : ![session.provider, session.receiver].includes(account.userId))) throw new Error("This session does not belong to you.");
          exchangeId = session.exchange;
        }
        if (action.exchange && action.exchange !== exchangeId) throw new Error("Exchange ID mismatch.");
        const existing = state.exchanges.find(e => e.id === exchangeId);
        if (!existing || ![...participants(existing), existing.recovery?.replacement].includes(account.userId)) throw new Error("You are not a participant in this exchange.");
        if (action.type === "complete") {
          const leg = existing.legs.find(l => l.id === action.leg);
          const provider = existing.recovery?.applied && existing.recovery.leg?.replaces === action.leg ? existing.recovery.replacement : leg?.provider;
          if (provider !== account.userId) throw new Error("Only the provider can record delivery.");
        }
        if (action.type === "reviseProposal" && !action.legs.every(l => existing.legs.some(old => old.id === l.id && old.offer === l.offer && old.need === l.need))) throw new Error("Create a new proposal to change listings.");
      }
      const next = transition(state, action);
      const exchange = action.type === "propose" ? next.exchanges.at(-1) : next.exchanges.find(e => e.id === exchangeId);
      const oldId = exchange.id;
      if (action.type === "propose") {
        exchange.id = randomUUID();
        exchange.legs = exchange.legs.map((leg, index) => ({ ...leg, id: `${exchange.id}:${index}` }));
      }
      exchangeId = exchange.id;
      const serverState = {};
      for (const field of ["disputes", "evaluations", "withdrawals", "messages", "bookings", "notifications"]) {
        serverState[field] = (next[field] || []).filter(row => row.exchange === oldId || (field === "evaluations" && next.sessions.some(s => s.id === row.session && s.exchange === exchangeId))).map(row => row.exchange ? { ...row, exchange: exchangeId } : row);
      }
      exchange.serverState = serverState;
      await transact(data.revision, write => save(account, exchange, next.sessions.filter(s => s.exchange === exchangeId), next.contributions.filter(c => c.exchange === exchangeId), action.type, write));
      return { exchange: { exchangeId } };
    },
  };
}
