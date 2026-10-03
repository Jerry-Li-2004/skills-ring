import { createHash, randomBytes, randomUUID, scrypt as callbackScrypt, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const scrypt = promisify(callbackScrypt);
const execFileAsync = promisify(execFile);

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const COOKIE = "sr_session";
const MAX_BODY = 16_384;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 12;
const DEFAULT_SUPABASE_URL = "https://mwyictnozocjicjeacqk.supabase.co";
const LIVE_TABLES = [
  "users",
  "categories",
  "skills",
  "skill_values",
  "system_config",
  "time_slots",
  "offers",
  "needs",
  "offer_availability",
  "need_availability",
  "reliability_history",
  "current_user_reliability",
  "exchanges",
  "exchange_matches",
  "matches",
  "recommendation_rankings",
  "exchange_participants",
  "exchange_legs",
  "exchange_confirmations",
  "sessions",
  "contributions",
  "completion_bonds",
  "bond_ledger_entries",
];
const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const RECOMMENDER_SCRIPT = fileURLToPath(new URL("../raw-database/main.py", import.meta.url));

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
  db.exec(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
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

export async function supabaseRequest({ url, key, table, method = "GET", query = {}, body, prefer }) {
  const target = new URL(`/rest/v1/${table}`, url);
  for (const [name, value] of Object.entries(query)) target.searchParams.set(name, value);
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(target, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  let parsed = null;
  if (text) {
    try { parsed = JSON.parse(text); } catch { parsed = text; }
  }
  if (!response.ok) {
    const detail = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`Supabase ${method} ${table} returned ${response.status}: ${detail.slice(0, 300)}`);
  }
  return parsed;
}

export async function fetchSupabaseTable({ url, key, table }) {
  const rows = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const page = await supabaseRequest({
      url,
      key,
      table,
      query: { select: "*", limit: String(pageSize), offset: String(offset) },
    }) || [];
    if (!Array.isArray(page)) throw new Error(`Supabase ${table} returned an invalid response.`);
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

async function runRecommenderJob({ url, key }) {
  const python = process.env.PYTHON_BIN || "python3";
  const { stdout, stderr } = await execFileAsync(
    python,
    [RECOMMENDER_SCRIPT],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: {
        ...process.env,
        SUPABASE_URL: url,
        SUPABASE_SERVICE_ROLE_KEY: key,
      },
      timeout: 240_000,
      maxBuffer: 2 * 1024 * 1024,
    },
  );
  if (stderr?.trim()) console.warn(`Skills-Ring recommender: ${stderr.trim()}`);
  return stdout?.trim() || "";
}

function resolveLiveUser(users, account) {
  if (!Array.isArray(users) || !account) return null;
  const configured = process.env.SKILLS_RING_DEFAULT_USER_ID;
  if (configured) {
    const preferred = users.find((user) => user.user_id === configured);
    if (preferred) return preferred;
  }
  return users.find((user) => user.user_id === account.userId)
    || users.find((user) => String(user.name).trim().toLowerCase() === String(account.name).trim().toLowerCase())
    || users.find((user) => user.user_id === process.env.SKILLS_RING_DEFAULT_USER_ID)
    || users.find((user) => user.user_id === "u1")
    || null;
}

export function createAuthServer({
  db,
  publicOrigin,
  secureCookies = false,
  serveStatic,
  supabaseUrl,
  supabaseKey,
  runRecommender = runRecommenderJob,
  authenticate,
  register,
  productionStore,
} = {}) {
  if (!db && !authenticate) throw new Error("Database or cloud authentication is required.");
  const getAccount = authenticate || ((req) => currentUser(db, req));
  const attempts = new Map();
  let liveSnapshotCache = null;
  let liveSnapshotAt = 0;

  const liveUrl = supabaseUrl || DEFAULT_SUPABASE_URL;

  async function refreshRecommendations() {
    if (!supabaseKey) return null;
    try {
      await runRecommender({ url: liveUrl, key: supabaseKey });
      liveSnapshotCache = null;
      liveSnapshotAt = 0;
      return null;
    } catch (error) {
      console.error("Skills-Ring recommender refresh failed", error);
      return "Your change was saved. Recommendations are pending; please refresh shortly.";
    }
  }

  async function syncSupabaseUser({ userId, name, status = "Active" }) {
    if (!supabaseKey) return;
    await supabaseRequest({
      url: liveUrl,
      key: supabaseKey,
      table: "users",
      method: "POST",
      body: { user_id: userId, name, status, updated_at: new Date().toISOString() },
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  function listingTable(kind) {
    return kind === "offer"
      ? { table: "offers", idColumn: "offer_id", availabilityTable: "offer_availability", availabilityColumn: "offer_id" }
      : { table: "needs", idColumn: "need_id", availabilityTable: "need_availability", availabilityColumn: "need_id" };
  }

  async function syncSupabaseListing(account, raw, requestedId, write = supabaseRequest) {
    if (!supabaseKey) throw new Error("Live Supabase data is not configured on this server.");
    const kind = raw?.kind;
    if (kind !== "offer" && kind !== "need") throw new Error("Listing kind must be offer or need.");
    const categoryName = typeof raw.category === "string" ? raw.category.trim() : "";
    const selectedSkill = typeof raw.skill === "string" ? raw.skill.trim() : "";
    const otherSkill = typeof raw.otherSkill === "string" ? raw.otherSkill.trim() : "";
    const skillName = selectedSkill === "Other" ? otherSkill : selectedSkill;
    const duration = Number(raw.duration);
    const sessions = Number(raw.sessions);
    const levelIndex = Number(raw.level);
    const mode = raw.mode;
    const location = typeof raw.location === "string" ? raw.location.trim() : "";
    const conditions = typeof raw.conditions === "string" ? raw.conditions.trim() : "";
    const availability = Array.isArray(raw.availability)
      ? raw.availability.filter((value) => typeof value === "string").map((value) => value.trim()).filter(Boolean)
      : [];
    if (!categoryName || !skillName || !Number.isInteger(duration) || duration < 15 || duration > 180 ||
        !Number.isInteger(sessions) || sessions < 1 || sessions > 10 || !Number.isInteger(levelIndex) ||
        levelIndex < 0 || levelIndex >= LEVELS.length || !["Online", "Offline", "Either"].includes(mode) ||
        !location || location.length > 100 || !availability.length || availability.length > 9 || conditions.length > 180) {
      throw new Error("Review the listing category, skill, terms, and availability.");
    }

    const categories = await fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "categories" });
    const category = categories.find((row) => row.category_name === categoryName && row.status === "Active");
    if (!category) throw new Error("Choose an active category.");

    const skills = await fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "skills" });
    let skill = skills.find((row) => row.category_id === category.category_id &&
      String(row.skill_name).trim().toLowerCase() === skillName.toLowerCase());
    if (!skill) {
      skill = {
        skill_id: `usr_skill_${randomUUID()}`,
        category_id: category.category_id,
        skill_name: skillName,
        description: "User-submitted skill",
        status: "Active",
        created_at: new Date().toISOString(),
      };
      await write({
        url: liveUrl,
        key: supabaseKey,
        table: "skills",
        method: "POST",
        body: skill,
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }

    const { table, idColumn, availabilityTable, availabilityColumn } = listingTable(kind);
    const id = typeof requestedId === "string" && /^[A-Za-z0-9_-]{1,120}$/.test(requestedId)
      ? requestedId
      : `${kind === "offer" ? "o" : "n"}_${randomUUID()}`;
    const existing = await supabaseRequest({
      url: liveUrl,
      key: supabaseKey,
      table,
      query: { select: "user_id", [`${idColumn}`]: `eq.${id}`, limit: "1" },
    }) || [];
    if (existing[0] && existing[0].user_id !== account.userId) throw new Error("You cannot edit another member's listing.");

    const requestedStatus = raw.status === "Archived" ? "Deleted" : raw.status;
    const status = ["Active", "Paused", "Fulfilled", "Deleted"].includes(requestedStatus)
      ? requestedStatus
      : "Active";
    const now = new Date().toISOString();
    const row = kind === "offer"
      ? {
          offer_id: id,
          user_id: account.userId,
          skill_id: skill.skill_id,
          level: LEVELS[levelIndex],
          duration_minutes: duration,
          max_sessions: sessions,
          mode,
          location,
          value_adjustment: 1,
          conditions: conditions || null,
          status,
          updated_at: now,
        }
      : {
          need_id: id,
          user_id: account.userId,
          skill_id: skill.skill_id,
          required_provider_level: LEVELS[levelIndex],
          duration_minutes: duration,
          sessions_needed: sessions,
          mode,
          location,
          conditions: conditions || null,
          status,
          updated_at: now,
        };
    if (!existing[0]) row.created_at = now;
    await write({
      url: liveUrl,
      key: supabaseKey,
      table,
      method: "POST",
      body: row,
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    await write({
      url: liveUrl,
      key: supabaseKey,
      table: availabilityTable,
      method: "DELETE",
      query: { [availabilityColumn]: `eq.${id}` },
      prefer: "return=minimal",
    });
    if (status !== "Deleted") {
      const slots = await fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "time_slots" });
      const slotRows = availability.map((slotName) => {
        const slot = slots.find((candidate) => candidate.slot_name === slotName);
        if (!slot) throw new Error(`Unknown availability slot: ${slotName}`);
        return { [availabilityColumn]: id, slot_id: slot.slot_id };
      });
      await write({
        url: liveUrl,
        key: supabaseKey,
        table: availabilityTable,
        method: "POST",
        body: slotRows,
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }
    const warning = productionStore ? null : await refreshRecommendations();
    return { id, kind, skillId: skill.skill_id, status, warning };
  }

  function exchangeStatus(status) {
    return {
      proposed: "Proposed",
      confirmed: "Confirmed",
      active: "Active",
      "partially settled": "Partially Settled",
      settled: "Settled",
      disputed: "Disputed",
      withdrawn: "Withdrawn",
      defaulted: "Defaulted",
    }[status];
  }

  function exchangeDetails(exchange) {
    return {
      title: typeof exchange.title === "string" ? exchange.title.slice(0, 240) : "",
      audit: Array.isArray(exchange.audit) ? exchange.audit.filter((item) => typeof item === "string").slice(-100) : [],
      amendments: Array.isArray(exchange.amendments) ? exchange.amendments : [],
      createdAt: exchange.createdAt || null,
      expiresAt: exchange.expiresAt || null,
      declineReason: exchange.declineReason || null,
      proposedTerms: exchange.proposedTerms || null,
      recovery: exchange.recovery || null,
    };
  }

  async function syncSupabaseExchange(account, rawExchange, rawSessions = [], rawContributions = [], actionType = "sync", write = supabaseRequest) {
    if (!supabaseKey) throw new Error("Live Supabase data is not configured on this server.");
    if (!rawExchange || typeof rawExchange !== "object") throw new Error("Exchange data is required.");
    const exchangeId = typeof rawExchange.id === "string" && /^[A-Za-z0-9_:-]{1,180}$/.test(rawExchange.id)
      ? rawExchange.id
      : null;
    const legs = Array.isArray(rawExchange.legs) ? rawExchange.legs : [];
    const status = exchangeStatus(rawExchange.status);
    if (!exchangeId || !status || legs.length < 2 || legs.length > 12) throw new Error("The exchange terms are invalid.");
    const participants = [...new Set(legs.flatMap((leg) => [leg.provider, leg.receiver]))];
    if (![...participants, rawExchange.recovery?.replacement].includes(account.userId)) throw new Error("You are not a participant in this exchange.");
    if (!legs.every((leg, index) => typeof leg.id === "string" && leg.id.length <= 240 &&
      typeof leg.offer === "string" && typeof leg.need === "string" &&
      participants.includes(leg.provider) && participants.includes(leg.receiver) &&
      Number.isInteger(leg.duration) && leg.duration > 0 &&
      Number.isInteger(leg.sessions) && leg.sessions > 0 &&
      Number.isInteger(leg.capacity) && leg.capacity > 0 &&
      typeof leg.skill === "string" && leg.skill.trim() &&
      typeof leg.availability === "string" && leg.availability.trim() &&
      ["Online", "Offline", "Either"].includes(leg.mode) &&
      typeof leg.location === "string" && leg.location.trim() &&
      index < 12)) throw new Error("The exchange legs are invalid.");

    const existing = await supabaseRequest({
      url: liveUrl,
      key: supabaseKey,
      table: "exchanges",
      query: { select: "exchange_id", exchange_id: `eq.${exchangeId}`, limit: "1" },
    }) || [];
    if (actionType === "propose" && existing[0]) throw new Error("This exchange proposal already exists.");

    const now = new Date().toISOString();
    await write({
      url: liveUrl,
      key: supabaseKey,
      table: "exchanges",
      method: "POST",
      body: {
        exchange_id: exchangeId,
        exchange_type: legs.length === 2 ? "Direct" : "Cycle",
        status,
        details: { ...exchangeDetails(rawExchange), ...(rawExchange.serverState ? { state: rawExchange.serverState } : {}) },
        created_at: rawExchange.createdAt || now,
        updated_at: now,
      },
      prefer: "resolution=merge-duplicates,return=minimal",
    });

    const [skills, skillValues, systemConfig, offers, needs] = await Promise.all([
      fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "skills" }),
      fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "skill_values" }),
      fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "system_config" }),
      fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "offers" }),
      fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table: "needs" }),
    ]);
    const legRows = legs.map((leg, index) => {
      const offer = offers.find((row) => row.offer_id === leg.offer);
      const need = needs.find((row) => row.need_id === leg.need);
      const skillId = offer?.skill_id || need?.skill_id || skills.find((row) => String(row.skill_name).trim().toLowerCase() === leg.skill.trim().toLowerCase())?.skill_id;
      if (!offer || !need || !skillId) throw new Error("The exchange references a listing or skill that is no longer live.");
      return {
        leg_id: leg.id,
        exchange_id: exchangeId,
        offer_id: leg.offer,
        need_id: leg.need,
        provider_id: leg.provider,
        receiver_id: leg.receiver,
        skill_id: skillId,
        duration_minutes: leg.duration,
        total_sessions: leg.sessions,
        availability: leg.availability,
        mode: leg.mode,
        location: leg.location,
        capacity: leg.capacity,
        replaces_leg_id: leg.replaces || null,
        sort_order: index + 1,
        updated_at: now,
      };
    });
    await write({
      url: liveUrl,
      key: supabaseKey,
      table: "exchange_legs",
      method: "POST",
      body: legRows,
      prefer: "resolution=merge-duplicates,return=minimal",
    });

    const config = new Map(systemConfig.map(row => [row.config_key, Number(row.config_value)]));
    const referenceHourlyHkd = config.get("bond_reference_hourly_hkd") || 200;
    const completionBondRate = config.get("completion_bond_rate") || 0.2;
    const roundMoney = value => Math.round((value + Number.EPSILON) * 100) / 100;
    const suppliedBonds = Array.isArray(rawExchange.bonds) ? rawExchange.bonds : [];
    const currentBondRows = legRows.map(leg => {
      const multiplier = Number(skillValues.find(row => row.skill_id === leg.skill_id && !row.effective_to)?.base_value) || 1;
      const referenceValue = roundMoney(referenceHourlyHkd * multiplier * (leg.duration_minutes / 60) * leg.total_sessions);
      const amount = roundMoney(referenceValue * completionBondRate);
      const supplied = suppliedBonds.find(bond => bond.leg === leg.leg_id && bond.owner === leg.provider_id);
      if (!supplied || supplied.currency !== "HKD" || supplied.reference_value !== referenceValue || supplied.rate !== completionBondRate || supplied.amount !== amount || !["Calculated", "Held", "Returned", "Settled"].includes(supplied.status))
        throw new Error("The simulated completion bond terms are invalid or out of date.");
      return {
        bond_id: supplied.id,
        exchange_id: exchangeId,
        exchange_leg_id: leg.leg_id,
        owner_id: leg.provider_id,
        currency: "HKD",
        reference_value: referenceValue,
        bond_rate: completionBondRate,
        bond_amount: amount,
        status: supplied.status,
        returned_amount: Number(supplied.returned_amount) || 0,
        applied_amount: Number(supplied.applied_amount) || 0,
        terms_version: supplied.terms_version || "simulated-hkd-v1",
        updated_at: now,
      };
    });
    const currentBondIds = new Set(currentBondRows.map(row => row.bond_id));
    const historicalBondRows = suppliedBonds.filter(bond => !currentBondIds.has(bond.id)).map(bond => {
      if (!legRows.some(leg => leg.leg_id === bond.leg) || ![...participants, rawExchange.recovery?.withdrawn].includes(bond.owner) || !["Returned", "Settled"].includes(bond.status))
        throw new Error("The historical simulated completion bond is invalid.");
      return {
        bond_id: bond.id,
        exchange_id: exchangeId,
        exchange_leg_id: bond.leg,
        owner_id: bond.owner,
        currency: "HKD",
        reference_value: Number(bond.reference_value) || 0,
        bond_rate: Number(bond.rate) || completionBondRate,
        bond_amount: Number(bond.amount) || 0,
        status: bond.status,
        returned_amount: Number(bond.returned_amount) || 0,
        applied_amount: Number(bond.applied_amount) || 0,
        terms_version: bond.terms_version || "simulated-hkd-v1",
        updated_at: now,
      };
    });
    const bondRows = [...currentBondRows, ...historicalBondRows];
    await write({
      url: liveUrl,
      key: supabaseKey,
      table: "completion_bonds",
      method: "POST",
      body: bondRows,
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    const suppliedLedger = Array.isArray(rawExchange.bondLedger) ? rawExchange.bondLedger : [];
    const bondIds = new Set(bondRows.map(row => row.bond_id));
    const ledgerRows = suppliedLedger.map(entry => {
      if (!bondIds.has(entry.bond) || entry.exchange !== exchangeId || !["CALCULATED", "HELD", "RETURNED", "SETTLED"].includes(entry.event) || !Number.isFinite(Number(entry.amount)))
        throw new Error("The simulated completion bond ledger is invalid.");
      if (entry.recipient && ![...participants, rawExchange.recovery?.replacement].includes(entry.recipient)) throw new Error("The bond recipient is not part of this exchange.");
      return {
        entry_id: entry.id,
        bond_id: entry.bond,
        exchange_id: exchangeId,
        event_type: entry.event,
        amount: Number(entry.amount),
        recipient_id: entry.recipient || null,
        reason: String(entry.reason || "").slice(0, 1000),
        created_at: entry.created_at || now,
      };
    });
    if (ledgerRows.length) await write({
      url: liveUrl,
      key: supabaseKey,
      table: "bond_ledger_entries",
      method: "POST",
      body: ledgerRows,
      prefer: "resolution=merge-duplicates,return=minimal",
    });

    if (actionType === "reviseProposal") {
      await write({ url: liveUrl, key: supabaseKey, table: "exchange_confirmations", method: "DELETE", query: { exchange_id: `eq.${exchangeId}` }, prefer: "return=minimal" });
    }
    if (actionType === "confirm") {
      if (!Array.isArray(rawExchange.confirmations) || !rawExchange.confirmations.includes(account.userId)) throw new Error("Confirmations must include the signed-in account.");
      const current = await supabaseRequest({ url: liveUrl, key: supabaseKey, table: "exchange_confirmations", query: { select: "user_id", exchange_id: `eq.${exchangeId}` } }) || [];
      const currentUsers = new Set(current.map((row) => row.user_id));
      const unexpected = rawExchange.confirmations.filter((userId) => !currentUsers.has(userId) && userId !== account.userId);
      if (unexpected.length) throw new Error("Each participant must confirm from their own account.");
      await write({
        url: liveUrl,
        key: supabaseKey,
        table: "exchange_confirmations",
        method: "POST",
        body: {
          exchange_id: exchangeId,
          user_id: account.userId,
          confirmed_at: now,
          terms_hash: createHash("sha256").update(JSON.stringify({
            legs: legRows.map(({ updated_at, ...leg }) => leg),
            bonds: currentBondRows.map(bond => ({
              bond_id: bond.bond_id,
              exchange_leg_id: bond.exchange_leg_id,
              owner_id: bond.owner_id,
              currency: bond.currency,
              reference_value: bond.reference_value,
              bond_rate: bond.bond_rate,
              bond_amount: bond.bond_amount,
              terms_version: bond.terms_version,
            })),
          })).digest("hex"),
          bond_terms_version: "simulated-hkd-v1",
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }

    await write({
      url: liveUrl,
      key: supabaseKey,
      table: "exchange_participants",
      method: "POST",
      body: participants.map((userId) => ({
        exchange_id: exchangeId,
        user_id: userId,
        participant_status: rawExchange.confirmations?.includes(userId) ? "Confirmed" : "Invited",
        joined_at: rawExchange.createdAt || now,
      })),
      prefer: "resolution=merge-duplicates,return=minimal",
    });

    for (const leg of legRows) {
      const commitmentId = `commit_${exchangeId}_${leg.leg_id}`.slice(0, 240);
      const bond = currentBondRows.find(row => row.exchange_leg_id === leg.leg_id && row.owner_id === leg.provider_id);
      await write({
        url: liveUrl,
        key: supabaseKey,
        table: "commitments",
        method: "POST",
        body: {
          commitment_id: commitmentId,
          exchange_id: exchangeId,
          source_match_id: null,
          debtor_id: leg.provider_id,
          beneficiary_id: leg.receiver_id,
          skill_id: leg.skill_id,
          duration_minutes: leg.duration_minutes,
          total_sessions: leg.total_sessions,
          value_per_session_snapshot: roundMoney(bond.reference_value / leg.total_sessions),
          status: status === "Proposed" ? "Proposed" : status === "Settled" ? "Settled" : status === "Disputed" ? "Disputed" : status === "Defaulted" ? "Defaulted" : "Active",
          updated_at: now,
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }

    const sessions = Array.isArray(rawSessions) ? rawSessions.filter((session) => session && session.exchange === exchangeId) : [];
    for (const session of sessions) {
      const leg = legRows.find((candidate) => candidate.leg_id === session.leg);
      if (!leg || (!productionStore && session.provider !== account.userId) || session.receiver !== leg.receiver_id) continue;
      const commitmentId = `commit_${exchangeId}_${leg.leg_id}`.slice(0, 240);
      const scheduledDate = typeof session.scheduled_time === "string" && Number.isFinite(Date.parse(session.scheduled_time))
        ? new Date(session.scheduled_time).toISOString().slice(0, 19)
        : null;
      await write({
        url: liveUrl,
        key: supabaseKey,
        table: "sessions",
        method: "POST",
        body: {
          session_id: session.id,
          commitment_id: commitmentId,
          exchange_id: exchangeId,
          exchange_leg_id: leg.leg_id,
          provider_id: session.provider,
          receiver_id: session.receiver,
          scheduled_time: scheduledDate,
          scheduled_duration_minutes: Number(session.duration) || leg.duration_minutes,
          actual_duration_minutes: Number(session.actual_duration) || leg.duration_minutes,
          status: "Completed",
          notes: typeof session.notes === "string" ? session.notes.slice(0, 1000) : null,
          completed_at: now,
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
      const contribution = Array.isArray(rawContributions) && rawContributions.find((item) => item.session === session.id);
      await write({
        url: liveUrl,
        key: supabaseKey,
        table: "contributions",
        method: "POST",
        body: {
          contribution_id: contribution?.id || `contribution_${session.id}`.slice(0, 240),
          session_id: session.id,
          commitment_id: commitmentId,
          exchange_id: exchangeId,
          provider_id: session.provider,
          receiver_id: session.receiver,
          skill_id: leg.skill_id,
          duration_minutes: Number(session.actual_duration) || leg.duration_minutes,
          settlement_status: "Unsettled",
          created_at: contribution?.created_at || now,
        },
        prefer: "resolution=merge-duplicates,return=minimal",
      });
    }
    return { exchangeId };
  }

  function allowed(req) {
    const origin = req.headers.origin;
    if (authenticate) return /^Bearer /i.test(req.headers.authorization || "");
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
    if (req.method === "GET" && path === "/api/health") return json(res, 200, { ok: true, auth: register ? "registration" : authenticate ? "supabase" : "local" });
    if (register && req.method === "POST" && path === "/api/auth/register") {
      if (limited(req)) return json(res, 429, { error: "Too many attempts. Try again later." });
      let body;
      try { body = await readJson(req); } catch { return json(res, 400, { error: "Invalid request body." }); }
      const name = normalizeName(body.name);
      const email = normalizeEmail(body.email);
      if (!name || !email) return json(res, 400, { error: "Enter a display name of 2–80 characters and a valid email." });
      const result = await register({ name, email });
      liveSnapshotCache = null;
      return json(res, 201, result);
    }
    if (req.method === "GET" && path === "/api/auth/me") {
      const user = await getAccount(req);
      return user ? json(res, 200, { user }) : json(res, 401, { error: "Not signed in." });
    }
    if (req.method === "GET" && path === "/api/live/snapshot") {
      const account = await getAccount(req);
      if (!account) return json(res, 401, { error: "Not signed in." });
      if (!supabaseKey) return json(res, 503, { error: "Live Supabase data is not configured on this server." });
      try {
        if (productionStore) return json(res, 200, await productionStore.snapshot(account));
        const now = Date.now();
        if (!liveSnapshotCache || now - liveSnapshotAt > 15_000) {
          const entries = await Promise.all(LIVE_TABLES.map(async (table) => [table, await fetchSupabaseTable({ url: liveUrl, key: supabaseKey, table })]));
          liveSnapshotCache = Object.fromEntries(entries);
          liveSnapshotAt = now;
        }
        return json(res, 200, {
          source: "supabase",
          fetchedAt: new Date(liveSnapshotAt).toISOString(),
          liveUserId: resolveLiveUser(liveSnapshotCache.users, account)?.user_id || null,
          ...liveSnapshotCache,
        });
      } catch (error) {
        return json(res, 502, { error: "Live community data is temporarily unavailable." });
      }
    }

    const exchangePath = path.match(/^\/api\/live\/exchanges(?:\/([^/]+))?$/);
    if (exchangePath && ["POST", "PATCH"].includes(req.method)) {
      const account = await getAccount(req);
      if (!account) return json(res, 401, { error: "Not signed in." });
      if (!supabaseKey) return json(res, 503, { error: "Live Supabase data is not configured on this server." });
      if (!allowed(req)) return json(res, 403, { error: "Invalid request origin." });
      let body;
      try {
        body = await readJson(req);
      } catch {
        return json(res, 400, { error: "Invalid request body." });
      }
      try {
        if (productionStore) {
          const result = await productionStore.exchange(account, body, exchangePath[1], syncSupabaseExchange);
          const warning = result.starter || ["message", "booking", "acceptBooking", "cancelBooking", "noShow", "remindBooking", "evaluate"].includes(body.action?.type) ? null : await refreshRecommendations();
          return json(res, 200, { ...result, persisted: true, ...(warning ? { warning } : {}) });
        }
        const exchange = body.exchange && typeof body.exchange === "object"
          ? { ...body.exchange, id: exchangePath[1] || body.exchange.id }
          : body.exchange;
        const result = await syncSupabaseExchange(
          account,
          exchange,
          body.sessions,
          body.contributions,
          typeof body.action === "string" ? body.action : "sync",
        );
        liveSnapshotCache = null;
        liveSnapshotAt = 0;
        const warning = await refreshRecommendations();
        return json(res, req.method === "POST" ? 201 : 200, { exchange: result, persisted: true, ...(warning ? { warning } : {}) });
      } catch (error) {
        return json(res, 422, { error: error instanceof Error ? error.message : "The exchange could not be saved." });
      }
    }

    const listingPath = path.match(/^\/api\/live\/listings(?:\/([^/]+))?$/);
    if (listingPath && ["POST", "PATCH"].includes(req.method)) {
      const account = await getAccount(req);
      if (!account) return json(res, 401, { error: "Not signed in." });
      if (!supabaseKey) return json(res, 503, { error: "Live Supabase data is not configured on this server." });
      if (!allowed(req)) return json(res, 403, { error: "Invalid request origin." });
      let body;
      try {
        body = await readJson(req);
      } catch {
        return json(res, 400, { error: "Invalid request body." });
      }
      try {
        const listing = productionStore
          ? await productionStore.listing(account, body, listingPath[1] || body.id, syncSupabaseListing)
          : await syncSupabaseListing(account, body, listingPath[1] || body.id);
        if (productionStore && !listing.starter) listing.warning = await refreshRecommendations();
        return json(res, req.method === "POST" ? 201 : 200, { listing });
      } catch (error) {
        return json(res, 422, { error: error instanceof Error ? error.message : "The listing could not be saved." });
      }
    }

    if (authenticate) return json(res, 404, { error: "Use Supabase Auth for account operations." });
    if (!path.startsWith("/api/auth/")) return json(res, 404, { error: "Not found." });
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
        await syncSupabaseUser({ userId, name });
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
      const warning = await refreshRecommendations();
      return json(res, 201, { user: { userId, name, email, status: "Active" }, ...(warning ? { warning } : {}) },
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
