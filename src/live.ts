import { type Action, type Exchange, type Listing, type Person, type State } from "./domain";
import { type LiveSnapshot } from "./live-snapshot";
export { liveSnapshotToState, type LiveSnapshot } from "./live-snapshot";
import { authenticatedFetch } from "./supabase";

export async function fetchLiveSnapshot(): Promise<LiveSnapshot> {
  const response = await authenticatedFetch("/api/live/snapshot");
  const data = (await response.json()) as LiveSnapshot & { error?: string };
  if (!response.ok) throw new Error(data.error || "Live Supabase data is unavailable.");
  return data;
}

export class LiveSyncError extends Error {
  persisted: boolean;

  constructor(message: string, persisted = false) {
    super(message);
    this.name = "LiveSyncError";
    this.persisted = persisted;
  }
}

export async function syncLiveListing(listing: Listing): Promise<{ warning?: string }> {
  const response = await authenticatedFetch(`/api/live/listings/${encodeURIComponent(listing.id)}`, {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(listing),
  });
  const data = (await response.json()) as { listing?: { warning?: string }; error?: string; persisted?: boolean };
  if (!response.ok) throw new LiveSyncError(data.error || "The live listing could not be saved.", Boolean(data.persisted));
  return data.listing || {};
}

export async function syncLiveExchange(state: State, exchange: Exchange, action: Action, actor: Person): Promise<{ warning?: string; exchangeId?: string }> {
  const response = await authenticatedFetch(`/api/live/exchanges/${encodeURIComponent(exchange.id)}`, {
    method: action.type === "propose" ? "POST" : "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  const data = (await response.json()) as { error?: string; warning?: string; exchange?: { exchangeId: string } };
  if (!response.ok) throw new Error(data.error || "The exchange could not be saved to Supabase.");
  return { warning: data.warning, exchangeId: data.exchange?.exchangeId };
}

export function resolveLiveUser(snapshot: LiveSnapshot, _accountName: string, accountUserId: string): Person {
  if (snapshot.liveUserId === accountUserId && snapshot.users.some(row => row.user_id === accountUserId)) return accountUserId;
  throw new Error("Your community profile is unavailable. Please reload.");
}
