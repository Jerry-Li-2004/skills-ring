import { describe, it, expect, vi } from "vitest";
import {
  seed,
  findMatches,
  transition,
  participants,
  commitments,
  outstanding,
  remaining,
  compatible,
  imbalance,
  reliability,
  recommendations,
  type State,
  type Action,
} from "./domain";
function flow(kind: "direct" | "ring" = "direct") {
  let s = seed(kind);
  const legs = findMatches(s, "alice").find((l) =>
    kind === "direct"
      ? l.length === 2
      : l.some((x) => x.provider === "charlie"),
  )!;
  s = transition(s, { type: "propose", legs });
  return s;
}
function confirm(s: State) {
  const e = s.exchanges[0];
  for (const user of participants(e))
    s = transition(s, { type: "confirm", exchange: e.id, user });
  return s;
}
function complete(s: State, provider: string) {
  const e = s.exchanges[0];
  return transition(s, {
    type: "complete",
    exchange: e.id,
    leg: e.legs.find((l) => l.provider === provider)!.id,
  });
}
function withdraw(s: State) {
  return transition(s, {
    type: "withdraw",
    exchange: s.exchanges[0].id,
    user: "charlie",
    reason: "Unavailable",
  });
}
describe("matching and confirmation", () => {
  it("discovers a reciprocal match and warns about quantity imbalance", () => {
    const s = seed("direct"),
      m = findMatches(s, "alice");
    expect(m[0]).toHaveLength(2);
    expect(imbalance(m[0])).toBe(true);
  });
  it("reserves offer and need capacity across proposals", () => {
    const s = flow();
    expect(findMatches(s, "alice")).toHaveLength(0);
  });
  it("rejects zero-session needs", () => {
    const s = seed("direct");
    expect(compatible(s.listings[2], { ...s.listings[1], sessions: 0 })).toBe(
      false,
    );
  });
  it("discovers actual three-person cycles", () => {
    const m = findMatches(seed("ring"), "alice");
    expect(
      m.some((l) => l.length === 3 && l.some((x) => x.provider === "charlie")),
    ).toBe(true);
  });
  it.each([
    "mode",
    "schedule",
    "location",
    "capacity",
    "duration",
    "level",
    "conditions",
  ])("rejects incompatible %s", (field) => {
    const s = seed("direct"),
      o = s.listings[2],
      n = s.listings[1];
    const altered = { ...n };
    if (field === "mode") altered.mode = "Online";
    if (field === "schedule") altered.availability = ["Sunday Morning"];
    if (field === "location") altered.location = "Kowloon";
    if (field === "capacity") altered.sessions = 10;
    if (field === "duration") altered.duration = 120;
    if (field === "level") {
      o.level = 0;
      altered.level = 2;
    }
    if (field === "conditions") altered.conditions = "Bring equipment";
    expect(compatible(o, altered)).toBe(false);
  });
  it("does not activate before every participant confirms", () => {
    let s = flow();
    expect(() => complete(s, "alice")).toThrow();
    s = transition(s, {
      type: "confirm",
      exchange: s.exchanges[0].id,
      user: "alice",
    });
    expect(s.exchanges[0].status).toBe("proposed");
    s = confirm(s);
    expect(s.exchanges[0].status).toBe("confirmed");
    expect(commitments(s).every((c) => c.status === "Proposed")).toBe(true);
  });
});

