import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Optional compatibility for browser sessions created before open registration.
export const supabase = url && publishableKey ? createClient(url, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
}) : null;

export async function authenticatedFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const registrationToken = localStorage.getItem("sr-registration-token");
  if (registrationToken) {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${registrationToken}`);
    return fetch(input, { ...init, headers, credentials: "same-origin" });
  }
  if (!supabase) throw new Error("Complete registration to continue.");
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error("Complete registration to continue.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(input, { ...init, headers, credentials: "same-origin" });
}
