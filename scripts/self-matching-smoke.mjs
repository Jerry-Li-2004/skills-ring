import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.argv[2] || 'https://skills-ring.vercel.app';
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.ok(url && key, 'Server database configuration required');
const ids = [];
const groups = new Set();
const run = randomUUID();
async function rest(table, method, query) {
  const response = await fetch(`${url}/rest/v1/${table}?${new URLSearchParams(query)}`, {
    method, headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  assert.ok(response.ok, `${method} ${table}: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
try {
  for (const email of [`self-match-${run}@example.invalid`, `self-match-${run}@example.invalid`, `namesake-${run}@example.invalid`]) {
    const response = await fetch(`${base}/api/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Self Match Probe', email }) });
    assert.equal(response.status, 201);
    const registration = await response.json();
    ids.push(registration.user.userId);
    const me = await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${registration.token}` } });
    assert.equal(me.status, 200);
    assert.equal((await me.json()).user.userId, registration.user.userId);
  }
  const rows = await rest('users', 'GET', { select: 'user_id,matching_identity_id', user_id: `in.(${ids.join(',')})` });
  const byId = new Map(rows.map(row => [row.user_id, row.matching_identity_id]));
  rows.forEach(row => groups.add(row.matching_identity_id));
  assert.ok(byId.get(ids[0]));
  assert.equal(byId.get(ids[0]), byId.get(ids[1]));
  assert.notEqual(byId.get(ids[0]), byId.get(ids[2]));
  console.log('Live registration/authentication passed: repeated email shares matching identity; same-name different email stays separate.');
} finally {
  for (const id of ids) {
    const rows = await rest('users', 'GET', { select: 'matching_identity_id', user_id: `eq.${id}` });
    rows.forEach(row => row.matching_identity_id && groups.add(row.matching_identity_id));
    await rest('users', 'DELETE', { user_id: `eq.${id}` });
  }
  for (const group of groups) await rest('matching_identity_keys', 'DELETE', { matching_identity_id: `eq.${group}` });
  console.log('Temporary probe profiles and identity keys removed.');
}
