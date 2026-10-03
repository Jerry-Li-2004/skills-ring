import { createStarterWorkspace } from "./generated/starter.mjs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { supabaseRequest } from "./app.mjs";

// Registration grants access immediately. The receipt keeps browser profiles
// separate without passwords, email verification, or a Supabase Auth account.
export function createRegistration({ url, key }) {
  // This fingerprint only prevents self-matching; self-reported email never
  // authenticates a returning account or grants access to another profile.
  const identityKey = email => createHmac("sha256", key).update(`skills-ring-matching:${email.trim().toLowerCase()}`).digest("hex");
  const sign = (payload) => createHmac("sha256", key).update(`skills-ring-registration:${payload}`).digest("base64url");
  return {
    async register({ name, email }) {
      const user = { userId: `usr_${randomUUID()}`, name, email, status: "Active" };
      await supabaseRequest({ url, key, table: "rpc/register_with_starter", method: "POST",
        body: { profile_id: user.userId, display_name: name, starter: createStarterWorkspace(user.userId, name), identity_key: identityKey(email) } });
      const payload = Buffer.from(JSON.stringify(user)).toString("base64url");
      return { user, token: `sr1.${payload}.${sign(payload)}` };
    },
    async authenticate(req) {
      const token = req.headers.authorization?.replace(/^Bearer /i, "") || "";
      const parts = token.split(".");
      if (parts.length !== 3 || parts[0] !== "sr1") return null;
      const [, payload, signature] = parts;
      const expected = Buffer.from(sign(payload));
      const actual = Buffer.from(signature);
      if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
      let user;
      try { user = JSON.parse(Buffer.from(payload, "base64url").toString()); } catch { return null; }
      const rows = await supabaseRequest({ url, key, table: "users",
        query: { select: "user_id,name,status", user_id: `eq.${user.userId}`, limit: "1" } });
      if (!rows?.[0] || rows[0].status !== "Active") return null;
      await supabaseRequest({ url, key, table: "rpc/bind_matching_identity", method: "POST",
        body: { profile_id: user.userId, identity_key: identityKey(user.email) } });
      return { ...user, name: rows[0].name };
    },
  };
}
