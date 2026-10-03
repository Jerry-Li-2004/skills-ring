import { seed, people, type State } from "./domain";

export type StarterWorkspace = { ownerId: string; people: Record<string, string>; state: State };

// Each profile gets its own copy, including all object IDs and fictional peers.
export function createStarterWorkspace(userId: string, displayName: string): StarterWorkspace {
  const original = seed("home");
  const prefix = `starter_${userId}_`;
  const names: Record<string, string> = {};
  const mapping = new Map<string, string>();
  for (const key of ["alice", "bob", "charlie", "david", "maya", "james"]) {
    const mapped = key === "alice" ? userId : `${prefix}${key}`;
    mapping.set(key, mapped);
    names[mapped] = key === "alice" ? displayName : `${people[key].name} (Example)`;
  }
  let index = 0;
  function collect(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) { value.forEach(collect); return; }
    const row = value as Record<string, unknown>;
    if (typeof row.id === "string") mapping.set(row.id, `${prefix}${++index}`);
    Object.values(row).forEach(collect);
  }
  collect(original);
  for (const exchange of original.exchanges) for (const leg of exchange.legs) {
    mapping.set(leg.id, `${mapping.get(leg.offer)}:${mapping.get(leg.need)}`);
  }
  function remap(value: unknown): unknown {
    if (typeof value === "string") return mapping.get(value) ?? value.replace(/Alice Chen|Alice/g, () => displayName);
    if (Array.isArray(value)) return value.map(remap);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, remap(item)]));
    return value;
  }
  const state = remap(original) as State;
  for (const exchange of state.exchanges) exchange.title = `Example · ${exchange.title}`;
  return { ownerId: userId, people: names, state };
}

export function mergeStarterWorkspace(live: State, starter: StarterWorkspace | undefined, userId: string | null): State {
  if (!starter || starter.ownerId !== userId) return live;
  // Starter records stay in their example workspace. Live totals and matching
  // must only describe listings and exchanges published to the community.
  return { ...live, starterAvailable: true };
}
