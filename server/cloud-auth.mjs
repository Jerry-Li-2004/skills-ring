const TOKEN_PATTERN = /^Bearer ([A-Za-z0-9._~-]+)$/i;

export function createCloudAuthenticator({ url, publishableKey, serviceKey }) {
  if (!url || !publishableKey || !serviceKey) throw new Error("Supabase Auth configuration is incomplete.");
  const base = url.replace(/\/$/, "");

  async function profile(userId) {
    const target = new URL(`${base}/rest/v1/users`);
    target.searchParams.set("select", "user_id,name,status");
    target.searchParams.set("user_id", `eq.${userId}`);
    target.searchParams.set("limit", "1");
    const response = await fetch(target, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Profile lookup failed (${response.status}).`);
    return (await response.json())[0] || null;
  }

  return async function authenticate(req) {
    const authorization = req.headers.authorization || "";
    const token = TOKEN_PATTERN.exec(authorization)?.[1];
    if (!token) return null;
    const response = await fetch(`${base}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user?.id || !user.email || !user.email_confirmed_at || user.is_anonymous) return null;
    const userId = `usr_${user.id}`;
    let row = await profile(userId);
    let profileCreated = false;
    if (!row) {
      const suggestedName = typeof user.user_metadata?.name === "string" ? user.user_metadata.name.trim().replace(/\s+/g, " ") : "";
      const fallback = user.email.split("@")[0].slice(0, 80);
      const name = suggestedName.length >= 2 && suggestedName.length <= 80 ? suggestedName : fallback;
      const created = await fetch(`${base}/rest/v1/users?on_conflict=user_id`, {
        method: "POST",
        headers: {
          apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json", Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({ user_id: userId, name, status: "Active" }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!created.ok) throw new Error(`Profile creation failed (${created.status}).`);
      profileCreated = true;
      row = await profile(userId);
    }
    if (!row || row.status !== "Active") return null;
    return { userId, name: row.name, email: user.email, status: "Active", profileCreated };
  };
}
