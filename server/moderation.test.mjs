import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createAuthServer } from "./app.mjs";
import { createProductionStore } from "./production-store.mjs";
import { createCalendarExports } from "./calendar.mjs";
import { seed, findMatches, transition, participants } from "./generated/domain.mjs";

function fixture() {
  let state = seed("direct");
  state = transition(state, { type: "propose", legs: findMatches(state, "alice")[0] });
  for (const user of participants(state.exchanges[0])) state = transition(state, { type: "confirm", exchange: state.exchanges[0].id, user });
  state = transition(state, { type: "complete", exchange: state.exchanges[0].id, leg: state.exchanges[0].legs[0].id });
  state = transition(state, { type: "dispute", session: state.sessions[0].id, user: state.sessions[0].receiver, reason: "The agreed lesson was only half delivered." });
  const e = state.exchanges[0];
  const extras = Object.fromEntries(["disputes", "evaluations", "withdrawals", "messages", "bookings", "notifications"].map(field => [field, state[field] || []]));
  return { state, tables: {
    app_revision: [{ revision: 1 }], users: [{ user_id: "alice", name: "Alice" }, { user_id: "bob", name: "Bob" }],
    exchanges: [{ exchange_id: e.id, status: "Disputed", details: { title: e.title, audit: e.audit, state: extras } }],
    skills: e.legs.map(l => ({ skill_id: l.skill, skill_name: l.skill })),
    offers: e.legs.map(l => ({ offer_id: l.offer, user_id: l.provider, skill_id: l.skill })),
    needs: e.legs.map(l => ({ need_id: l.need, user_id: l.receiver, skill_id: l.skill })),
    exchange_legs: e.legs.map((l, index) => ({ leg_id: l.id, exchange_id: e.id, offer_id: l.offer, need_id: l.need, provider_id: l.provider, receiver_id: l.receiver, skill_id: l.skill, duration_minutes: l.duration, total_sessions: l.sessions, mode: l.mode, location: l.location, availability: l.availability, capacity: l.capacity, sort_order: index })),
    exchange_participants: participants(e).map(user_id => ({ exchange_id: e.id, user_id })),
    sessions: state.sessions.map(s => ({ session_id: s.id, exchange_id: e.id, exchange_leg_id: s.leg, provider_id: s.provider, receiver_id: s.receiver, scheduled_duration_minutes: s.duration, actual_duration_minutes: s.actual_duration, status: "Completed" })),
    completion_bonds: state.bonds.map(b => ({ bond_id: b.id, exchange_id: b.exchange, exchange_leg_id: b.leg, owner_id: b.owner, currency: b.currency, reference_value: b.reference_value, bond_rate: b.rate, bond_amount: b.amount, status: b.status, returned_amount: b.returned_amount, applied_amount: b.applied_amount, terms_version: b.terms_version })),
    bond_ledger_entries: state.bondLedger.map(b => ({ entry_id: b.id, bond_id: b.bond, exchange_id: b.exchange, event_type: b.event, amount: b.amount, recipient_id: b.recipient, reason: b.reason, created_at: b.created_at })),
    contributions: state.contributions.map(c => ({ contribution_id: c.id, exchange_id: e.id, session_id: c.session, provider_id: c.provider, receiver_id: c.receiver, skill_id: c.skill, duration_minutes: c.duration })),
  } };
}

