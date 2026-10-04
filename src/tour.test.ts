import { describe, expect, it } from 'vitest';
import { buildSteps } from './TourGuide';
import { exchangeBonds, findMatches, outstanding, transition } from './domain';
import { readTourResume, routeIds, tourFixture, tourListing } from './tour-model';

describe('guided tour domain fixtures', () => {
  it('adds actual new reciprocal routes when an offer and a need are published', () => {
    let state=tourFixture('discovery');
    expect(routeIds(state)).toEqual([]);
    state=transition(state,{type:'listing',listing:tourListing('alice','offer','Python',60,3)});
    const before=routeIds(state);
    expect(before).toHaveLength(1);
    expect(findMatches(state,'alice')[0].some(l=>l.receiver==='bob')).toBe(true);
    state=transition(state,{type:'listing',listing:tourListing('alice','need','Guitar')});
    expect(routeIds(state)).toHaveLength(2);
    expect(routeIds(state).filter(key=>!before.includes(key))).toHaveLength(1);
    expect(state.exchanges).toHaveLength(0);
  });
  it('closes exactly one three-person ring and respects compatibility', () => {
    let state=tourFixture('ring');
    expect(routeIds(state)).toHaveLength(0);
    state=transition(state,{type:'listing',listing:tourListing('alice','need','Photography')});
    expect(findMatches(state,'alice').map(r=>r.length)).toEqual([3]);
    const bad=structuredClone(state);
    bad.listings.find(l=>l.user==='alice'&&l.kind==='need')!.availability=['Sunday Morning'];
    expect(findMatches(bad,'alice')).toEqual([]);
  });
  it('preserves contributions through partial and full settlement', () => {
    let state=tourFixture('settlement');
    const contributions=structuredClone(state.contributions);
    const exchange=state.exchanges[0], leg=exchange.legs.find(l=>l.provider==='bob')!;
    expect(outstanding(state,'bob')[0].remaining_sessions).toBe(2);
    state=transition(state,{type:'complete',exchange:exchange.id,leg:leg.id});
    expect(outstanding(state,'bob')[0].remaining_sessions).toBe(1);
    expect(state.exchanges[0].status).toBe('partially settled');
    state=transition(state,{type:'complete',exchange:exchange.id,leg:leg.id});
    expect(outstanding(state,'bob')).toEqual([]);
    expect(state.exchanges[0].status).toBe('settled');
    expect(state.contributions.filter(c=>c.provider==='alice')).toEqual(contributions);
  });
  it('creates fresh checkpoints and rejects invalid persisted progress', () => {
    const state=tourFixture('discovery');state.listings.length=0;
    expect(tourFixture('discovery').listings).toHaveLength(5);
    for(const value of ['bad','{"version":2,"chapter":"ring"}','{"version":1,"chapter":"unknown"}'])expect(readTourResume({getItem:()=>value},'alice')).toBeNull();
    expect(readTourResume({getItem:()=>'{"version":1,"chapter":"ring"}'},'alice')).toBe('ring');
    expect(readTourResume({getItem:()=>{throw Error('disabled');}},'alice')).toBeNull();
  });
});

describe('short guided story', () => {
  it('publishes one offer and one need while keeping the full exchange journey', () => {
    const steps = buildSteps();
    expect(steps.filter(s => s.target === '[data-tour="publish"]')).toHaveLength(2);
    expect(steps.reduce((total, step) => total + step.hold, 0)).toBeCloseTo(122000);
    for (const chapter of ['discovery', 'ring', 'settlement']) expect(steps.some(s => s.chapter === chapter)).toBe(true);
    expect(steps.filter(s => s.target?.startsWith('[data-tour="confirm-'))).toHaveLength(3);
    expect(steps.filter(s => s.target === '[data-tour="complete-bob"]')).toHaveLength(2);
    let state = tourFixture('discovery');
    state = transition(state, { type: 'listing', listing: tourListing('alice', 'offer', 'Python', 60, 2) });
    expect(findMatches(state, 'alice')).toHaveLength(1);
    expect(findMatches(state, 'alice')[0].some(leg => leg.receiver === 'bob')).toBe(true);
  });
});

it('holds deposits until the prepared exchange finishes, then returns every deposit in full', () => {
  let state = tourFixture('settlement');
  const exchange = state.exchanges[0];
  const leg = exchange.legs.find(leg => leg.provider === 'bob')!;
  expect(exchangeBonds(state, exchange.id).map(bond => bond.status)).toEqual(['Held', 'Held']);
  state = transition(state, {type:'complete', exchange:exchange.id, leg:leg.id});
  expect(exchangeBonds(state, exchange.id).every(bond => bond.status === 'Held')).toBe(true);
  state = transition(state, {type:'complete', exchange:exchange.id, leg:leg.id});
  for (const bond of exchangeBonds(state, exchange.id)) {
    expect(bond.status).toBe('Returned');
    expect(bond.returned_amount).toBe(bond.amount);
    expect(state.bondLedger?.some(entry => entry.bond === bond.id && entry.event === 'RETURNED' && entry.amount === bond.amount)).toBe(true);
  }
});
