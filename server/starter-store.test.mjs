import assert from "node:assert/strict";
import test from "node:test";
import { createStarterStore } from "./starter-store.mjs";
import { createStarterWorkspace } from "./generated/starter.mjs";
import { findMatches } from "./generated/domain.mjs";

function fixture() {
  const account = { userId: "usr_test", name: "Starter Test" };
  let row = { workspace: createStarterWorkspace(account.userId, account.name), revision: 0 };
  let writes = 0;
  const request = async args => {
    assert.equal(args.query.user_id, "eq.usr_test");
    if (args.method === "PATCH") {
      writes++;
      assert.equal(args.query.revision, `eq.${row.revision}`);
      row = structuredClone(args.body);
      return [row];
    }
    return [structuredClone(row)];
  };
  return { account, store: createStarterStore(request), current: () => row, writes: () => writes };
}

test("example listing changes and proposals persist to the owner's account", async () => {
  const { account, store, current } = fixture();
  const listing = current().workspace.state.listings.find(l => l.user === account.userId && l.skill === "Graphic Design");
  await store.listing(account, { ...listing, status: "Paused" }, listing.id);
  assert.equal((await store.load(account)).workspace.state.listings.find(l => l.id === listing.id).status, "Paused");
  await store.listing(account, { ...listing, status: "Active" }, listing.id);
  const route = findMatches(current().workspace.state, account.userId)[0];
  const result = await store.exchange(account, { type: "propose", legs: route }, "client-generated-id");
  assert.match(result.exchange.exchangeId, /^starter_usr_test_/);
  assert.equal(current().workspace.state.exchanges.length, 2);
});

test("example mutations reject foreign IDs, forged actors, and another provider's delivery", async () => {
  const { account, store, current, writes } = fixture();
  const exchange = current().workspace.state.exchanges[0];
  const otherLeg = exchange.legs.find(l => l.provider !== account.userId);
  await assert.rejects(store.exchange(account, { type: "confirm", user: "someone_else", exchange: exchange.id }, exchange.id), /signed-in/);
  await assert.rejects(store.exchange(account, { type: "complete", exchange: exchange.id, leg: otherLeg.id }, exchange.id), /provider/);
  await assert.rejects(store.exchange(account, { type: "confirm", user: account.userId, exchange: "starter_foreign" }, "starter_foreign"), /belong/);
  await assert.rejects(store.listing(account, { user: account.userId }, "starter_foreign"), /own/);
  const wrongSession = current().workspace.state.sessions.find(s => s.receiver !== account.userId);
  await assert.rejects(store.exchange(account, { type: "evaluate", evaluation: { session: wrongSession.id } }, exchange.id), /belong/);
  assert.equal(writes(), 0);
});

test("only the recorded receiver can evaluate a starter session", async () => {
  const { account, store, current } = fixture();
  const session = current().workspace.state.sessions.find(s => s.receiver === account.userId);
  await store.exchange(account, { type: "evaluate", evaluation: { session: session.id, on_time: true, completed_as_agreed: true, engaged: true, would_exchange_again: true, comment: "Example feedback" } }, session.exchange);
  assert.equal(current().workspace.state.evaluations.length, 1);
});

test("a concurrent starter update reports a conflict instead of silently losing progress", async () => {
  const workspace = createStarterWorkspace("usr_test", "Test");
  const store = createStarterStore(async args => args.method === "PATCH" ? [] : [{ workspace, revision: 1 }]);
  const listing = workspace.state.listings.find(l => l.user === "usr_test");
  await assert.rejects(store.listing({ userId: "usr_test" }, { ...listing, status: "Paused" }, listing.id), /changed/);
});
