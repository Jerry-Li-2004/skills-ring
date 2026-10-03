import assert from "node:assert/strict";
import test from "node:test";
import { createCloudAuthenticator } from "./cloud-auth.mjs";
import { createProductionStore } from "./production-store.mjs";

test("cloud authentication requires a verified, active identity and never maps by display name", async t => {
  const calls = [];
  const auth = createCloudAuthenticator({ url: "https://test.supabase.co", publishableKey: "public", serviceKey: "private" });
  let user = { id: "actual", email: "test@example.invalid", email_confirmed_at: null, user_metadata: { name: "Alice" } };
  t.mock.method(globalThis, "fetch", async input => {
    calls.push(String(input));
    return Response.json(String(input).includes("/auth/") ? user : [{ user_id: "usr_actual", name: "Alice", status: "Active" }]);
  });
  assert.equal(await auth({ headers: {} }), null);
  assert.equal(calls.length, 0);
  assert.equal(await auth({ headers: { authorization: "Bearer test" } }), null);
  user.email_confirmed_at = new Date().toISOString();
  assert.equal((await auth({ headers: { authorization: "Bearer test" } })).userId, "usr_actual");
  assert.match(calls.at(-1), /user_id=eq.usr_actual/);
});

test("snapshot hides other members' exchanges, sessions, and rankings", async t => {
  t.mock.method(globalThis, "fetch", async input => {
    const table = new URL(input).pathname.split("/").at(-1);
    const rows = {
      app_revision: [{ revision: 1 }],
      users: [{ user_id: "usr_me", name: "Me", status: "Active" }],
      exchanges: [{ exchange_id: "mine" }, { exchange_id: "private" }],
      exchange_participants: [{ exchange_id: "mine", user_id: "usr_me" }, { exchange_id: "private", user_id: "usr_other" }],
      sessions: [{ exchange_id: "private" }, { exchange_id: "mine" }],
      completion_bonds: [{ exchange_id: "private" }, { exchange_id: "mine" }],
      bond_ledger_entries: [{ exchange_id: "private" }, { exchange_id: "mine" }],
      recommendation_rankings: [{ target_user_id: "usr_me" }, { target_user_id: "usr_other" }],
    };
    return Response.json(rows[table] || []);
  });
  const store = createProductionStore({ url: "https://test.supabase.co", key: "private" });
  const data = await store.snapshot({ userId: "usr_me" });
  assert.deepEqual(data.exchanges, [{ exchange_id: "mine" }]);
  assert.deepEqual(data.sessions, [{ exchange_id: "mine" }]);
  assert.deepEqual(data.completion_bonds, [{ exchange_id: "mine" }]);
  assert.deepEqual(data.bond_ledger_entries, [{ exchange_id: "mine" }]);
  assert.equal(data.recommendation_rankings.length, 1);
});

test("server rejects forged actors, moderator actions, and foreign listings before writes", async t => {
  const writes = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    if (init.method !== "GET") writes.push(input);
    return Response.json(String(input).includes("app_revision") ? [{ revision: 1 }] : []);
  });
  const store = createProductionStore({ url: "https://test.supabase.co", key: "private" });
  const account = { userId: "usr_me" };
  await assert.rejects(store.exchange(account, { action: { type: "resolve" } }, "x"), /moderator/);
  await assert.rejects(store.exchange(account, { action: { type: "confirm", user: "usr_other" } }, "x"), /signed-in/);
  await assert.rejects(store.exchange(account, { action: { type: "confirm", user: "usr_me", exchange: "x" } }, "x"), /participant/);
  await assert.rejects(store.listing(account, { user: "usr_other" }, "x"), /own listings/);
  assert.deepEqual(writes, []);
});

test("listing writes are committed together with the snapshot revision", async t => {
  const writes = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    if (init.method === "POST") { writes.push(JSON.parse(init.body)); return Response.json(8); }
    return Response.json(String(input).includes("app_revision") ? [{ revision: 7 }] : []);
  });
  const store = createProductionStore({ url: "https://test.supabase.co", key: "private" });
  await store.listing({ userId: "usr_me" }, { user: "usr_me", skill: "Python", category: "Programming", status: "Active" }, "listing", async (_a, _b, _id, write) => {
    await write({ table: "offers", method: "POST", body: { offer_id: "listing" } });
    await write({ table: "offer_availability", method: "DELETE", query: { offer_id: "eq.listing" } });
    return { id: "listing" };
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].expected_revision, 7);
  assert.equal(writes[0].operations.length, 2);
});
