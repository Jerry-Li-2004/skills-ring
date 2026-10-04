# <div align="center">Skills-Ring</div>

<div align="center">

### A coordination and settlement network for non-monetary value

*We do not put a price on what people have. We make it exchangeable.*

<br />

![Project Version](https://img.shields.io/badge/Project-Version%202-111827?style=for-the-badge&logo=github&logoColor=white)
![Status](https://img.shields.io/badge/Status-Production%20Foundation-16a34a?style=for-the-badge&logo=vercel&logoColor=white)

<br />

![React](https://img.shields.io/badge/React-19-149eca?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646cff?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24-5fa04e?style=flat-square&logo=node.js&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.12+-3776ab?style=flat-square&logo=python&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ecf8e?style=flat-square&logo=supabase&logoColor=white)

</div>

Skills-Ring is an Apple-inspired community application for exchanging skills and time without requiring money, tokens, or a shared institution. A member describes what they can **give** and what they want to **learn**, then discovers a direct exchange or a multi-person route through the community.

Version 2 expands the original prototype into a persistent product foundation with live Supabase storage, a server-side transaction layer, multi-party exchange workflows, reliability and dispute controls, account-specific starter workspaces, calendar export, moderator tooling, and a production recommendation pipeline.

## Table of contents

- [What changed in Version 2](#what-changed-in-version-2)
- [How Skills-Ring works](#how-skills-ring-works)
- [Core features](#core-features)
- [Try the live product](#try-the-live-product)
- [Run locally](#run-locally)
- [User guide](#user-guide)
- [Recommendation engine](#recommendation-engine)
- [Architecture](#architecture)
- [Environment variables](#environment-variables)
- [Testing and verification](#testing-and-verification)
- [Deployment](#deployment)
- [Project structure](#project-structure)
- [Product boundaries](#product-boundaries)

## What changed in Version 2

Version 1 established the core idea: match people who can provide and receive different skills. Version 2 turns that idea into a complete exchange workflow.

| Area | Version 1 direction | Version 2 implementation |
| --- | --- | --- |
| Data | Local or demo-oriented state | Supabase-backed persistent data with revision checks |
| Identity | Prototype profile flow | Server-issued registration receipts and authenticated profile access |
| Matching | Direct discovery | Direct matches plus complete three- and four-person routes |
| Exchange | Basic proposal concept | Confirmations, commitments, sessions, settlement, withdrawals, and recovery |
| Trust | Demonstration feedback | Reliability history, disputes, moderation, and completion-bond ledger |
| Collaboration | Local interactions | Private live exchanges, messages, bookings, notifications, and calendar export |
| Onboarding | Shared demo examples | Private starter workspace created for each new account |
| Operations | Development-only controls | Production API, recommendation worker, moderator allowlist, and smoke tests |

## How Skills-Ring works

Every member contributes two sides of a profile:

- **Give:** a skill or service they can provide.
- **Learn:** a skill or service they want to receive.

The platform compares skill, duration, capacity, availability, delivery mode, location, and level. It first checks whether an exchange is feasible, then ranks the result. When a direct match does not exist, it can discover a complete ring:

```text
Alice gives Python and needs Photography
Bob gives Photography and needs Tennis
Charlie gives Tennis and needs Python

Alice → Bob → Charlie → Alice
```

The exchange follows a visible lifecycle:

```text
Discover → Match → Review → Confirm → Schedule → Deliver → Settle → Evaluate
```

The system records concrete service commitments rather than pretending that unlike skills have an objective universal price. A platform-calculated HKD reference value may be shown for transparency, but the product does not process real payments.

## Core features

### Discovery and matching

- Standardized 42-entry skill library with category-specific **Other** suggestions.
- Separate offer and need forms with duration, capacity, level, mode, location, conditions, and availability.
- Direct reciprocal matches and complete three-/four-person cycles.
- Feasibility-first recommendation ranking with route explanations.
- Search, filters, sorting, pass, undo, save, and keyboard/touch-friendly discovery.
- Future recommendations that account for existing commitments and reliability.

### Exchange coordination

- Full proposal review with all participants and service legs visible.
- Independent confirmations, declines, cancellations, expiries, and revisions.
- Exchange conversations, in-app notifications, exact session-time proposals, and acceptance.
- Calendar export for accepted future bookings.
- Cancellation, rescheduling, a 15-minute no-show reporting window, and session completion.

### Fairness and recovery

- Derived commitments and settlement state instead of editable balances.
- Full and partial delivery with exact remaining obligations.
- Receive-first eligibility limits when a participant has received substantially more than they have delivered.
- Withdrawal handling, compatible replacement search, renewed consent, and no-replacement defaults.
- Amendment history for future session counts; all affected participants must consent.
- Dispute holds with simulated full release, 50% partial release, or default outcomes.
- Binary evaluations and reliability history derived from recorded feedback.
- Refundable 20% completion bonds recorded in a simulation ledger; no real funds are held.

### Community and operations

- Public skill profiles and compatible-match review.
- Account-specific starter workspaces with fictional examples that never enter real community matching.
- Moderator queue for disputes and starter-workspace review.
- Atomic server mutations with optimistic revision checks.
- Private filtering of exchange data so participants see only their own exchanges.
- Responsive Apple-inspired interface with reduced-motion support.

## Try the live product

Live deployment: **[skills-ring.vercel.app](https://skills-ring.vercel.app)**

Registration currently uses a display name and email address. There is no password, email confirmation, or password-reset flow in this prototype. A registration receipt is stored for the current browser so that the profile can be reused on return visits.

The live product is a working application foundation and demonstration environment. The seeded fictional community is for onboarding and examples; fictional users cannot independently consent to real exchanges.

## Run locally

### Requirements

- Node.js **24.x**
- Python **3.12+**
- A Supabase project for local development

### 1. Install dependencies

```bash
npm ci
```

For recommender tests or the local worker, install the small dependency set from `raw-database/requirements.txt`.

### 2. Configure environment variables

Copy the example file and fill in the values:

```bash
# Windows PowerShell
Copy-Item .env.example .env.local

# macOS/Linux
cp .env.example .env.local
```

See [Environment variables](#environment-variables). Never expose a server secret through a `VITE_*` variable.

### 3. Start the API

In the first terminal:

```bash
npm run dev:api
```

The API runs on port `3001` by default. It builds the server bundle and loads `.env.production`, `.env.local`, and the optional `.env.moderators.local`.

### 4. Start the Vite frontend

In a second terminal:

```bash
npm run dev
```

Open the local Vite URL shown in the terminal. Vite proxies `/api` requests to the local API.

### Production-style local run

```bash
npm run build
npm start
```

## User guide

### Start a workspace

1. Register with a display name and email.
2. Review the private starter workspace created for the account.
3. Open **My offers & needs** to inspect, edit, duplicate, pause, archive, or delete listings.
4. Add both a skill you can provide and a skill you want to receive.

### Discover a match

1. Open **Discover matches**.
2. Read the route explanation and the **Give / Learn / Meet** steps.
3. Use filters or sorting if needed.
4. Pass, save, or open **Review match**.
5. Check every participant, service leg, duration, availability, and imbalance warning.
6. Suggest changes if the terms are not suitable, then submit the proposal.

### Confirm and schedule

1. Each participant confirms independently.
2. Open **Conversation & schedule**.
3. Send a message and propose an exact date and time.
4. Accept the booking from the relevant participant.
5. Use **Export calendar** to download an `.ics` file.
6. After the scheduled start time, the provider can record delivery.

### Complete, evaluate, or dispute

After delivery, open **Sessions & trust** to record feedback, report a no-show, raise a dispute, or inspect reliability and settlement information. A dispute pauses settlement until a moderator records a reasoned resolution.

### Explore the built-in scenarios

Open **Demo Studio** or choose **Try a demo scenario**. The scenarios use repeatable browser-local demonstration state:

- **Give first, settle in parts:** see an imbalance, partial settlement, remaining obligation, and restored eligibility.
- **Keep the ring moving:** withdraw from a multi-party exchange, search for a replacement, renew consent, and complete recovery.
- **No replacement:** inspect the uncovered contribution and defaulted responsibility after a simulated deadline.
- **Disputes and amendments:** pause settlement, record a dispute decision, or change future session counts with all-party consent.

The participant selector lets you inspect a fictional ledger from each perspective. These demo confirmations are explicitly simulated and are not authenticated approvals.

## Recommendation engine

The recommender has two execution paths:

- **Local development:** the Node server runs the Python recommender as a subprocess.
- **Vercel production:** `/api/recommend` runs as a protected Python function and writes refreshed recommendations to Supabase.

The engine reads live offers, needs, availability, exchanges, commitments, reliability, and recommendation history. It produces feasible direct matches and complete cycles, rejects self-matches, and ranks candidates for each participating user.

For a standalone CSV regression run:

```bash
cd raw-database
python main.py --csv-dir HacKU/database_demo2_csv --output-dir result_outputs
```

The generated outputs include `matches.csv` and `recommendation_rankings.csv`.

## Architecture

```text
┌──────────────────────┐
│ React + Vite client  │
│ Discovery / UI / UX  │
└──────────┬───────────┘
           │ authenticated /api requests
┌──────────▼───────────┐
│ Node 24 server       │
│ auth / validation    │
│ atomic mutations     │
│ private data filter  │
└──────────┬───────────┘
           │ REST / RPC
┌──────────▼───────────┐       ┌──────────────────────┐
│ Supabase             │◄──────│ Python recommender  │
│ storage + functions  │       │ local / Vercel      │
└──────────────────────┘       └──────────────────────┘
```

The browser does not write privileged tables directly. The Node gateway performs identity, participant, ownership, revision, and private-response checks before committing changes.

## Environment variables

The repository includes `.env.example`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Browser-compatible Supabase URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Browser-compatible publishable key |
| `SUPABASE_URL` | Server | Server database URL |
| `SUPABASE_SECRET_KEY` | Server | Server-only secret key |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Legacy alias accepted for the server secret |
| `CRON_SECRET` | Production worker | Authorizes recommendation refresh jobs |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Optional | Allows protected preview-to-worker calls |
| `MODERATOR_USER_IDS` | Optional | Comma-separated moderator profile IDs |
| `PORT` | Optional | Local API port; defaults to `3001` |
| `PYTHON_BIN` | Optional | Python executable for the local server |

Keep server secrets in `.env.local`, `.env.production`, or a server-only secret store. Do not commit them and never prefix them with `VITE_`.

## Testing and verification

```bash
npm test
npm run test:auth
npm run test:production
npm run test:python
npm run build
```

Additional scripts are available in `scripts/`:

```bash
node scripts/self-matching-smoke.mjs
node scripts/live-smoke.mjs https://skills-ring.vercel.app
```

The live smoke test requires server credentials and writes only temporary test records to the configured project. Use it only against an environment intended for testing.

## Deployment

The Vercel deployment uses a static Vite frontend, a Node 24 `/api/*` function, a Python 3.12 `/api/recommend` function, and Supabase storage/RPCs.

Before deploying:

1. Apply committed migrations to the intended Supabase project.
2. Configure Vercel production and preview variables.
3. Confirm the server secret and `CRON_SECRET` are present server-side.
4. Run the test and build commands above.
5. Deploy:

```bash
vercel deploy --prod
```

Hosted recommendations refresh once per day, and mutations also request an immediate refresh. A failed refresh preserves the committed exchange change and reports that recommendations are pending.

## Project structure

```text
skills-ring/
├── src/                 React UI, domain model, styles, and client sync
├── server/              Node API, auth, persistence, moderation, calendar
├── api/                 Vercel Python recommendation entry point
├── raw-database/        Python matching engine and CSV fixtures
├── supabase/migrations/ Database schema, RPCs, indexes, and security rules
├── scripts/             Build, seed, smoke-test, and moderator utilities
├── skills/              Product and implementation skills
├── deliverables/        Product documentation and rationale
├── public/              Public images and static assets
└── README.md            Project documentation
```

Key implementation files:

- `src/domain.ts` — matching, transitions, commitments, settlement, reliability, and demo scenarios.
- `src/main.tsx` — primary workspace and workflow UI.
- `server/runtime.mjs` — production runtime configuration and server composition.
- `server/production-store.mjs` — Supabase-backed live state and authorization boundaries.
- `raw-database/engine/matching.py` — recommendation and cycle generation.
- `supabase/migrations/` — source of truth for the live database schema.

## Guided product demo

Click **Explore a demo** in the workspace header to start an isolated autoplay walkthrough. It uses the existing listing forms, matching engine, confirmations, bookings, and settlement logic. New offers and needs reveal actual new routes, followed by a three-person ring and a clearly labeled prepared partial-settlement example.

Use **Pause**, **Next**, **Replay chapter**, **Restart tour**, or **Try it yourself** at any time. **Explore chapters** jumps to discovery, ring coordination, or settlement. Exiting restores the previous workspace without replacing its demo data or writing tour activity to the live API. Reloading resumes at the chapter's initial checkpoint, paused. Tour matching preferences stay in memory; only the resumable chapter marker uses session storage. No video or audio is recorded.

The storyboard and optional expansion ideas live in [the demo skill](skills/demo-skills-ring/SKILL.md). Advanced withdrawal and dispute scenarios remain available in the manual Demo Studio.

## Product boundaries

Skills-Ring is a coordination and settlement prototype, not a payment platform or a guarantee of service quality.

- No real money, escrow, or payment custody is implemented.
- Completion bonds are simulation-only ledger records.
- Notifications are in-app; no SMS, push, or email exchange notifications are sent.
- Registration is self-reported and has no password or email verification.
- Rotating the server secret invalidates existing registration receipts.
- Reliability signals and imbalance warnings support decisions but do not guarantee fairness.
- The platform can preserve claims and record defaults, but cannot recreate an irreversible service.
- Moderation policy, privacy/retention rules, support procedures, SMTP/Auth URL setup, and an independent security review remain required before broad public launch.

## Version 2 status

Version 2 is a deployed application foundation with a complete demonstration workflow and a tested authenticated transaction layer. The next stage is operational hardening: community moderation policy, privacy and retention rules, support processes, production observability, and independent security review.

## License

No open-source license has been declared yet. Contact the project owner before redistributing or using the code commercially.
