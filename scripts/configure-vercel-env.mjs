// Pipe secret values to the linked project's CLI; never put them in command arguments.
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFileSync } from 'node:fs';
const cli = process.argv[2];
if (!cli) throw new Error('Provide the Vercel CLI entrypoint path.');
const secret = process.env.CRON_SECRET || randomBytes(32).toString('hex');
if (!process.env.CRON_SECRET) appendFileSync('.env.local', `\nCRON_SECRET=${secret}\n`);
const entries = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL: process.env.VITE_SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  CRON_SECRET: secret,
};
for (const [name, value] of Object.entries(entries)) {
  if (!value) throw new Error(`Missing ${name}`);
  const privateValue = ['SUPABASE_SECRET_KEY', 'CRON_SECRET'].includes(name);
  const result = spawnSync(process.execPath, [cli, 'env', 'add', name, 'production,preview', privateValue ? '--sensitive' : '--no-sensitive', '--yes'], { input: value, encoding: 'utf8' });
  console.log(`${name}: ${result.status === 0 ? 'configured' : 'FAILED'}`);
  if (result.status !== 0) { console.error(result.stderr); process.exit(result.status || 1); }
}
