import { createAuthServer } from "./app.mjs";
import { createCloudAuthenticator } from "./cloud-auth.mjs";
import { createRegistration } from "./registration.mjs";
import { createProductionStore } from "./production-store.mjs";

export function createRuntime(options = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Set SUPABASE_URL and SUPABASE_SECRET_KEY.");
  if (key.startsWith("sb_publishable_") || (key.split(".").length === 3 && JSON.parse(Buffer.from(key.split(".")[1], "base64url")).role !== "service_role")) throw new Error("The server requires a Supabase secret/service-role key.");
  const runRecommender = process.env.VERCEL ? async () => {
    if (!process.env.CRON_SECRET) throw new Error("CRON_SECRET is missing.");
    // Use a configured deployment URL, never a client-supplied Host header.
    const host = process.env.VERCEL_ENV === "production" ? process.env.VERCEL_PROJECT_PRODUCTION_URL : process.env.VERCEL_URL;
    const origin = `https://${host || process.env.VERCEL_URL}`;
    const response = await fetch(`${origin}/api/recommend`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET ? { "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}),
      },
      signal: AbortSignal.timeout(240_000),
    });
    if (!response.ok) throw new Error(`Recommendation worker returned ${response.status}`);
  } : undefined;
  const registration = createRegistration({ url, key });
  const legacyAuthenticate = publishableKey ? createCloudAuthenticator({ url, serviceKey: key, publishableKey }) : async () => null;
  return createAuthServer({
    ...options,
    supabaseUrl: url,
    supabaseKey: key,
    register: registration.register,
    authenticate: (req) => req.headers.authorization?.startsWith("Bearer sr1.")
      ? registration.authenticate(req) : legacyAuthenticate(req),
    productionStore: createProductionStore({ url, key }),
    ...(runRecommender ? { runRecommender } : {}),
  });
}
