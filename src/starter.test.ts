import { expect, it } from "vitest";
import { createStarterWorkspace, mergeStarterWorkspace } from "./starter";
import { findMatches, people, transition, type State } from "./domain";

const empty = (): State => ({ version: 1, listings: [], exchanges: [], sessions: [], contributions: [], disputes: [], evaluations: [], withdrawals: [], liveStats: {}, liveMatches: {} });

it("gives the registered identity two matches and one exchange in its main workspace", () => {
  const starter = createStarterWorkspace("usr_jo", "Jo Wong");
  const state = mergeStarterWorkspace(empty(), starter, "usr_jo");
  expect(people.usr_jo.name).toBe("Jo Wong");
  expect(findMatches(state, "usr_jo")).toHaveLength(2);
  expect(state.exchanges).toHaveLength(1);
  expect(state.exchanges[0].legs.some(l => l.provider === "usr_jo")).toBe(true);
  expect(state.listings.filter(l => l.user === "usr_jo")).toHaveLength(5);
  expect(JSON.stringify(starter)).not.toContain('"alice"');
  const [route] = findMatches(state, "usr_jo");
  expect(transition(state, { type: "propose", legs: route }).exchanges).toHaveLength(2);
});

it("keeps profiles isolated and preserves added live listings alongside starter records", () => {
  const a = createStarterWorkspace("usr_a", "A User");
  const b = createStarterWorkspace("usr_b", "B User");
  expect(a.state.listings.some(l => b.state.listings.some(other => other.id === l.id))).toBe(false);
  expect(mergeStarterWorkspace(empty(), a, "usr_b").exchanges).toHaveLength(0);
  const live = empty();
  live.listings = [{ ...a.state.listings[0], id: "real_offer", user: "usr_a" }];
  const merged = mergeStarterWorkspace(live, a, "usr_a");
  expect(merged.listings.some(l => l.id === "real_offer")).toBe(true);
  expect(findMatches(merged, "usr_a")).toHaveLength(2);
});
