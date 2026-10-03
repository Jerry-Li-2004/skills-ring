import assert from "node:assert/strict";
import test from "node:test";
import { once } from "node:events";
import { createAuthServer } from "./app.mjs";
import { createRegistration } from "./registration.mjs";

test("complete registration opens the API without passwords or confirmation and survives a server restart", async t => {
  const profiles = new Map();
  const starters = new Map();
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = new URL(input);
    if (url.hostname !== "registration.supabase.test") return realFetch(input, init);
    if (init.method === "POST") {
      assert.equal(url.pathname, "/rest/v1/rpc/register_with_starter");
      const body = JSON.parse(init.body);
      const row = { user_id: body.profile_id, name: body.display_name, status: "Active" };
      profiles.set(row.user_id, row);
      starters.set(row.user_id, body.starter);
      return new Response(null, { status: 201 });
    }
    const row = profiles.get(url.searchParams.get("user_id").slice(3));
    return Response.json(row ? [row] : []);
  });
  const config = { url: "https://registration.supabase.test", key: "server-only-test-key" };
  const registration = createRegistration(config);
  const server = createAuthServer({ ...registration });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const register = body => fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  for (const body of [{}, { name: "  ", email: "test@example.com" }, { name: "Test", email: "bad" }]) {
    assert.equal((await register(body)).status, 400);
  }
  assert.equal(profiles.size, 0);
  const response = await register({ name: " Test   Person ", email: " TEST@example.com " });
  assert.equal(response.status, 201);
  const { user, token } = await response.json();
  assert.equal(user.name, "Test Person");
  assert.equal(starters.get(user.userId).ownerId, user.userId);
  assert.equal(starters.get(user.userId).people[user.userId], user.name);
  assert.equal(starters.get(user.userId).state.exchanges.length, 1);
  assert.equal(user.email, "test@example.com");
  const headers = { authorization: `Bearer ${token}` };
  const me = await fetch(`${base}/api/auth/me`, { headers });
  assert.equal(me.status, 200);
  assert.deepEqual((await me.json()).user, { ...user, moderator: false });
  assert.deepEqual(await createRegistration(config).authenticate({ headers }), user);
  assert.equal(await registration.authenticate({ headers: {} }), null);
  assert.equal(await registration.authenticate({ headers: { authorization: `Bearer ${token}x` } }), null);
  const duplicate = await (await register({ name: user.name, email: user.email })).json();
  assert.notEqual(duplicate.user.userId, user.userId);
  profiles.get(user.userId).status = "Inactive";
  assert.equal(await registration.authenticate({ headers }), null);
});
