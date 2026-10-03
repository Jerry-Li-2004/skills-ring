import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Discovery } from "./Discovery";
import { createStarterWorkspace, mergeStarterWorkspace } from "./starter";
import { type State } from "./domain";

it("explains a missing published offer even when the account has starter offers", () => {
  const live: State = { version: 1, listings: [], exchanges: [], sessions: [], contributions: [], disputes: [], evaluations: [], withdrawals: [], liveMatches: {} };
  const state = mergeStarterWorkspace(live, createStarterWorkspace("viewer", "Viewer"), "viewer");
  const html = renderToStaticMarkup(<Discovery state={state} user="viewer" matches={[]} query="" onPropose={() => false} onEditListings={() => {}} />);
  expect(html).toContain("Add an offer to find exchange matches");
  expect(html).toContain("Publish an offer to start matching with the community.");
});

it("does not call an active published offer missing", () => {
  const offer = createStarterWorkspace("viewer", "Viewer").state.listings.find(l => l.user === "viewer" && l.kind === "offer")!;
  const state: State = { version: 1, listings: [{ ...offer, id: "published-offer" }], exchanges: [], sessions: [], contributions: [], disputes: [], evaluations: [], withdrawals: [], liveMatches: {} };
  const html = renderToStaticMarkup(<Discovery state={state} user="viewer" matches={[]} query="" onPropose={() => false} onEditListings={() => {}} />);
  expect(html).not.toContain("Add an offer to find exchange matches");
  expect(html).toContain("No feasible matches are available.");
});
