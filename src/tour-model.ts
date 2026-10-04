import { findMatches, library, participants, seed, transition, type Listing, type State } from './domain';
export type TourChapter = 'discovery' | 'ring' | 'settlement';
export function tourListing(user: string, kind: Listing['kind'], skill: string, duration = 60, sessions = 1): Listing {
  return { id: `tour-${user}-${kind}-${skill}`, user, kind, skill, category: Object.entries(library).find(([, skills]) => skills.includes(skill))![0], duration, sessions, mode: skill === 'Tennis' ? 'Offline' : 'Online', location: skill === 'Tennis' ? 'Local meeting point' : 'Anywhere', availability: ['Saturday Afternoon'], level: kind === 'offer' ? 2 : 0, conditions: '', status: 'Active' };
}
export function tourFixture(chapter: TourChapter): State {
  let state = seed('direct');
  if (chapter === 'discovery') return { ...state, listings: [tourListing('alice','need','Tennis',30,2), tourListing('bob','offer','Tennis',30,2), tourListing('bob','need','Python',60,2), tourListing('james','offer','Guitar'), tourListing('james','need','Python')] };
  if (chapter === 'ring') return { ...state, listings: [tourListing('alice','offer','Python'), tourListing('charlie','need','Python'), tourListing('charlie','offer','Tennis'), tourListing('bob','need','Tennis'), tourListing('bob','offer','Photography')] };
  state = transition(state, { type: 'propose', legs: findMatches(state,'alice')[0] });
  const exchange = state.exchanges[0];
  for (const user of participants(exchange)) state = transition(state, { type:'confirm', exchange: exchange.id, user });
  const leg = exchange.legs.find(l => l.provider === 'alice')!;
  for (let i=0;i<2;i++) state = transition(state,{type:'complete',exchange:exchange.id,leg:leg.id});
  return state;
}
export function routeIds(state: State) { return findMatches(state,'alice').map(route => route.map(leg => leg.id).sort().join('|')).sort(); }
export const tourResumeKey = (user: string) => `skills-ring-tour-v1:${user}`;
export function readTourResume(storage: Pick<Storage,'getItem'>, user: string): TourChapter | null {
  try { const value = JSON.parse(storage.getItem(tourResumeKey(user)) || 'null'); return value?.version === 1 && ['discovery','ring','settlement'].includes(value.chapter) ? value.chapter : null; } catch { return null; }
}
