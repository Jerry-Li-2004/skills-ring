import { createHash, randomBytes, randomUUID, scrypt as callbackScrypt, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";

const scrypt = promisify(callbackScrypt);
const schema = readFileSync(new URL("./schema.sql", import.meta.url), "utf8");
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = "sr_session";
const MAX_BODY = 16_384;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 12;

export function openAuthDatabase(path, { requireBusinessSchema = false } = {}) {
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
  if (requireBusinessSchema) {
    const tables = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((row) => row.name));
    if (!["users", "offers", "needs"].every((table) => tables.has(table))) {
      db.close();
      throw new Error("Expected a full Skills-Ring database with users, offers, and needs tables.");
    }
  }
  db.exec(schema);
  return db;
}

function json(res, code, data, headers = {}) {
  res.writeHead(code, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  if (!req.headers["content-type"]?.startsWith("application/json")) {
    throw new Error("Content type must be application/json.");
  }
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY) throw new Error("Request is too large.");
    chunks.push(chunk);
  }
  const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Invalid request body.");
  }
  return value;
}

function normalizeEmail(value) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function validPassword(value) {
  return typeof value === "string" && value.length >= PASSWORD_MIN &&
    value.length <= PASSWORD_MAX && Buffer.byteLength(value, "utf8") <= 1024;
}

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 80 ? name : null;
}

async function passwordDigest(password, salt) {
  return scrypt(password, salt, 64, { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 });
}

function tokenHash(token) {
  return createHash("sha256").update(token).digest("hex");
}

function newSession(db, userId) {
  const token = randomBytes(32).toString("base64url");
  db.prepare("DELETE FROM auth_sessions WHERE expires_at<=?").run(new Date().toISOString());
  db.prepare("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES(?,?,?)")
    .run(tokenHash(token), userId, new Date(Date.now() + SESSION_MS).toISOString());
  return token;
}

function sessionCookie(token, secure, expired = false) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${expired ? 0 : SESSION_MS / 1000}${secure ? "; Secure" : ""}`;
}

function cookieToken(req) {
  const entry = req.headers.cookie?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`));
  return entry?.slice(COOKIE.length + 1) || null;
}

function currentUser(db, req) {
  const token = cookieToken(req);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return db.prepare(`
    SELECT u.user_id AS userId, u.name, u.status, a.email
    FROM auth_sessions s
    JOIN users u ON u.user_id=s.user_id
    JOIN auth_credentials a ON a.user_id=u.user_id
    WHERE s.token_hash=? AND s.expires_at>? AND u.status='Active'
  `).get(tokenHash(token), new Date().toISOString()) || null;
}

export function createAuthServer({ db, publicOrigin, secureCookies = false, serveStatic } = {}) {
  if (!db) throw new Error("Database is required.");
  const attempts = new Map();

  function allowed(req) {
    const origin = req.headers.origin;
    const expected = publicOrigin || `http://${req.headers.host}`;
    return typeof origin === "string" && origin === expected;
  }

  function limited(req) {
    const ip = req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = attempts.get(ip);
    if (!entry || now - entry.started > RATE_WINDOW_MS) {
      attempts.set(ip, { started: now, count: 1 });
      return false;
    }
    entry.count += 1;
    return entry.count > RATE_LIMIT;
  }

  async function handle(req, res) {
    const path = new URL(req.url || "/", "http://localhost").pathname;
    if (!path.startsWith("/api/")) {
      if (serveStatic) return serveStatic(req, res, path);
      return json(res, 404, { error: "Not found." });
    }
    if (!path.startsWith("/api/auth/")) return json(res, 404, { error: "Not found." });
    if (req.method === "GET" && path === "/api/auth/me") {
      const user = currentUser(db, req);
      return user ? json(res, 200, { user }) : json(res, 401, { error: "Not signed in." });
    }
    if (req.method !== "POST") return json(res, 405, { error: "Method not allowed." });
    if (!allowed(req)) return json(res, 403, { error: "Invalid request origin." });

    if (path === "/api/auth/logout") {
      const token = cookieToken(req);
      if (token) db.prepare("DELETE FROM auth_sessions WHERE token_hash=?").run(tokenHash(token));
      return json(res, 200, { ok: true }, { "Set-Cookie": sessionCookie("", secureCookies, true) });
    }
    if (!['/api/auth/register', '/api/auth/login'].includes(path)) {
      return json(res, 404, { error: "Not found." });
    }
    if (limited(req)) return json(res, 429, { error: "Too many attempts. Try again later." });

    let body;
    try {
      body = await readJson(req);
    } catch {
      return json(res, 400, { error: "Invalid request body." });
    }
    const email = normalizeEmail(body.email);
    if (!email || !validPassword(body.password)) {
      return json(res, 400, { error: `Enter a valid email and a password of ${PASSWORD_MIN}–${PASSWORD_MAX} characters.` });
    }

    if (path === "/api/auth/register") {
      const name = normalizeName(body.name);
      if (!name) return json(res, 400, { error: "Name must be 2–80 characters." });
      const salt = randomBytes(16).toString("hex");
      const hash = (await passwordDigest(body.password, salt)).toString("hex");
      const userId = `usr_${randomUUID()}`;
      let token;
      let transactionStarted = false;
      try {
        db.exec("BEGIN IMMEDIATE");
        transactionStarted = true;
        db.prepare("INSERT INTO users(user_id,name) VALUES(?,?)").run(userId, name);
        db.prepare("INSERT INTO auth_credentials(user_id,email,password_salt,password_hash) VALUES(?,?,?,?)")
          .run(userId, email, salt, hash);
        token = newSession(db, userId);
        db.exec("COMMIT");
        transactionStarted = false;
      } catch (error) {
        if (transactionStarted) db.exec("ROLLBACK");
        if (String(error?.message).includes("UNIQUE constraint failed")) {
          return json(res, 409, { error: "Unable to create account with these details." });
        }
        throw error;
      }
      return json(res, 201, { user: { userId, name, email, status: "Active" } },
        { "Set-Cookie": sessionCookie(token, secureCookies) });
    }

    const account = db.prepare(`
      SELECT u.user_id AS userId,u.name,u.status,a.email,a.password_salt AS salt,a.password_hash AS hash
      FROM auth_credentials a JOIN users u ON u.user_id=a.user_id WHERE a.email=?
    `).get(email);
    const salt = account?.salt || "00000000000000000000000000000000";
    const expected = account?.hash || "00".repeat(64);
    const actual = await passwordDigest(body.password, salt);
    const valid = timingSafeEqual(actual, Buffer.from(expected, "hex"));
    if (!account || !valid || account.status !== "Active") {
      return json(res, 401, { error: "Email or password is incorrect." });
    }
    const token = newSession(db, account.userId);
    const { userId, name, status } = account;
    return json(res, 200, { user: { userId, name, email, status } },
      { "Set-Cookie": sessionCookie(token, secureCookies) });
  }

  return createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) json(res, 500, { error: "Server error. Please try again." });
      else res.destroy();
    });
  });
}
