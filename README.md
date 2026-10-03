# Skills-Ring

An Apple-inspired public community for individual skill sharing and non-monetary service exchange. Anyone can treat their skills as personal assets, share what they know, and exchange with others. Built with React, TypeScript, and Vite, with a standalone domain layer and a Vercel deployment configuration.

## Run locally

Use Node.js 22.12+ (22 LTS recommended) or Node.js 24.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. To validate and build:

```sh
npm test
npm run build
npm run preview
```

## Deploy to Vercel

Import this repository into Vercel, select the **Vite** framework preset, and use Node.js **22.x**. The included `vercel.json` sets `npm run build`, the `dist` output directory, and SPA fallback routing. No environment variables, API keys, external database, or paid resources are required for this demo. Deployment has not been performed by this build task.

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
- Storage key: `skills-ring-demo-v1`. State is local to one browser/device; there is no shared backend, authentication, real notification delivery, or independent service verification. The header selector and administrative decisions are explicitly simulated.
- Conditions use conservative exact matching. The form supports multiple coarse availability slots and optional date ranges. Session booking, messages, notifications, reminders, and discovery events are local demo records only; they are not delivered to other devices or participants. There is no collateral, payment, or email integration.
- Contributions and session records preserve original claims. Dispute resolutions record separate recognized-duration adjustments. Remaining sessions and commitment/settlement state are derived, not editable balances. For the demo, each accepted service leg is treated as a concrete obligation, without tokens or prices.
- The imbalance threshold is configurable through the domain helper (default 25% or different session counts). Participants’ consent is not a guarantee of substantive fairness.

The receive-first limit protects contributors but also constrains honest newcomers who need several services before reciprocating. Skills-Ring breaks when value has already been delivered, the responsible participant defaults, and no acceptable replacement or alternative route exists. It can preserve the claim, restrict the defaulter, and record the loss; it cannot recreate an irreversible service or guarantee repayment. Small networks, subjective service quality, collusion, pressure to agree, and rejected replacements remain real limits.

Before using this with a real community, add server-side transactional storage, authenticated identities and authorization, multi-user concurrency and approval handling, trusted timestamps, moderation and dispute permissions, and privacy/retention controls.
