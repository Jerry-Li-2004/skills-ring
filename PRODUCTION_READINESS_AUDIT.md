# Skills-Ring production-readiness audit

Audit date: 2026-10-03  
Local deployment: <http://127.0.0.1:3001/>  
Stage verdict: **Core exchange MVP works, but the product is not production-ready.**

Follow-up: the six requested P1 findings have now been addressed. See [P1_FIXES.md](P1_FIXES.md) for changes, verification, and moderator access. The original findings below are retained as audit history; broader P0 authentication and launch-readiness work remains.

## What is working

The production build starts successfully and renders without a browser error overlay, console errors, or console warnings. The following MVP journeys were exercised successfully in the browser:

1. Registration and creation of a live starter workspace.
2. Switching between the live workspace and the demo workspace.
3. Match discovery, filtering, saving, revisiting, passing, and undoing a pass.
4. Direct proposal review, confirmation, partial completion, and final settlement.
5. Three-person ring confirmation, participant withdrawal, compatible replacement, renewed confirmation, and settlement.
6. Listing duplication, pause/resume, creation, and edit-form opening.
7. In-exchange conversation, scheduling, acceptance, feedback, disputes, changed terms, cancellation, decline, and future-session amendments.
8. Desktop global search, notifications, account menu, help, motion preference, primary navigation, and responsive rendering.

Automated verification also passed:

| Check | Result |
| --- | --- |
| Production build | Passed |
| Frontend/domain tests | 31 passed |
| Auth integration tests | 4 passed |
| Production integration tests | 9 passed |
| Python tests | 17 passed |
| Total automated tests | **61 passed** |

## Original button and control gaps (before the P1 fixes)

These are the controls that are incomplete, unreachable, semantically wrong, or not proven ready at this stage:

| Priority | Control | Current behavior | Production-ready outcome |
| --- | --- | --- | --- |
| P0 | Notifications on small phones | The Notifications button disappears at a 390 px viewport, leaving notifications unreachable. | Keep notifications accessible from the mobile header, navigation, or account menu. |
| P0 | Account access / Leave profile | Registration produces a browser-held receipt, but there is no password, email verification, sign-in, recovery, device transfer, or revocable session. Leaving or clearing the browser can lose access. | Implement recoverable authentication, session management, and explicit account deletion/export. |
| P0 | Dispute action | A provider can be shown a button labelled as raising a dispute on behalf of the receiver. The server should reject that actor mismatch, so the visible action can be invalid. | Render the action only for the eligible current participant and derive the actor server-side. |
| P1 | Export calendar | The handler exists, but the audit browser did not observe a downloaded file after activation. | Verify a valid `.ics` download in supported desktop/mobile browsers and add an automated download assertion. |
| P1 | Community entries | The Community page is a long static list with no search, pagination, or actionable profile/detail controls. | Add community search, profile pages/previews, pagination, privacy controls, and safe contact actions. |
| P1 | Demo/live workspace switch | The mode choice is written to storage but is not restored when the app reloads. | Restore the last valid workspace mode on startup, or remove the misleading persistence behavior. |
| P1 | Demo community isolation | After live data has loaded, switching to the fictional demo can expose names from the live community in the demo list. | Keep live and fictional people stores isolated and reset demo-derived selectors when modes change. |
| P1 | Decline and cancel status | Both paths end with the broad status `Withdrawn`, obscuring whether a proposal was declined or cancelled. | Preserve distinct declined/cancelled states and copy in the status, activity, and notification surfaces. |
| P1 | Moderator resolution | Live users can raise a dispute, but the product has no complete role-based moderator workspace or trusted resolution workflow. | Add moderator roles, queues, evidence handling, auditable decisions, and notification of outcomes. |

The destructive listing Delete control, account Leave profile control, and simulated dispute-resolution controls were intentionally not activated against persistent data. Their presence and guards were inspected, but destructive effects were not included in this audit.

## Production blockers beyond individual buttons

- Authentication is explicitly an open-registration prototype. It lacks identity verification, login/recovery, cross-device access, session revocation, abuse protection, and complete account-state handling.
- The registration surface has no Terms, Privacy, Safety, support, retention, export, or deletion flow. These are launch blockers for real users.
- Navigation is internal component state while the URL remains `/`; pages do not have stable links, deep links, or browser-history behavior.
- Notifications are in-app only. Email/push/SMS preferences and delivery are not implemented.
- Reporting, blocking, muting, moderation queues, and role-based administration are incomplete.
- Error boundaries, offline handling, production logging, analytics, monitoring, alerting, backup/restore drills, rollback documentation, CI gates, and an independent security review are still required.
- The main JavaScript bundle is about 601 kB minified (about 171 kB gzip), above Vite's 500 kB warning threshold. Route/component splitting and performance budgets are not in place.
- Accessibility has useful primitives such as labelled controls and modal focus handling, but a WCAG 2.2 AA audit and assistive-technology testing have not been completed.
- The repository's live smoke script currently expects auth mode `supabase`, while the health endpoint correctly reports `registration`. The stale assertion makes that release gate fail before exercising the live journey.
- `TODO.md` is out of date: several implemented backend items remain unchecked, while genuine production gaps are mixed into the same list. It should be reconciled before using it as a release checklist.

## Audit limitations

- One approved test profile was created: `Skills-Ring MVP Audit` / `mvp-audit-20261003@example.com`. Because account deletion is not implemented, it remains in the configured Supabase project.
- Live multi-user synchronization was covered by integration tests, but this browser pass did not use two independent human-controlled devices.
- Real outbound email, moderator operations, destructive account/listing deletion, calendar import, screen-reader behavior, and external penetration testing were not completed.

## Recommended release order

1. **Health: blocked** — finish recoverable authentication, legal/privacy/account lifecycle, authorization-safe dispute controls, and the mobile notification entry point.
2. **Health: at risk** — finish moderation/community profiles, stable routes, demo/live isolation, calendar export verification, error/offline behavior, and notification delivery.
3. **Health: needs hardening** — add observability, CI release gates, recovery/rollback, accessibility certification, bundle splitting, and security review.
4. **Health: ready after the above** — repeat the full two-user browser journey in a production-like environment and require every release gate to pass.
