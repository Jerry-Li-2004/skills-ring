import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:http";
import { createAuthServer, openAuthDatabase } from "./app.mjs";

test("register, persist, sign in, reject invalid access, and sign out", async () => {
  const dir = await mkdtemp(join(tmpdir(), "skills-ring-auth-test-"));
  const path = join(dir, "auth.db");
  let db = openAuthDatabase(path);
  let server = createAuthServer({ db });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  let origin = `http://127.0.0.1:${server.address().port}`;
  const post = (route, body, cookie, originHeader = origin) => fetch(`${origin}/api/auth/${route}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: originHeader, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });

  try {
    const password = "pass1234";
    let result = await post("register", { name: "Test User", email: " Test@Example.com ", password: "short7!" });
    assert.equal(result.status, 400);
    assert.match((await result.json()).error, /8–128 characters/);
    result = await post("register", { name: "Test User", email: " Test@Example.com ", password });
    assert.equal(result.status, 201);
    const account = (await result.json()).user;
    assert.match(account.userId, /^usr_[0-9a-f-]{36}$/);
    assert.equal(account.email, "test@example.com");
    const cookieHeader = result.headers.get("set-cookie");
    assert.match(cookieHeader, /HttpOnly/);
    assert.match(cookieHeader, /SameSite=Strict/);
    let cookie = cookieHeader.split(";")[0];
    assert.equal(db.prepare("SELECT name FROM users WHERE user_id=?").get(account.userId).name, "Test User");
    const credentials = db.prepare("SELECT password_hash,password_salt FROM auth_credentials WHERE user_id=?").get(account.userId);
    assert.notEqual(credentials.password_hash, password);
    assert.equal(credentials.password_hash.length, 128);
    assert.equal(credentials.password_salt.length, 32);

    result = await fetch(`${origin}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(result.status, 200);
    assert.equal((await result.json()).user.userId, account.userId);
    result = await post("register", { name: "Duplicate", email: "test@example.com", password });
    assert.equal(result.status, 409);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 1);
    result = await post("login", { email: "test@example.com", password: "incorrect password 123456" });
    assert.equal(result.status, 401);
    result = await post("login", { email: "test@example.com", password }, undefined, "http://evil.example");
    assert.equal(result.status, 403);

    server.close();
    await once(server, "close");
    db.close();
    db = openAuthDatabase(path);
    server = createAuthServer({ db });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    origin = `http://127.0.0.1:${server.address().port}`;
    result = await post("login", { email: "TEST@example.com", password });
    assert.equal(result.status, 200);
    cookie = result.headers.get("set-cookie").split(";")[0];
    result = await post("logout", {}, cookie);
    assert.equal(result.status, 200);
    result = await fetch(`${origin}/api/auth/me`, { headers: { Cookie: cookie } });
    assert.equal(result.status, 401);
    db.prepare("UPDATE users SET status='Suspended' WHERE user_id=?").run(account.userId);
    result = await post("login", { email: "test@example.com", password });
    assert.equal(result.status, 401);
  } finally {
    if (server.listening) {
      server.close();
      await once(server, "close");
    }
    db.close();
    await unlink(path);
    await rmdir(dir);
  }
});

test("authentication schema extends an existing users table without replacing records", async () => {
  const dir = await mkdtemp(join(tmpdir(), "skills-ring-existing-users-test-"));
  const path = join(dir, "existing.db");
  const existing = new DatabaseSync(path);
  existing.exec(`CREATE TABLE users (
    user_id TEXT PRIMARY KEY, name TEXT NOT NULL, avatar_url TEXT,
    status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Suspended','Deleted')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  ); INSERT INTO users(user_id,name) VALUES('u1','Synthetic Alice');`);
  existing.close();
  let server;
  let db;
  try {
    assert.throws(() => openAuthDatabase(path, { requireBusinessSchema: true }), /full Skills-Ring database/);
    const schemaDb = new DatabaseSync(path);
    schemaDb.exec("CREATE TABLE offers(offer_id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(user_id)); CREATE TABLE needs(need_id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(user_id));");
    schemaDb.close();
    db = openAuthDatabase(path, { requireBusinessSchema: true });
    assert.equal(db.prepare("SELECT name FROM users WHERE user_id='u1'").get().name, "Synthetic Alice");
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM auth_credentials").get().count, 0);
    server = createAuthServer({ db });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const origin = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${origin}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ name: "Real Newcomer", email: "new@example.com", password: "a unique long passphrase 2026" }),
    });
    assert.equal(response.status, 201);
    const newUserId = (await response.json()).user.userId;
    db.prepare("INSERT INTO offers(offer_id,user_id) VALUES(?,?)").run("new-offer", newUserId);
    db.prepare("INSERT INTO needs(need_id,user_id) VALUES(?,?)").run("new-need", newUserId);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM users").get().count, 2);
    assert.equal(db.prepare("SELECT user_id FROM offers WHERE offer_id='new-offer'").get().user_id, newUserId);
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
  } finally {
    if (server?.listening) {
      server.close();
      await once(server, "close");
    }
    db?.close();
    await unlink(path);
    await rmdir(dir);
  }
});

