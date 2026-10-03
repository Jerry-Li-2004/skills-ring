# Skills-Ring

An Apple-inspired community for individual skill sharing and non-monetary service exchange. The app combines a React/Vite frontend, authenticated Node API, Python recommender, and Supabase storage.

## Production deployment

Live site: https://skills-ring.vercel.app — Vercel project `skills-ring` in `jerry-li-0704`, backed by the `skillsring` Supabase project `mwyictnozocjicjeacqk` in Singapore.

The Vite frontend is static, `/api/*` runs the Node 24 server function, and `/api/recommend` runs a separate Python 3.12 function. Production does not use SQLite or spawn Python from Node. Anyone can register with a display name and email and enter immediately, without a password or email verification. The server saves a new profile and issues a signed registration receipt, remembered in that browser. API requests validate this receipt and the active profile; privileged database access stays on the server. Existing Supabase access tokens remain supported.

## Run locally

Use Node 24 and Python 3.12+. Copy `.env.example` to `.env.local` and fill the public project key and server secret. Never put the server secret in a `VITE_*` variable.

```sh
npm ci
npm run dev:api
# In another terminal:
npm run dev
```

Vite proxies `/api` to port 3001. To serve the compiled app and API together:

```sh
npm run build
npm start
```

Both local modes use the same registration flow and database as the deployed app. The local API runs the Python recommender as a subprocess; Vercel calls the protected Python function over HTTPS. For an isolated development dataset, configure a separate Supabase project.

## Deploy updates

Apply committed migrations to the intended Supabase project before deploying. The server depends on `commit_app_mutation`, `app_revision`, the recommendation lease functions, and `register_with_starter` / `account_starter_workspaces`. Keep browser roles denied on the raw tables; the authenticated Node gateway performs ownership checks and filters private exchange records.

Configure Vercel production and preview variables:

