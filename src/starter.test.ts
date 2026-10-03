import { expect, it } from "vitest";
import { createStarterWorkspace, mergeStarterWorkspace } from "./starter";
import { findMatches, transition, type State } from "./domain";

const empty = (): State => ({ version: 1, listings: [], exchanges: [], sessions: [], contributions: [], disputes: [], evaluations: [], withdrawals: [], liveStats: {}, liveMatches: {} });

it("keeps starter examples out of live matches, listings, exchanges and activity", () => {
  const starter = createStarterWorkspace("usr_jo", "Jo Wong");
  const original = JSON.stringify(starter);
  const state = mergeStarterWorkspace(empty(), starter, "usr_jo");
  expect(state.starterAvailable).toBe(true);
  expect(findMatches(state, "usr_jo")).toHaveLength(0);
  for (const field of ["listings", "exchanges", "sessions", "contributions", "disputes", "evaluations", "withdrawals"] as const) expect(state[field]).toEqual([]);
  expect(JSON.stringify(starter)).toBe(original);
  // The saved example remains usable independently, without entering live data.
  expect(findMatches(starter.state, "usr_jo")).toHaveLength(2);
  const [route] = findMatches(starter.state, "usr_jo");
  expect(transition(starter.state, { type: "propose", legs: route }).exchanges).toHaveLength(2);
});

it("preserves live data and excludes another account's examples", () => {
  const starter = createStarterWorkspace("usr_a", "A User");
  const live = empty();
  live.listings = [{ ...starter.state.listings[0], id: "real_offer", user: "usr_a" }];
  live.liveMatches = { usr_a: [findMatches(starter.state, "usr_a")[0]] };
  const merged = mergeStarterWorkspace(live, starter, "usr_a");
  expect(merged.listings).toEqual(live.listings);
  expect(merged.liveMatches).toEqual(live.liveMatches);
  expect(merged.exchanges).toEqual(live.exchanges);
  expect(mergeStarterWorkspace(live, starter, "usr_b")).toBe(live);
  expect(mergeStarterWorkspace(live, undefined, "usr_a")).toBe(live);
});
