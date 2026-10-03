import { randomUUID } from "node:crypto";
import { transition, participants, findMatches, registerPerson } from "./generated/domain.mjs";

export function createStarterStore(request) {
  async function load(account) {
    const rows = await request({ table: "account_starter_workspaces", query: { user_id: `eq.${account.userId}`, select: "workspace,revision", limit: "1" } });
    return rows[0] || null;
  }
  async function save(account, row, state) {
    const result = await request({ table: "account_starter_workspaces", method: "PATCH",
      query: { user_id: `eq.${account.userId}`, revision: `eq.${row.revision}` },
      body: { workspace: { ...row.workspace, state }, revision: row.revision + 1 }, prefer: "return=representation" });
    if (!result.length) throw new Error("Your workspace changed. Reload and try again.");
  }
  return {
    load,
    async listing(account, raw, id) {
      const row = await load(account);
      const original = row?.workspace.state.listings.find(l => l.id === id);
      if (!original || original.user !== account.userId || raw.user !== account.userId) throw new Error("You can only update your own example listings.");
      if (!Number.isInteger(raw.sessions) || raw.sessions < 1 || !Number.isFinite(raw.duration) || raw.duration < 15 || !Array.isArray(raw.availability)) throw new Error("Choose a valid duration, capacity, and availability.");
      const next = transition(row.workspace.state, { type: "editListing", listing: { ...raw, id } });
      await save(account, row, next);
      return { starter: true };
    },
    async exchange(account, action, requestedId) {
      const row = await load(account);
      if (!row) throw new Error("Example workspace not found.");
      const { state, people } = row.workspace;
      for (const [id, name] of Object.entries(people)) registerPerson(id, name);
      if ("user" in action && action.user !== account.userId) throw new Error("Act only as your signed-in account.");
      let exchangeId = requestedId;
      if (action.type === "propose") {
        const route = findMatches(state, account.userId).find(legs => legs.length === action.legs?.length && legs.every(leg => action.legs.some(candidate => candidate.id === leg.id)));
        if (!route) throw new Error("This example match is no longer available.");
        // Canonical server terms prevent client-supplied identities or terms.
        action = { type: "propose", legs: route };
      } else {
        if (action.type === "dispute" || action.type === "evaluate") {
          const session = state.sessions.find(s => s.id === (action.session || action.evaluation?.session));
          if (!session) throw new Error("This session does not belong to you.");
          // Evaluation has no user field (src/domain.ts); authorize against the
          // stored session receiver, never against a client-supplied identity.
          const authorized = action.type === "evaluate"
            ? session.receiver === account.userId
            : [session.provider, session.receiver].includes(account.userId);
          if (!authorized) throw new Error("This session does not belong to you.");
          exchangeId = session.exchange;
        }
        const exchange = state.exchanges.find(e => e.id === exchangeId);
        if (!exchange || !participants(exchange).includes(account.userId)) throw new Error("This example exchange does not belong to you.");
        if (action.exchange && action.exchange !== exchangeId) throw new Error("Exchange ID mismatch.");
        if (action.type === "complete" && exchange.legs.find(l => l.id === action.leg)?.provider !== account.userId) throw new Error("Only the provider can record delivery.");
        if (action.type === "reviseProposal" && !action.legs.every(l => exchange.legs.some(old => old.id === l.id && old.offer === l.offer && old.need === l.need && old.provider === l.provider && old.receiver === l.receiver))) throw new Error("Keep the example participants and listings.");
      }
      const next = transition(state, action);
      if (action.type === "propose") {
        const exchange = next.exchanges.at(-1);
        const oldId = exchange.id;
        exchange.id = `starter_${account.userId}_${randomUUID()}`;
        exchange.title = `Example · ${exchange.title}`;
        for (const notification of next.notifications || []) if (notification.exchange === oldId) notification.exchange = exchange.id;
        const bondIds = new Map();
        for (const bond of next.bonds || []) if (bond.exchange === oldId) {
          const previousBondId = bond.id;
          bond.exchange = exchange.id;
          bond.id = `bond:${exchange.id}:${bond.leg}:${bond.owner}`.slice(0, 240);
          bondIds.set(previousBondId, bond.id);
        }
        for (const entry of next.bondLedger || []) if (entry.exchange === oldId) {
          entry.exchange = exchange.id;
          entry.bond = bondIds.get(entry.bond) || entry.bond;
        }
        exchangeId = exchange.id;
      }
      await save(account, row, next);
      return { starter: true, exchange: { exchangeId } };
    },
  };
}
