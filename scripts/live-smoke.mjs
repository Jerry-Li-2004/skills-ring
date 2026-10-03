import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const origin = process.argv[2] || "http://127.0.0.1:3001";
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = randomUUID();
const accounts = [];
const listingIds = [];
let exchangeId;
const rest = async (table, method, query) => {
  const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(query)}`, { method, headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!response.ok) throw new Error(`Cleanup ${table}: ${response.status}`);
};
async function api(path, account, body) {
  const response = await fetch(`${origin}${path}`, { method: body ? "PATCH" : "GET", headers: { ...(account ? { Authorization: `Bearer ${account.token}` } : {}), "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  return { status: response.status, data };
}
try {
  assert.ok(["registration", "supabase"].includes((await api("/api/health")).data.auth));
  assert.equal((await api("/api/live/snapshot")).status, 401);
  for (let i = 0; i < 2; i++) {
    const email = `deployment-${tag}-${i}@example.invalid`;
    const password = randomUUID() + "Aa9!";
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: `Deployment Check ${i}` } });
    if (error) throw error;
    const account = { id: data.user.id, userId: `usr_${data.user.id}` };
    accounts.push(account);
    const auth = createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const signed = await auth.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    account.token = signed.data.session.access_token;
    if (i === 0) {
      const link = await admin.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo: "https://skills-ring.vercel.app" } });
      if (link.error) throw link.error;
      const redirect = new URL(link.data.properties.action_link).searchParams.get("redirect_to");
      console.log(`Auth recovery redirect: ${redirect}`);
    }
    const snapshot = await api("/api/live/snapshot", account);
    assert.equal(snapshot.status, 200, JSON.stringify(snapshot.data));
    assert.equal(snapshot.data.liveUserId, account.userId);
    assert.equal(snapshot.data.exchanges.length, 0);
  }
  console.log("PASS: health, unauthenticated rejection, Supabase sign-in and exact profile mapping");
  const base = { category: "Programming", skill: "Python", duration: 30, sessions: 1, level: 1, mode: "Online", location: `Test-${tag}`, conditions: "", availability: ["Weekday Evening"], status: "Active" };
  const initial = (await api("/api/live/snapshot", accounts[0])).data;
  base.availability = [initial.time_slots[0].slot_name];
  for (const account of accounts) {
    for (const kind of ["offer", "need"]) {
      const id = `smoke_${kind}_${randomUUID()}`;
      listingIds.push({ id, kind });
      const result = await api(`/api/live/listings/${id}`, account, { ...base, id, kind, user: account.userId });
      assert.equal(result.status, 200, JSON.stringify(result.data));
      assert.equal(result.data.listing.warning, null, JSON.stringify(result.data));
    }
  }
  console.log("PASS: transactional listing writes and Python recommendation refresh");
  const snapshot = (await api("/api/live/snapshot", accounts[0])).data;
  const { liveSnapshotToState } = await import("../server/generated/live-snapshot.mjs");
  const state = liveSnapshotToState(snapshot);
  const route = state.liveMatches[accounts[0].userId]?.find(legs => legs.every(leg => accounts.some(a => a.userId === leg.provider)));
  assert.ok(route, "Python worker should rank the two test users' reciprocal listings");
  const proposal = await api(`/api/live/exchanges/${randomUUID()}`, accounts[0], { action: { type: "propose", legs: route } });
  assert.equal(proposal.status, 200, JSON.stringify(proposal.data));
  exchangeId = proposal.data.exchange.exchangeId;
  const forged = await api(`/api/live/exchanges/${exchangeId}`, accounts[0], { action: { type: "confirm", exchange: exchangeId, user: accounts[1].userId } });
  assert.equal(forged.status, 422);
  for (const account of accounts) {
    const result = await api(`/api/live/exchanges/${exchangeId}`, account, { action: { type: "confirm", exchange: exchangeId, user: account.userId } });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    console.log("PASS: participant confirmation saved");
  }
  let confirmed = liveSnapshotToState((await api("/api/live/snapshot", accounts[0])).data);
  assert.equal(confirmed.exchanges[0].status, "confirmed");
  for (const account of accounts) {
    const leg = confirmed.exchanges[0].legs.find(l => l.provider === account.userId);
    const result = await api(`/api/live/exchanges/${exchangeId}`, account, { action: { type: "complete", exchange: exchangeId, leg: leg.id, notes: "Deployment smoke test" } });
    assert.equal(result.status, 200, JSON.stringify(result.data));
  }
  confirmed = liveSnapshotToState((await api("/api/live/snapshot", accounts[0])).data);
  assert.equal(confirmed.exchanges[0].status, "settled");
  assert.equal(confirmed.sessions.length, 2);
  console.log("PASS: proposal, anti-impersonation, independent confirmations, completion and settlement");
} finally {
  // Remove only this run's records; never reset or reseed the shared project.
  if (exchangeId) {
    for (const table of ["contributions", "sessions", "commitments", "exchange_confirmations", "exchange_participants", "exchange_legs", "exchange_matches", "exchanges"]) await rest(table, "DELETE", { exchange_id: `eq.${exchangeId}` });
  }
  for (const account of accounts) {
    await rest("recommendation_rankings", "DELETE", { target_user_id: `eq.${account.userId}` });
    for (const col of ["user_a", "user_b", "user_c"]) {
      const { data } = await admin.from("matches").select("match_id").eq(col, account.userId);
      for (const match of data || []) {
        await rest("recommendation_rankings", "DELETE", { match_id: `eq.${match.match_id}` });
        await rest("matches", "DELETE", { match_id: `eq.${match.match_id}` });
      }
    }
    for (const table of ["offers", "needs"]) await rest(table, "DELETE", { user_id: `eq.${account.userId}` });
    await rest("users", "DELETE", { user_id: `eq.${account.userId}` });
    const { error } = await admin.auth.admin.deleteUser(account.id);
    if (error) throw error;
  }
  console.log("Temporary test accounts and records removed.");
}