describe("P1 exchange coordination", () => {
  it("keeps pass outside domain state and requires explicit proposal and consent", () => {
    const base = seed("direct");
    expect(base.exchanges).toHaveLength(0);
    const legs = findMatches(base, "alice")[0].map((l) => ({ ...l, duration: 45 }));
    const proposed = transition(base, { type: "propose", legs });
    expect(proposed.exchanges[0].status).toBe("proposed");
    expect(proposed.exchanges[0].legs[0].duration).toBe(45);
    expect(proposed.exchanges[0].expiresAt).toBeTruthy();
    expect(proposed.notifications?.some((n) => n.user === "bob")).toBe(true);
    expect(transition(proposed, { type: "confirm", exchange: proposed.exchanges[0].id, user: "alice" }).exchanges[0].status).toBe("proposed");
  });
  it("records messages and exact times for both participants", () => {
    let s = confirm(flow());
    const e = s.exchanges[0];
    s = transition(s, { type: "message", exchange: e.id, user: "alice", text: "Saturday works" });
    expect(s.messages?.[0].text).toBe("Saturday works");
    s = transition(s, { type: "booking", exchange: e.id, leg: e.legs[0].id, user: "alice", start: new Date(Date.now() + 86400000).toISOString(), timezone: "Asia/Hong_Kong", place: "Video call" });
    expect(s.bookings?.[0].status).toBe("proposed");
    s = transition(s, { type: "acceptBooking", exchange: e.id, booking: s.bookings![0].id, user: "bob" });
    expect(s.bookings?.[0].status).toBe("accepted");
    expect(() => transition(s, { type: "complete", exchange: e.id, leg: e.legs[0].id, booking: s.bookings![0].id })).toThrow();
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(Date.parse(s.bookings![0].start) + 60000));
      s = transition(s, { type: "complete", exchange: e.id, leg: e.legs[0].id, booking: s.bookings![0].id });
    } finally { vi.useRealTimers(); }
    expect(s.bookings?.[0].status).toBe("completed");
    expect(s.sessions[0].scheduled_time).toBe(s.bookings![0].start);
  });
  it("blocks obvious contact details before all participants confirm", () => {
    const s = flow();
    const exchange = s.exchanges[0].id;
    for (const text of ["me@example.com", "+852 9123 4567", "https://meeting.example.com", "12 Main Street"])
      expect(() => transition(s, { type: "message", exchange, user: "alice", text })).toThrow(/contact details/);
  });
  it("guards reserved listings and supports decline with a reason", () => {
    let s = flow();
    const original = s.listings[0];
    expect(() => transition(s, { type: "setListingStatus", id: original.id, status: "Deleted" })).toThrow();
    expect(() => transition(s, { type: "editListing", listing: { ...original, sessions: 1 } })).toThrow();
    s = transition(s, { type: "decline", exchange: s.exchanges[0].id, user: "bob", reason: "Unavailable" });
    expect(s.exchanges[0].status).toBe("declined");
    expect(findMatches(s, "alice").length).toBeGreaterThan(0);
    expect(s.exchanges[0].declineReason).toBe("Unavailable");
  });
  it("holds Other skill suggestions until demo review", () => {
    let s = seed("direct");
    const suggestion = { ...s.listings[0], id: "new-suggestion", skill: "Other", otherSkill: "Portrait photography", sessions: 1 };
    s = transition(s, { type: "listing", listing: suggestion });
    expect(s.listings.at(-1)?.status).toBe("Pending review");
    expect(() => transition(s, { type: "setListingStatus", id: suggestion.id, status: "Active" })).toThrow();
    s = transition(s, { type: "reviewListing", id: suggestion.id, approved: true });
    expect(s.listings.at(-1)?.status).toBe("Active");
  });
  it("resets consent after a proposal revision and releases expired capacity", () => {
    let s = flow();
    const exchange = s.exchanges[0];
    s = transition(s, { type: "confirm", exchange: exchange.id, user: "alice" });
    s = transition(s, { type: "reviseProposal", exchange: exchange.id, user: "alice", legs: exchange.legs.map((l) => ({ ...l, duration: 45 })) });
    expect(s.exchanges[0].confirmations).toHaveLength(0);
    expect(s.exchanges[0].legs[0].duration).toBe(45);
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(Date.parse(s.exchanges[0].expiresAt!) + 1000));
      s = transition(s, { type: "expireProposal", exchange: exchange.id });
      expect(s.exchanges[0].status).toBe("expired");
      expect(findMatches(s, "alice").length).toBeGreaterThan(0);
    } finally { vi.useRealTimers(); }
  });
});
describe("service ledger", () => {
  it("keeps open disputes on hold and preserves a default decision when another case is released", () => {
    let s = complete(complete(confirm(flow()), "alice"), "alice");
    for (const session of s.sessions) s = transition(s, { type: "dispute", session: session.id, user: session.receiver, reason: "Service not delivered as agreed" });
    s = transition(s, { type: "resolve", dispute: s.disputes[0].id, resolution: "Default", moderator: "mod", reason: "First service was not delivered." });
    expect(s.exchanges[0].status).toBe("disputed");
    s = transition(s, { type: "resolve", dispute: s.disputes[1].id, resolution: "Full release", moderator: "mod", reason: "Second service was fully delivered." });
    expect(s.exchanges[0].status).toBe("defaulted");
    expect(s.contributions).toHaveLength(2);
  });
  it("creates separate contributions and received-first commitments atomically", () => {
    const s = complete(confirm(flow()), "alice");
    expect(s.contributions[0].duration).toBe(60);
    expect(outstanding(s, "bob")[0]).toMatchObject({
      skill: "Tennis",
      remaining_sessions: 2,
      status: "Active",
    });
    expect(s.sessions).toHaveLength(1);
  });
  it("enforces the receive-first rule across exchanges without mutating failed state", () => {
    let s = complete(confirm(flow()), "alice");
    const extra = structuredClone(s.exchanges[0]);
    extra.id = "another";
    extra.status = "confirmed";
    s.exchanges.push(extra);
    const before = structuredClone(s);
    expect(() =>
      transition(s, {
        type: "complete",
        exchange: extra.id,
        leg: extra.legs[0].id,
      }),
    ).toThrow(/must fulfil/);
    expect(s).toEqual(before);
  });
  it("settles in parts, never below zero, and restores eligibility", () => {
    let s = confirm(flow());
    s = complete(complete(s, "alice"), "alice");
    s = complete(s, "bob");
    expect(s.exchanges[0].status).toBe("partially settled");
    expect(outstanding(s, "bob")[0].remaining_sessions).toBe(1);
    s = complete(s, "bob");
    expect(s.exchanges[0].status).toBe("settled");
    expect(outstanding(s, "bob")).toHaveLength(0);
    expect(() => complete(s, "bob")).toThrow();
  });
  it("holds disputed settlement and records partial release without changing historical contribution", () => {
    let s = complete(confirm(flow()), "alice");
    const contribution = structuredClone(s.contributions[0]);
    s = transition(s, {
      type: "dispute",
      session: s.sessions[0].id,
      user: "bob",
      reason: "Only half delivered",
    });
    expect(() => complete(s, "bob")).toThrow();
    s = transition(s, {
      type: "resolve",
      dispute: s.disputes[0].id,
      resolution: "Partial release",
    });
    expect(s.contributions[0]).toEqual(contribution);
    expect(remaining(s, s.exchanges[0], s.exchanges[0].legs[0])).toBe(90);
  });
  it("requires all affected parties to amend and preserves completed history", () => {
    let s = complete(confirm(flow()), "alice");
    const e = s.exchanges[0],
      bob = e.legs.find((l) => l.provider === "bob")!;
    s = transition(s, {
      type: "amend",
      exchange: e.id,
      leg: bob.id,
      sessions: 3,
    });
    expect(s.exchanges[0].legs.find((l) => l.id === bob.id)!.sessions).toBe(2);
    expect(() => complete(s, "bob")).toThrow(/amendment/);
    for (const user of participants(e))
      s = transition(s, { type: "confirmAmend", exchange: e.id, user });
    expect(s.exchanges[0].legs.find((l) => l.id === bob.id)!.sessions).toBe(3);
    expect(s.contributions).toHaveLength(1);
    expect(s.exchanges[0].amendments[0].status).toBe("applied");
  });
  it("derives reliability from binary evaluations", () => {
    let s = complete(confirm(flow()), "alice");
    s = transition(s, {
      type: "evaluate",
      evaluation: {
        session: s.sessions[0].id,
        on_time: true,
        completed_as_agreed: true,
        engaged: false,
        would_exchange_again: true,
        comment: "",
      },
    });
    expect(reliability(s, "alice")).toMatchObject({
      sessions: 1,
      reviews: 1,
      onTime: 100,
      completed: 100,
    });
  });
  it("prioritizes fulfilling a commitment with a concrete explanation", () => {
    const s = complete(confirm(flow()), "alice");
    const r = recommendations(s, "bob")[0];
    expect(r.priority).toBe(1);
    expect(r.reason).toContain("remaining");
  });
});
describe("withdrawal and recovery", () => {
  it("replaces a participant before performance only after everyone accepts", () => {
    let s = withdraw(confirm(flow("ring")));
    const e = s.exchanges[0];
    s = transition(s, { type: "replacement", exchange: e.id, user: "david" });
    expect(s.exchanges[0].status).toBe("withdrawn");
    for (const user of [...participants(e), "david"] as const)
      s = transition(s, { type: "reconfirm", exchange: e.id, user });
    expect(
      s.exchanges[0].legs.some(
        (l) => l.provider === "charlie" || l.receiver === "charlie",
      ),
    ).toBe(false);
    expect(s.exchanges[0].status).toBe("confirmed");
  });
  it("preserves responsibility after withdrawal and requires fresh consent before replacement service", () => {
    let s = withdraw(complete(confirm(flow("ring")), "alice"));
    const history = structuredClone(s.contributions),
      e = s.exchanges[0];
    s = transition(s, { type: "replacement", exchange: e.id, user: "david" });
    expect(() => complete(s, "charlie")).toThrow();
    for (const user of [...participants(e), "david"] as const)
      s = transition(s, { type: "reconfirm", exchange: e.id, user });
    expect(outstanding(s, "charlie")[0].debtor).toBe("charlie");
    expect(s.contributions).toEqual(history);
    s = complete(s, "charlie");
    expect(s.sessions.at(-1)!.provider).toBe("david");
    expect(outstanding(s, "charlie")).toHaveLength(0);
    s = complete(s, "bob");
    expect(s.exchanges[0].status).toBe("settled");
  });
  it("preserves uncovered claims and blocks defaulted participants when no replacement exists", () => {
    let s = withdraw(complete(confirm(flow("ring")), "alice"));
    s = transition(s, { type: "default", exchange: s.exchanges[0].id });
    expect(s.exchanges[0].status).toBe("defaulted");
    expect(s.contributions).toHaveLength(1);
    expect(outstanding(s, "charlie")[0].status).toBe("Defaulted");
  });
});
