import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, rmdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
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
