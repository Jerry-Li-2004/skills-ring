import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createRegistration } from "../server/registration.mjs";

// Run on the trusted server only. Never print the bearer receipt.
const directory = resolve(".local");
const receipt = resolve(directory, "moderator-profile.json");
let existing;
try { existing = JSON.parse(await readFile(receipt, "utf8")); } catch (error) { if (error.code !== "ENOENT") throw error; }
if (existing) {
  console.log(JSON.stringify({ userId: existing.user.userId, receipt, existing: true }));
} else {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server Supabase configuration is required.");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const result = await createRegistration({ url, key }).register({ name: "Skills-Ring Moderator", email: "moderator@skills-ring.local" });
  await writeFile(receipt, JSON.stringify({ version: 1, ...result }, null, 2), { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ userId: result.user.userId, receipt, existing: false }));
}
