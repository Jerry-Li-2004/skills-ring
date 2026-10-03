import { describe, expect, it } from "vitest";
import { bondQuote, exchangeBonds, findMatches, transition } from "./domain";
import { liveSkillCatalog, liveSnapshotToState, type LiveSnapshot } from "./live-snapshot";

describe("live recommendation snapshot", () => {
  it("uses active Supabase categories and skills, including skills without listings", () => {
    expect(liveSkillCatalog({ categories: [
      { category_id: "creative", category_name: "Creative", status: "Active" },
      { category_id: "old", category_name: "Old", status: "Disabled" },
    ], skills: [
      { category_id: "creative", skill_name: "Guitar", status: "Active" },
      { category_id: "creative", skill_name: "Retired", status: "Disabled" },
      { category_id: "old", skill_name: "Old skill", status: "Active" },
    ] })).toEqual({ Creative: ["Guitar"] });
  });
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
      skill_values: [{ skill_id: "s1", base_value: 1.5 }, { skill_id: "s2", base_value: 1 }],
      system_config: [{ config_key: "bond_reference_hourly_hkd", config_value: "200" }, { config_key: "completion_bond_rate", config_value: "0.20" }],
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
    snapshot.users.forEach(row => row.matching_identity_id = "same-person");
    expect(findMatches(liveSnapshotToState(snapshot), "u1")).toEqual([]);
    snapshot.users.forEach(row => delete row.matching_identity_id);
    const proposed = transition(state, { type: "propose", legs: route });
    expect(bondQuote(state, route[0])).toMatchObject({ referenceValue: 300, amount: 60 });
    expect(exchangeBonds(proposed, proposed.exchanges[0].id)).toHaveLength(2);
    snapshot.discoverySuggestions = [{ target_user_id: "u1", candidate_user_id: "u2", reason: "Complementary listed skill", rank_position: 1, is_sample: false }];
    snapshot.recommendation_rankings = [];
    const unranked = liveSnapshotToState(snapshot);
    expect(unranked.discoverySuggestions).toHaveLength(1);
    expect(findMatches(unranked, "u1")).toEqual([]);
    expect(() => transition(unranked, { type: "propose", legs: route })).toThrow("no longer available");
    snapshot.exchange_legs = route.map((leg, index) => ({ leg_id: leg.id, exchange_id: "ended", provider_id: leg.provider, receiver_id: leg.receiver, offer_id: leg.offer, need_id: leg.need, skill_id: index ? "s2" : "s1", duration_minutes: leg.duration, total_sessions: leg.sessions }));
    for (const outcome of ["declined", "cancelled", "expired"]) {
      snapshot.exchanges = [{ exchange_id: "ended", status: "Withdrawn", details: { proposalOutcome: outcome } }];
      expect(liveSnapshotToState(snapshot).exchanges[0].status).toBe(outcome);
    }
    snapshot.exchanges = [{ exchange_id: "ended", status: "Withdrawn", details: { declineReason: "Cancelled by proposer" } }];
    expect(liveSnapshotToState(snapshot).exchanges[0].status).toBe("cancelled");
    snapshot.exchanges = [{ exchange_id: "ended", status: "Withdrawn", details: { recovery: { withdrawn: "u1", confirmations: [], applied: false } } }];
    expect(liveSnapshotToState(snapshot).exchanges[0].status).toBe("withdrawn");
  });
});