test("mirrors registration and listing changes into Supabase and refreshes recommendations", async () => {
  const dir = await mkdtemp(join(tmpdir(), "skills-ring-live-test-"));
  const path = join(dir, "live.db");
  const db = openAuthDatabase(path);
  db.exec("CREATE TABLE offers (offer_id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(user_id)); CREATE TABLE needs (need_id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(user_id));");
  const tables = {
    users: [],
    categories: [{ category_id: "c1", category_name: "Programming", status: "Active" }],
    skills: [{ skill_id: "s1", category_id: "c1", skill_name: "Python", status: "Active" }],
    time_slots: [{ slot_id: 1, slot_name: "Saturday Afternoon" }],
    offers: [], needs: [], offer_availability: [], need_availability: [],
    reliability_history: [], current_user_reliability: [],
    matches: [], recommendation_rankings: [],
  };
  let recommenderRuns = 0;
  const supabase = createServer(async (req, res) => {
    const url = new URL(req.url, "http://supabase.test");
    const table = url.pathname.split("/").pop();
    const rows = tables[table] || [];
    const filter = Object.entries(Object.fromEntries(url.searchParams))
      .find(([key, value]) => key !== "select" && key !== "limit" && key !== "offset" && value.startsWith("eq."));
    const filtered = filter ? rows.filter((row) => String(row[filter[0]]) === filter[1].slice(3)) : rows;
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(filtered));
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : [];
    if (req.method === "DELETE") {
      if (filter) tables[table] = rows.filter((row) => String(row[filter[0]]) !== filter[1].slice(3));
      res.writeHead(204).end();
      return;
    }
    const incoming = Array.isArray(payload) ? payload : [payload];
    const key = table === "users" ? "user_id" : table === "skills" ? "skill_id" : table === "offers" ? "offer_id" : table === "offer_availability" ? "offer_id" : null;
    for (const row of incoming) {
      const index = key ? rows.findIndex((existing) => existing[key] === row[key]) : -1;
      if (index >= 0) rows[index] = { ...rows[index], ...row };
      else rows.push(row);
    }
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end("[]");
  });
  let api;
  try {
    supabase.listen(0, "127.0.0.1");
    await once(supabase, "listening");
    const supabaseUrl = `http://127.0.0.1:${supabase.address().port}`;
    api = createAuthServer({
      db,
      supabaseUrl,
      supabaseKey: "test-key",
      runRecommender: async () => {
        recommenderRuns += 1;
        if (recommenderRuns === 2) {
          tables.matches.push({ match_id: "live-match-1", match_type: "Direct" });
          tables.recommendation_rankings.push({ match_id: "live-match-1", target_user_id: tables.users[0].user_id, rank_position: 1 });
        }
      },
    });
    api.listen(0, "127.0.0.1");
    await once(api, "listening");
    const origin = `http://127.0.0.1:${api.address().port}`;
    const post = (route, body, cookie) => fetch(`${origin}${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
    const registration = await post("/api/auth/register", { name: "Live User", email: "live@example.com", password: "a unique long passphrase" });
    assert.equal(registration.status, 201);
    const cookie = registration.headers.get("set-cookie").split(";")[0];
    const account = (await registration.json()).user;
    assert.equal(tables.users[0].user_id, account.userId);

    const listing = await fetch(`${origin}/api/live/listings/live-offer-1`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
      body: JSON.stringify({
        id: "live-offer-1", kind: "offer", category: "Programming", skill: "Python",
        duration: 60, sessions: 2, mode: "Online", location: "Anywhere",
        availability: ["Saturday Afternoon"], level: 2, conditions: "",
      }),
    });
    assert.equal(listing.status, 200);
    assert.equal(tables.offers[0].user_id, account.userId);
    assert.deepEqual(tables.offer_availability, [{ offer_id: "live-offer-1", slot_id: 1 }]);
    assert.equal(recommenderRuns, 2);

    const snapshot = await fetch(`${origin}/api/live/snapshot`, { headers: { Cookie: cookie } });
    assert.equal(snapshot.status, 200);
    const live = await snapshot.json();
    assert.equal(live.source, "supabase");
    assert.equal(live.matches[0].match_id, "live-match-1");
    assert.equal(live.recommendation_rankings[0].rank_position, 1);
  } finally {
    if (api?.listening) { api.close(); await once(api, "close"); }
    if (supabase.listening) { supabase.close(); await once(supabase, "close"); }
    db.close();
    await unlink(path);
    await rmdir(dir);
  }
});

test("persists live exchange proposals, account confirmations, and completed sessions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "skills-ring-exchange-test-"));
  const path = join(dir, "exchange.db");
  const db = openAuthDatabase(path);
  db.exec("CREATE TABLE offers (offer_id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(user_id)); CREATE TABLE needs (need_id TEXT PRIMARY KEY, user_id TEXT REFERENCES users(user_id));");
  const tables = {
    users: [{ user_id: "u2", name: "Second Member", status: "Active" }],
    categories: [], skills: [{ skill_id: "s1", skill_name: "Python" }, { skill_id: "s2", skill_name: "Tennis" }],
    skill_values: [{ skill_value_id: "sv1", skill_id: "s1", base_value: 1 }, { skill_value_id: "sv2", skill_id: "s2", base_value: 1 }],
    system_config: [{ config_key: "bond_reference_hourly_hkd", config_value: "200" }, { config_key: "completion_bond_rate", config_value: "0.20" }], time_slots: [],
    offers: [
      { offer_id: "o-second", user_id: "u2", skill_id: "s2" },
    ],
    needs: [
      { need_id: "n-second", user_id: "u2", skill_id: "s1" },
    ],
    offer_availability: [], need_availability: [], reliability_history: [], current_user_reliability: [],
    exchanges: [], exchange_legs: [], exchange_confirmations: [], exchange_participants: [], commitments: [], sessions: [], contributions: [], completion_bonds: [], bond_ledger_entries: [],
  };
  let recommenderRuns = 0;
  const keyFor = (table) => ({ users: "user_id", skills: "skill_id", offers: "offer_id", needs: "need_id", exchanges: "exchange_id", exchange_legs: "leg_id", exchange_confirmations: "user_id", exchange_participants: "user_id", commitments: "commitment_id", sessions: "session_id", contributions: "contribution_id", completion_bonds: "bond_id", bond_ledger_entries: "entry_id" }[table]);
  const supabase = createServer(async (req, res) => {
    const url = new URL(req.url, "http://supabase.test");
    const table = url.pathname.split("/").pop();
    const rows = tables[table] || [];
    const filters = Object.entries(Object.fromEntries(url.searchParams))
      .filter(([key, value]) => key !== "select" && key !== "limit" && key !== "offset" && value.startsWith("eq."));
    const matches = (row) => filters.every(([key, value]) => String(row[key]) === value.slice(3));
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(rows.filter(matches)));
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = body ? JSON.parse(body) : [];
    if (req.method === "DELETE") {
      tables[table] = rows.filter((row) => !matches(row));
      res.writeHead(204).end();
      return;
    }
    const incoming = Array.isArray(payload) ? payload : [payload];
    const key = keyFor(table);
    for (const row of incoming) {
      const index = key ? rows.findIndex((existing) => existing[key] === row[key] && (table !== "exchange_confirmations" || existing.exchange_id === row.exchange_id) && (table !== "exchange_participants" || existing.exchange_id === row.exchange_id)) : -1;
      if (index >= 0) rows[index] = { ...rows[index], ...row };
      else rows.push(row);
    }
    res.writeHead(201, { "Content-Type": "application/json" });
    res.end("[]");
  });
  let api;
  try {
    supabase.listen(0, "127.0.0.1");
    await once(supabase, "listening");
    api = createAuthServer({
      db,
      supabaseUrl: `http://127.0.0.1:${supabase.address().port}`,
      supabaseKey: "test-key",
      runRecommender: async () => { recommenderRuns += 1; },
    });
    api.listen(0, "127.0.0.1");
    await once(api, "listening");
    const origin = `http://127.0.0.1:${api.address().port}`;
    const registration = await fetch(`${origin}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ name: "First Member", email: "first@example.com", password: "a unique long passphrase" }),
    });
    assert.equal(registration.status, 201);
    const account = (await registration.json()).user;
    const cookie = registration.headers.get("set-cookie").split(";")[0];
    tables.offers.push({ offer_id: "o-first", user_id: account.userId, skill_id: "s1" });
    tables.needs.push({ need_id: "n-first", user_id: account.userId, skill_id: "s2" });
    const exchange = {
      id: "exchange-live-test",
      title: "Python & Tennis",
      legs: [
        { id: "o-first:n-second", offer: "o-first", need: "n-second", provider: account.userId, receiver: "u2", skill: "Python", duration: 60, sessions: 1, availability: "Saturday Afternoon", mode: "Online", location: "Anywhere", capacity: 1 },
        { id: "o-second:n-first", offer: "o-second", need: "n-first", provider: "u2", receiver: account.userId, skill: "Tennis", duration: 60, sessions: 1, availability: "Saturday Afternoon", mode: "Online", location: "Anywhere", capacity: 1 },
      ],
      confirmations: [], status: "proposed", audit: ["Exchange proposed."], amendments: [],
      bonds: [
        { id: "bond-1", exchange: "exchange-live-test", leg: "o-first:n-second", owner: account.userId, currency: "HKD", reference_value: 200, rate: 0.2, amount: 40, status: "Calculated", returned_amount: 0, applied_amount: 0, terms_version: "simulated-hkd-v1" },
        { id: "bond-2", exchange: "exchange-live-test", leg: "o-second:n-first", owner: "u2", currency: "HKD", reference_value: 200, rate: 0.2, amount: 40, status: "Calculated", returned_amount: 0, applied_amount: 0, terms_version: "simulated-hkd-v1" },
      ],
      bondLedger: [
        { id: "bond-entry-1", bond: "bond-1", exchange: "exchange-live-test", event: "CALCULATED", amount: 40, reason: "Calculated for test.", created_at: new Date().toISOString() },
        { id: "bond-entry-2", bond: "bond-2", exchange: "exchange-live-test", event: "CALCULATED", amount: 40, reason: "Calculated for test.", created_at: new Date().toISOString() },
      ],
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
    };
    let response = await fetch(`${origin}/api/live/exchanges/${exchange.id}`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
      body: JSON.stringify({ action: "propose", exchange }),
    });
    assert.equal(response.status, 201);
    assert.equal(tables.exchanges.length, 1);
    assert.equal(tables.exchange_legs.length, 2);
    assert.equal(tables.exchange_participants.length, 2);

    const confirmed = { ...exchange, status: "confirmed", confirmations: [account.userId], bonds: exchange.bonds.map((bond) => ({ ...bond, status: "Held" })), bondLedger: [...exchange.bondLedger, ...exchange.bonds.map((bond, index) => ({ id: `bond-held-${index}`, bond: bond.id, exchange: exchange.id, event: "HELD", amount: bond.amount, reason: "Held for test.", created_at: new Date().toISOString() }))] };
    response = await fetch(`${origin}/api/live/exchanges/${exchange.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
      body: JSON.stringify({ action: "confirm", exchange: confirmed }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(tables.exchange_confirmations.map((row) => row.user_id), [account.userId]);

    const completed = { ...confirmed, status: "active" };
    response = await fetch(`${origin}/api/live/exchanges/${exchange.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", Origin: origin, Cookie: cookie },
      body: JSON.stringify({
        action: "complete", exchange: completed,
        sessions: [{ id: "session-live-test", exchange: exchange.id, leg: "o-first:n-second", provider: account.userId, receiver: "u2", skill: "Python", duration: 60, actual_duration: 60, scheduled_time: "Saturday Afternoon", notes: "Completed in integration test." }],
        contributions: [{ id: "contribution-live-test", session: "session-live-test", exchange: exchange.id, provider: account.userId, receiver: "u2", skill: "Python", duration: 60, created_at: new Date().toISOString() }],
      }),
    });
    assert.equal(response.status, 200);
    assert.equal(tables.commitments.length, 2);
    assert.equal(tables.sessions[0].session_id, "session-live-test");
    assert.equal(tables.sessions[0].exchange_leg_id, "o-first:n-second");
    assert.equal(tables.contributions[0].contribution_id, "contribution-live-test");
    assert.equal(recommenderRuns, 4);
  } finally {
    if (api?.listening) { api.close(); await once(api, "close"); }
    if (supabase.listening) { supabase.close(); await once(supabase, "close"); }
    db.close();
    await unlink(path);
    await rmdir(dir);
  }
});
