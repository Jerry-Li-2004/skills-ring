import { describe, expect, it } from "vitest";
import { findMatches, transition } from "./domain";
import { liveSnapshotToState, type LiveSnapshot } from "./live-snapshot";

describe("live recommendation snapshot", () => {
  it("uses only Supabase ranked matches and rotates the route to the target user", () => {
    const snapshot: LiveSnapshot = {
      source: "supabase", fetchedAt: new Date().toISOString(), liveUserId: "u1",
      users: [
        { user_id: "u1", name: "First Member", status: "Active" },
        { user_id: "u2", name: "Second Member", status: "Active" },
      ],
      categories: [{ category_id: "c1", category_name: "Programming" }],
      skills: [
        { skill_id: "s1", category_id: "c1", skill_name: "Python" },
        { skill_id: "s2", category_id: "c1", skill_name: "Tennis" },
      ],
      time_slots: [{ slot_id: "slot1", slot_name: "Saturday Afternoon" }],
      offers: [
        { offer_id: "o1", user_id: "u1", skill_id: "s1", status: "Active", duration_minutes: 90, max_sessions: 2, mode: "Either", location: "Anywhere" },
        { offer_id: "o2", user_id: "u2", skill_id: "s2", status: "Active", duration_minutes: 60, max_sessions: 1, mode: "Online", location: "Anywhere" },
      ],
      needs: [
        { need_id: "n1", user_id: "u1", skill_id: "s2", status: "Active", duration_minutes: 60, sessions_needed: 1, mode: "Online", location: "Anywhere" },
        { need_id: "n2", user_id: "u2", skill_id: "s1", status: "Active", duration_minutes: 60, sessions_needed: 1, mode: "Online", location: "Anywhere" },
      ],
      offer_availability: [{ offer_id: "o1", slot_id: "slot1" }, { offer_id: "o2", slot_id: "slot1" }],
      need_availability: [{ need_id: "n1", slot_id: "slot1" }, { need_id: "n2", slot_id: "slot1" }],
      reliability_history: [], current_user_reliability: [], exchanges: [], exchange_matches: [],
      matches: [{ match_id: "m1", match_type: "Direct", offer_id_a: "o2", need_id_a: "n1", offer_id_b: "o1", need_id_b: "n2" }],
      recommendation_rankings: [{ match_id: "m1", target_user_id: "u1", rank_position: 1 }],
      exchange_participants: [], exchange_legs: [], exchange_confirmations: [], sessions: [], contributions: [],
    };
    const state = liveSnapshotToState(snapshot);
    const [route] = findMatches(state, "u1");
    expect(route.map((leg) => leg.id)).toEqual(["o1:n2", "o2:n1"]);
    expect(route[0].duration).toBe(60);
    expect(route[0].mode).toBe("Online");
    expect(findMatches(state, "u2")).toEqual([]);
    expect(() => transition(state, { type: "propose", legs: route })).not.toThrow();
    snapshot.recommendation_rankings = [];
    const unranked = liveSnapshotToState(snapshot);
    expect(findMatches(unranked, "u1")).toEqual([]);
    expect(() => transition(unranked, { type: "propose", legs: route })).toThrow("no longer available");
  });
});
