# Skills-Ring

An Apple-inspired community for individual skill sharing and non-monetary service exchange. This branch adds database-backed registration and login to the existing React/Vite demo.

## Run locally

Use Node.js 22.13+ or Node.js 24. In separate terminals:

```sh
npm ci
npm run dev:api
npm run dev
```

For local registration and login, set `PUBLIC_ORIGIN` in the API terminal to the exact URL printed by Vite (for example, `http://127.0.0.1:5173`; `localhost` and `127.0.0.1` are not interchangeable here), then start or restart `npm run dev:api`. In PowerShell, use `$env:PUBLIC_ORIGIN = 'http://127.0.0.1:5173'`; if script execution blocks `npm`, use `npm.cmd` instead.

Open the URL printed by Vite. To validate and build:

```sh
npm test
npm run test:auth
npm run build
npm start
```

`npm run dev:api` starts the account API on `127.0.0.1:3001`. Vite proxies `/api` to it. After `npm run build`, `npm start` serves both the built site and API on port 3001. Registration asks for display name, email, and a password of at least 8 characters (longer passphrases are recommended). It creates a `usr_<UUID>` user ID and atomically inserts into the **shared** `users`, `auth_credentials`, and `auth_sessions` tables. By default this is the sibling `../database_demo2/skill_swap_algorithm_input.db`, which already contains the 300 synthetic users, offers, and needs. `auth_credentials` and `auth_sessions` live in that same SQLite file but remain separate from public profile data. Set `SKILLS_RING_DB_PATH` to another full Skills-Ring SQLite database if needed. Passwords are stored only as salted scrypt hashes; browser sessions use an HttpOnly, SameSite=Strict cookie.

Email verification and password reset are **not** implemented. A person can register an email address they do not own; do not open public self-registration without an abuse/recovery policy. Synthetic users have no credentials and cannot sign in or consent to a real exchange until an activation process is added. The existing exchange workspace still uses fictional local demo participants and is explicitly labeled as such after sign-in. Registered users are now in the same SQL `users` table and can be referenced by future offers/needs, but the current listing and exchange UI still uses local demo state.

## Deployment boundary

The old `vercel.json` builds a static Vite site only; it cannot host this file-backed account API or persist its SQLite database. For real accounts, deploy the Node server with a persistent disk and HTTPS, set `SKILLS_RING_DB_PATH` to the full application database on that disk, set `PUBLIC_ORIGIN` to the exact public HTTPS origin, and set `AUTH_SECURE_COOKIES=true`. Keep the database file and backups private: it now contains authentication tables. Do not hand the entire live database to the algorithm team; use a sanitized data export that excludes credentials and sessions. The in-memory login rate limiter is suitable for one server process; a multi-instance deployment needs a shared limiter. The app has not been deployed or penetration-tested on this branch.

## What works

- Separate offer and need forms with a standardized 42-entry skill library (including category-specific Other options), duration, capacity, mode, location, level, conditions, and coarse availability.
- Actual reciprocal and three-/four-person cycle discovery; feasibility precedes transparent recommendation priority.
- Explicit per-participant confirmations and observable-quantity imbalance warnings.
- Atomic local state transitions for sessions, immutable contributions, derived commitments and settlement.
- One unfulfilled receive-first commitment; full or partial delivery; exact remainder and restored eligibility.
- Withdrawal, compatible replacement search, renewed consent, and no-replacement default. Completed value and original responsibility are retained.
- Future session-count amendments with an audit trail and all-party consent.
- Dispute holds and simulated full release, 50% partial release, or default; original claims remain preserved.
- Binary behavioural evaluations and reliability derived from recorded feedback.
- Glass-style navigation, an interactive Give / Learn / Connect hero, animated progress and statistics, and a settlement celebration.
- Responsive navigation, keyboard-accessible dialogs and hero tabs, search, device-local persistence, and repeatable scenarios.
- Demo Studio in the top bar opens the repeatable stories. The motion toggle pauses decorative animation; system reduced-motion preferences are respected.