- `SUPABASE_URL`: server database URL.
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY`: optional compatibility for existing Supabase login sessions.
- `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`): server-only secret.
- `CRON_SECRET`: randomly generated secret for the Python worker and cron.
- `VERCEL_AUTOMATION_BYPASS_SECRET`: needed when preview protection blocks internal calls to that preview's Python worker.

```sh
npm test
npm run test:auth
npm run test:production
npm run test:python
npm run build
vercel deploy --prod
```

Vercel runs one daily recommendation refresh at 19:00 UTC (03:00 Hong Kong time), compatible with the current Hobby plan. Mutations also await an immediate refresh. A failed refresh does not discard an already committed change; the UI reports that recommendations are pending. Function execution is bounded to 300 seconds.

Registration requires no Supabase Auth dashboard changes or email delivery setup. Names and email addresses are self-reported. Each registration creates a distinct profile, even when details match. Returning visits in the same browser reuse the saved receipt; leaving a profile or clearing browser data requires a new registration and does not recover previous exchanges. Keep the server secret stable because rotating it invalidates registration receipts.

## Data integrity and authorization

The server derives exchange state from stored records and a requested action. It rejects another participant's identity, checks provider-only completion, and reserves moderator operations. A database transaction saves related rows atomically and rejects writes based on an outdated global revision. A separate database lease serializes hosted recommendation jobs. Private exchange details, messages, bookings, and notifications are returned only to their participants. Display names never select an account identity. Live failures show an error instead of silently opening a fictional workspace.

## Verification and remaining product boundaries

`server/production.test.mjs` covers verified identity, private snapshot filtering, actor impersonation, and atomic operation batching. `scripts/live-smoke.mjs` creates temporary confirmed test accounts, verifies listing → recommendation → proposal → independent confirmations → settlement, and removes its own records. It requires a server secret and intentionally writes only test records to the configured project:

```sh
node --env-file=.env.production --env-file=.env.local scripts/live-smoke.mjs https://skills-ring.vercel.app
```

The entry form requires only a display name and email. There is no password, confirmation email, or password-reset step. Custom skill moderation, administrator dispute resolutions, and simulated deadline defaults require a trusted moderation workflow; the production API rejects those actions. Notifications are in-app records; no push/SMS/email exchange notifications are sent. The synthetic seeded community remains demonstration data, and those users cannot independently consent. This is a deployed application foundation, not a claim that community moderation, operational support, or an independent security audit is complete.

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
- Guided discovery with side-by-side profile cards, clear teach/learn/meet steps, pass, undo, saved matches, pointer/touch/keyboard actions, filters, sorting, route explanations, and a separate full-term proposal review.
- Proposal expiry, declined and cancelled proposals, revised terms with renewed consent, and local per-participant updates.
- Listing edit, duplicate, pause, archive, fulfilment and guarded deletion; multi-slot and date-range availability; a simulated review queue for Other skill suggestions.
- Exchange conversations, exact session-time proposals and acceptance, calendar export, local reminders, cancellation/rescheduling, and a 15-minute no-show reporting window.
- Demo Studio in the top bar opens the repeatable stories. The motion toggle pauses decorative animation; system reduced-motion preferences are respected.

## Demo walkthroughs

These retained development scenarios describe the local domain simulator. New registrations atomically create a private starter workspace in Supabase, personalized with the registered name and user ID. The main workspace immediately contains two discovery matches, one partly settled example exchange, and starter offers/needs. Progress persists in `account_starter_workspaces` with optimistic concurrency. These examples appear alongside subsequently added real listings, without a separate onboarding mode. Fictional peers and history do not enter community matching or reputation calculations. Existing profiles are not backfilled. The optional Demo Studio still uses local browser storage.

Use **Workspace settings** or **Try a demo scenario**. Loading a scenario replaces local demo data. Use the header participant selector to view any fictional participant’s ledger. Named confirmation buttons explicitly simulate the respective person’s agreement; these are not authenticated approvals.

### P1 core experience

Open **Discover matches** to view one route at a time. The profile cards and three numbered steps explain what you teach, what you learn, and when the exchange works. Pass or save with the visible buttons, or use left/right pointer and touch swipes and keyboard arrows. **Review match** shows all participants and service terms; you can suggest changes before a separate confirmation step sends a proposal. Proposal confirmations, declines, revisions, and notifications are simulated for each fictional participant. Open an exchange’s **Conversation & schedule** tab to send a local message, propose an exact time, switch fictional participants to accept it, and export an accepted time to a calendar. Accepted future bookings can be recorded as completed only after their start time. **My offers & needs** supports editing and availability ranges; Other skill suggestions wait in the Demo Studio’s simulated review queue.

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
- Storage key: `skills-ring-demo-v1-<userId>` (mode: `skills-ring-mode-v1-<userId>`). Local scenario data uses this key. Live exchange state is stored transactionally in Supabase; the browser does not persist live snapshots under this key.
- Conditions use conservative exact matching. The form supports multiple coarse availability slots and optional date ranges. Live session bookings, messages, and in-app notifications are stored in each exchange aggregate and refreshed across participant devices; no external notifications are delivered. There is no collateral, payment, or email integration.
- Contributions and session records preserve original claims. Dispute resolutions record separate recognized-duration adjustments. Remaining sessions and commitment/settlement state are derived, not editable balances. For the demo, each accepted service leg is treated as a concrete obligation, without tokens or prices.
- The imbalance threshold is configurable through the domain helper (default 25% or different session counts). Participants’ consent is not a guarantee of substantive fairness.

The receive-first limit protects contributors but also constrains honest newcomers who need several services before reciprocating. Skills-Ring breaks when value has already been delivered, the responsible participant defaults, and no acceptable replacement or alternative route exists. It can preserve the claim, restrict the defaulter, and record the loss; it cannot recreate an irreversible service or guarantee repayment. Small networks, subjective service quality, collusion, pressure to agree, and rejected replacements remain real limits.

Before a broad community launch, finish SMTP and Auth URL setup, establish operational dispute procedures, and define privacy/retention and operational support policies. The authenticated transaction layer is implemented and tested; an independent security review remains advisable.

### Moderator workspace

Set server-only `MODERATOR_USER_IDS` to a comma-separated list of exact existing profile IDs. Local `npm start` and `npm run dev:api` also load the ignored `.env.moderators.local` file. Hosted deployments must configure this variable separately. Removing an ID and restarting the server revokes moderator access; browser claims, display names, and emails never grant it.

To provision a dedicated profile, run `node --env-file-if-exists=.env.production --env-file-if-exists=.env.local scripts/create-moderator.mjs`. This creates a profile once and writes an owner-readable `.local/moderator-profile.json` receipt, excluded from Git. Put the returned ID in the server allowlist. Use **Open a saved profile** on the registration page or account menu to select the receipt. Keep the file private: it grants access to that profile. Opening a receipt switches the browser profile.

Moderators see **Moderation** in their live workspace. Open/Resolved queues contain disputed sessions, agreed terms, conversations, and activity. Full release accepts the recorded duration; partial release accepts half and leaves the remainder owed; default releases nothing and defaults the exchange. Every decision requires a reason, records the authenticated reviewer and time, persists atomically with a revision check, and notifies participants. A moderator cannot resolve an exchange in which they participate. The same queue handles account starter exchanges with revision-checked saves. Unrelated exchanges are excluded from the moderation response.

Community now supports name/skill/location search, twelve-member pages, public skill profiles, and compatible-match review. Demo directory enumeration is limited to fictional members. Workspace mode is restored per account. **Export calendar** prepares a **Download calendar file** link, valid for five minutes. The HTTP attachment uses an encrypted, authenticated, stateless ticket so private event details are not visible in the URL and downloads work across server instances. Files have stable event IDs, UTC timestamps, escaped text, and UTF-8 line folding. Proposal outcomes distinguish Declined, Cancelled, and Expired; existing stored outcomes are interpreted from their reason while actual withdrawals keep their recovery behavior.