test("moderation HTTP boundary, atomic decisions, notifications, and repeat/conflict guards", async t => {
  const { state, tables } = fixture();
  const nativeFetch = globalThis.fetch;
  let commits = 0;
  t.mock.method(globalThis, "fetch", async (input, init = {}) => {
    const url = new URL(input);
    if (url.hostname !== "test.supabase.co") return nativeFetch(input, init);
    const table = url.pathname.split("/").at(-1);
    if (table === "commit_app_mutation") {
      const { operations, expected_revision } = JSON.parse(init.body);
      assert.equal(expected_revision, tables.app_revision[0].revision);
      commits++;
      for (const op of operations) {
        if (op.table === "exchanges") tables.exchanges = [op.body];
        if (["completion_bonds", "bond_ledger_entries"].includes(op.table)) tables[op.table] = op.body;
      }
      tables.app_revision[0].revision++;
      return Response.json(tables.app_revision[0].revision);
    }
    return Response.json(tables[table] || []);
  });
  const store = createProductionStore({ url: "https://test.supabase.co", key: "private", moderatorIds: ["mod", "alice"] });
  const server = createAuthServer({ supabaseUrl: "https://test.supabase.co", supabaseKey: "private", productionStore: store, authenticate: async req => {
    const userId = req.headers.authorization?.replace("Bearer ", "");
    return userId ? { userId, name: userId } : null;
  } });
  server.listen(0, "127.0.0.1"); await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  const request = (user, body) => nativeFetch(`${origin}/api/moderation`, { method: body ? "POST" : "GET", headers: { ...(user ? { Authorization: `Bearer ${user}` } : {}), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  try {
    const event = { id: "booking-1", start: "2026-10-10T15:00:00+08:00", minutes: 60, title: "Python with Alice and Bob", place: "Community room" };
    assert.equal((await nativeFetch(`${origin}/api/calendar/exports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(event) })).status, 401);
    const exported = await nativeFetch(`${origin}/api/calendar/exports`, { method: "POST", headers: { Authorization: "Bearer bob", "Content-Type": "application/json" }, body: JSON.stringify(event) });
    assert.equal(exported.status, 200);
    const download = await nativeFetch(`${origin}${(await exported.json()).url}`);
    assert.equal(download.status, 200);
    assert.match(download.headers.get("content-disposition"), /attachment.*\.ics/);
    assert.match(await download.text(), /DTSTART:20261010T070000Z/);
    assert.equal((await request()).status, 401);
    assert.equal((await request("bob")).status, 403);
    const decision = { dispute: state.disputes[0].id, resolution: "Partial release", reason: "Both participants confirm only half of the agreed lesson took place.", moderator: "forged" };
    assert.equal((await request("bob", decision)).status, 403);
    assert.equal((await request("alice", decision)).status, 422);
    assert.equal((await request("mod", { ...decision, reason: "tiny" })).status, 422);
    assert.equal((await request("mod", { ...decision, resolution: "invented" })).status, 422);
    assert.equal(commits, 0);
    const queue = await (await request("mod")).json();
    assert.equal(queue.disputes.length, 1);
    assert.equal(queue.sessions.length, 1);
    assert.equal((await request("mod", decision)).status, 200);
    assert.equal(commits, 1);
    assert.equal(tables.completion_bonds.length, state.bonds.length);
    assert.ok(tables.bond_ledger_entries.length >= state.bondLedger.length);
    const saved = tables.exchanges[0].details.state;
    assert.equal(saved.disputes[0].resolved_by, "mod");
    assert.equal(saved.disputes[0].resolution_reason, decision.reason);
    assert.equal(saved.disputes[0].released_minutes, state.sessions[0].actual_duration / 2);
    assert.equal(saved.notifications.filter(n => n.text.startsWith("Dispute resolved:")).length, 2);
    assert.equal((await request("mod", decision)).status, 422);
    assert.equal(commits, 1);
    const reloaded = await (await request("mod")).json();
    assert.equal(reloaded.disputes[0].status, "Resolved");
    const own = await store.snapshot({ userId: "bob" });
    assert.equal(own.exchanges[0].details.state.disputes[0].status, "Resolved");
  } finally { server.closeAllConnections(); server.close(); await once(server, "close"); }
});

test("calendar tickets are encrypted, time limited, and portable across server instances", () => {
  const exports = createCalendarExports("server-key");
  const event = { id: "event-1", start: "2026-10-10T07:00:00Z", minutes: 60, title: "Private lesson", place: "Private location" };
  const ticket = exports.issue(event, 1000);
  assert.ok(!Buffer.from(ticket, "base64url").toString().includes("Private"));
  assert.match(createCalendarExports("server-key").download(ticket, 2000), /SUMMARY:Private lesson/);
  assert.throws(() => exports.download(ticket, 301000), /expired/);
  assert.throws(() => createCalendarExports("other-key").download(ticket, 2000));
  assert.throws(() => exports.download(`X${ticket.slice(1)}`, 2000));
});

test("starter cases use revision-checked persistence and cannot be self-resolved", async t => {
  const { state } = fixture();
  let row = { user_id: "alice", revision: 1, workspace: { ownerId: "alice", people: {}, state } };
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input), table = url.pathname.split("/").at(-1);
    if (table === "app_revision") return Response.json([{ revision: 1 }]);
    if (table !== "account_starter_workspaces") return Response.json([]);
    if (init.method === "PATCH") {
      assert.equal(url.searchParams.get("revision"), `eq.${row.revision}`);
      row = { ...row, ...JSON.parse(init.body) }; return Response.json([row]);
    }
    return Response.json([row]);
  });
  const store = createProductionStore({ url: "https://test.supabase.co", key: "private", moderatorIds: ["mod", "alice"] });
  const body = { dispute: state.disputes[0].id, resolution: "Full release", reason: "Evidence confirms that the complete service was delivered." };
  await assert.rejects(store.resolve({ userId: "alice" }, body), /different moderator/);
  await store.resolve({ userId: "mod" }, body);
  assert.equal(row.revision, 2);
  assert.equal(row.workspace.state.disputes[0].status, "Resolved");
  await assert.rejects(store.resolve({ userId: "mod" }, body), /already resolved/);
});