## Demo walkthroughs

Use **Workspace settings** or **Try a demo scenario**. Loading a scenario replaces local demo data. Use the header participant selector to view any fictional participant’s ledger. Named confirmation buttons explicitly simulate the respective person’s agreement; these are not authenticated approvals.

### 1. Imbalance and partial settlement

Choose **Give first, settle in parts**, then review the direct match. Alice provides two 60-minute Python sessions; Bob provides two 30-minute tennis sessions. Confirm as both people. Record both Python sessions, then one tennis session. The exchange is partially settled and Bob owes one 30-minute tennis session; his receive-first eligibility is restricted. Record the last session to settle and restore eligibility.

### 2. Multi-party withdrawal after performance

Choose **Keep the ring moving** and review the ring with Charlie (the first result). The route is Alice → Charlie (Python), Charlie → Bob (tennis), Bob → Alice (photography). Confirm as all three and record Alice’s session. In **Changes & recovery**, supply a reason and withdraw as Charlie. Find David’s compatible offer and reconfirm as all four affected people. Return to Overview and record David’s replacement service, then Bob’s photography. The original debtor remains Charlie until the accepted recovery service is performed; David’s actual contribution is separately recorded.

Replay the case and choose **Simulate deadline · No replacement** instead to inspect the uncovered contribution and defaulted responsibility. Before-performance withdrawal can also substitute the incoming service after everyone accepts the revised route.

### Disputes, changes, and feedback

After recording a session, open **Sessions & trust** to leave binary feedback or raise a dispute with a reason. A dispute holds further settlement. The three resolution buttons simulate an administrator’s recorded decision. Partial release recognizes half the claimed duration and leaves the remainder owed without changing the original contribution.

In **Changes & recovery**, propose a new total session count within offer capacity. Current and proposed terms are displayed, performance is paused, and every participant must accept before terms change. Prior completed sessions and amendment history remain intact.

## Architecture and boundaries

- `src/domain.ts`: pure matching, transitions, ledger derivation, reliability, seed scenarios, and recommendation priorities.
- `src/domain.test.ts`: domain regression tests.
- `src/main.tsx`: workspace and workflow UI.
- `src/styles.css`: base layout and responsive behaviour.
- `src/theme.css`: Apple-inspired visual treatment, transitions, and responsive motion.
- `src/experience.tsx`: interactive hero, motion preference, animated values, exchange journey, and settlement celebration.
- `scripts/browser-smoke.js`: browser-side smoke test exercising visible controls; run with an already-open local app using `agent-browser eval --stdin < scripts/browser-smoke.js`. This deliberately resets the local demo workspace.
- Storage key: `skills-ring-demo-v1`. State is local to one browser/device; there is no shared backend, authentication, real notification delivery, or independent service verification. The header selector and administrative decisions are explicitly simulated.
- Conditions use conservative exact matching, and the form selects one coarse availability slot. The domain supports multiple slots. No calendar booking, chat, collateral, payment, or email integration is included.
- Contributions and session records preserve original claims. Dispute resolutions record separate recognized-duration adjustments. Remaining sessions and commitment/settlement state are derived, not editable balances. For the demo, each accepted service leg is treated as a concrete obligation, without tokens or prices.
- The imbalance threshold is configurable through the domain helper (default 25% or different session counts). Participants’ consent is not a guarantee of substantive fairness.

The receive-first limit protects contributors but also constrains honest newcomers who need several services before reciprocating. Skills-Ring breaks when value has already been delivered, the responsible participant defaults, and no acceptable replacement or alternative route exists. It can preserve the claim, restrict the defaulter, and record the loss; it cannot recreate an irreversible service or guarantee repayment. Small networks, subjective service quality, collusion, pressure to agree, and rejected replacements remain real limits.

Before using this with a real community, add server-side transactional storage, authenticated identities and authorization, multi-user concurrency and approval handling, trusted timestamps, moderation and dispute permissions, and privacy/retention controls.
