import { describe, it, expect } from "vitest";
import { sessionCalendar } from "./calendar";
import { communityMembers, restoreDemoMode } from "./community-model";
import { seed, registerPerson, findMatches, transition, availableListing } from "./domain";

describe("calendar interoperability", () => {
  it("exports stable UTC events and escaped, folded UTF-8 content", () => {
    const content = sessionCalendar("booking-1", "2026-10-10T15:00:00+08:00", 60, "Python, café; part 1\nNext", "香港".repeat(40), new Date("2026-10-03T00:00:00Z"));
    expect(content).toContain("UID:booking-1@skills-ring\r\n");
    expect(content).toContain("DTSTART:20261010T070000Z\r\nDTEND:20261010T080000Z");
    expect(content).toContain("SUMMARY:Python\\, café\\; part 1\\nNext");
    for (const line of content.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(content.replace(/\r\n /g, "")).toContain(`LOCATION:${"香港".repeat(40)}`);
  });
});

describe("community and preferences", () => {
  it("never enumerates live members in the demo, and searches active skill listings", () => {
    registerPerson("live-private", "Live Private Person");
    const state = seed("direct");
    expect(communityMembers(state, true)).not.toContain("live-private");
    expect(communityMembers(state, true, "live private")).toEqual([]);
    expect(communityMembers(state, true, "alice")).toEqual(["alice"]);
    expect(communityMembers(state, true, "Python")).toContain("alice");
  });
  it("restores per-account demo mode and fails safely on unavailable storage", () => {
    const storage = { getItem: (key: string) => key === "skills-ring-mode-v1-a" ? "demo" : "live" };
    expect(restoreDemoMode(storage, "a")).toBe(true);
    expect(restoreDemoMode(storage, "b")).toBe(false);
    expect(restoreDemoMode({ getItem: () => { throw new Error("Blocked"); } }, "a")).toBe(false);
  });
  it("cancelled proposals release capacity and allow a fresh proposal", () => {
    let state = seed("direct");
    const route = findMatches(state, "alice")[0];
    state = transition(state, { type: "propose", legs: route });
    state = transition(state, { type: "cancelProposal", exchange: state.exchanges[0].id, user: "alice" });
    expect(state.exchanges[0].status).toBe("cancelled");
    expect(availableListing(state, state.listings[0]).sessions).toBe(state.listings[0].sessions);
    expect(findMatches(state, "alice").length).toBeGreaterThan(0);
    state = transition(state, { type: "propose", legs: route });
    expect(state.exchanges.at(-1)?.status).toBe("proposed");
  });
});
