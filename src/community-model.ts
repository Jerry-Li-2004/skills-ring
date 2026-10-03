import { demoPeople, people, type State } from "./domain";

export function communityMembers(state: State, demo: boolean, query = "") {
  const directory = demo ? demoPeople : people;
  const ids = demo ? Object.keys(demoPeople) : Object.keys(state.liveStats || {});
  const term = query.trim().toLocaleLowerCase();
  return ids.filter(id => directory[id] && (!term || [directory[id].name, ...state.listings
    .filter(l => l.user === id && l.status === "Active")
    .flatMap(l => [l.skill, l.category, l.location])].join(" ").toLocaleLowerCase().includes(term)))
    .sort((a, b) => directory[a].name.localeCompare(directory[b].name));
}

export function restoreDemoMode(storage: Pick<Storage, "getItem">, userId: string) {
  try { return storage.getItem(`skills-ring-mode-v1-${userId}`) === "demo"; } catch { return false; }
}
