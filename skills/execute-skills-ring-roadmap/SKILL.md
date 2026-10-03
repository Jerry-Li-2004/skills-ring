---
name: execute-skills-ring-roadmap
description: Plan, implement, verify, and track work from the Skills-Ring TODO.md roadmap. Use when prioritizing roadmap work, implementing one or more checklist items, auditing roadmap progress, or deciding whether a TODO item is complete. Do not use for unrelated repository changes that are not anchored to TODO.md.
---

# Execute the Skills Ring Roadmap

Use [`TODO.md`](../../TODO.md) as the delivery backlog for converting the current local Skills-Ring demo into a secure, accessible multi-user product. Complete bounded vertical slices, preserve the non-monetary exchange model, and update checklist state only from verified evidence.

## Sources of truth

Read sources in this order and only as far as the active work requires:

1. Read [`TODO.md`](../../TODO.md) for scope, priority, acceptance criteria, milestones, and success checks.
2. Inspect the current implementation and tests before proposing architecture or editing files.
3. Read [`../build-skills-ring-website/SKILL.md`](../build-skills-ring-website/SKILL.md) when work changes product behavior, data, matching, commitments, settlement, reliability, disputes, recovery, or user-facing product rules.
4. Follow that skill's links into [`deliverables/markdown/`](../../deliverables/markdown/) only for the domain areas affected by the task.
5. Treat an explicit instruction from the user as the newest requirement. If it conflicts with the roadmap or product documentation, surface the conflict and update the affected source of truth as part of the same change when authorized.

Do not treat `TODO.md` as proof that a feature is absent. Confirm the current state because the implementation and backlog can drift.

## Current repository baseline

The initial repository uses React, TypeScript, and Vite.

- `src/domain.ts` contains pure domain types, matching, transitions, ledgers, reliability, recommendations, and seed scenarios.
- `src/domain.test.ts` contains domain regression tests.
- `src/main.tsx` currently contains most workspace UI and interaction state.
- `src/styles.css` and `src/theme.css` both contain substantial responsive and component styling.
- `src/experience.tsx`, `src/EntryIntro.tsx`, and `src/SkillCover.tsx` contain richer presentation features.
- Browser-local state uses the `skills-ring-demo-v1` storage key.
- `scripts/browser-smoke.js` exercises the demo UI and resets local demo state.

Reinspect these files rather than assuming this baseline remains current. Preserve a viable stack unless the selected roadmap item genuinely requires an architectural change.

## Delivery protocol

### 1. Select a bounded slice

Translate the request into the smallest end-to-end slice that produces a user-visible or operational outcome. A checklist heading is not automatically one implementation unit.

Examples of suitable slices:

- Email registration, verification, authenticated session creation, protected route behavior, and tests.
- Card-stack discovery with button and keyboard actions, persisted pass/save state, and analytics events.
- Listing editing with server authorization, capacity validation, visible errors, and integration tests.

Avoid combining authentication, backend migration, discovery redesign, messaging, moderation, and deployment in one change unless the user explicitly requests a broad delivery and the environment supports it.

### 2. Audit dependencies and existing work

Before editing:

- Locate the checklist item and its acceptance criteria.
- Inspect related code, tests, configuration, documentation, and uncommitted changes.
- Identify prerequisites, data migrations, authorization boundaries, and downstream consumers.
- Determine which behavior is production, simulated, demo-only, or missing.
- Reuse current components and domain functions when they remain correct.
- Preserve unrelated user changes in a dirty worktree.

Do not mark a dependent item complete when its prerequisite is still simulated. For example, a polished registration form is not a completed login system without authenticated sessions, protected server behavior, and account persistence.

### 3. Define the contract before broad edits

For the selected slice, state or encode:

- Actor and user outcome.
- Entry condition and permission requirement.
- Data read and data written.
- Success, empty, loading, stale, unauthorized, offline, and server-error behavior where applicable.
- Audit and notification effects.
- Accessibility and privacy requirements.
- Acceptance evidence and tests.

Prefer types, schemas, state-machine transitions, and tests over prose-only contracts when implementation has begun.

### 4. Implement a vertical slice

Keep one source of truth for each fact. Place business invariants in testable domain or server logic, authorization at the trusted boundary, and presentation behavior in UI components.

When one user action changes multiple records, apply the change atomically. A failure must not leave a partial exchange, contribution, commitment, session, notification, or audit update.

Split modules when the active work would make the current large application component or stylesheets harder to reason about. Do not perform an unrelated repository-wide refactor merely because decomposition appears in the roadmap.

### 5. Verify proportionally to risk

Run the narrowest relevant checks during development, then the required completion checks for the slice. At minimum, existing TypeScript changes should pass:

```sh
npm test
npm run build
```

Add and run focused tests for new behavior. For user-facing critical paths, exercise the actual interface at representative desktop and mobile widths. Use the existing smoke script when its scenario covers the change; extend or add an end-to-end test when it does not.

Security, authorization, migrations, concurrency, dispute outcomes, and ledger mutations require negative-path tests. A screenshot or happy-path manual check is not sufficient evidence for those areas.

### 6. Update roadmap state from evidence

Only change `[ ]` to `[x]` when the exact statement is implemented and verified.

- Leave a broad parent item unchecked if only part is complete.
- Do not check an acceptance criterion because supporting UI exists; test the claimed outcome.
- Do not check production-readiness items while the behavior remains simulated or device-local.
- Keep historical wording stable unless the requirement itself changed.
- If an item is intentionally deferred, leave it unchecked and record the reason in the delivery report or an agreed planning note rather than presenting it as done.
- When implementation makes a backlog item obsolete, revise it explicitly and explain why instead of silently deleting it.

### 7. Report the result

State:

- The user outcome now available.
- Files and architecture materially changed.
- Tests and manual flows completed.
- Checklist items checked, partially addressed, or still blocked.
- Any migration, configuration, secret, deployment, privacy, or operational follow-up the user must handle.

Distinguish implemented, simulated, configured-but-unverified, and proposed behavior.

## Product invariants

Preserve these rules across every roadmap workstream:

- Offers and Needs are distinct records with their own level, duration, capacity, mode, location, availability, conditions, and status.
- Session duration and session count are separate quantities.
- A match is a proposal. It does not become an active exchange until every affected participant explicitly confirms the same terms.
- A Contribution records value already delivered. A Commitment records value owed later. Never collapse them into a generic balance.
- Completed work is immutable history. Amendments, withdrawal, replacement, dispute, or default may add records or recognized adjustments but must not erase performance.
- Partial settlement preserves completed sessions and shows the exact remainder.
- A replacement does not inherit another participant's debt automatically. Every affected participant must confirm revised responsibilities.
- Existing commitments take recommendation priority when a feasible route can fulfill them. Never reward accumulation of unpaid commitments.
- Quantity warnings may compare time, sessions, travel, or timing; they must not declare one skill intrinsically more valuable than another.
- Recommendation output explains feasibility, ranking reasons, obligation effects, and risks instead of exposing an unexplained score.
- The receive-first limit is enforced by trusted logic, not only by copy or disabled controls.
- Product UI must distinguish agreement, scheduled performance, claimed completion, recognized completion, and final settlement.

## Workstream playbooks

### Authentication and accounts

Use this playbook for the P0 login and registration section.

- Treat the identity provider and database choice as an architectural decision. Respect the user's chosen provider and existing infrastructure. Do not provision paid resources or external projects without authorization.
- Keep credentials and privileged keys out of source control and browser bundles.
- Store passwords only through a mature identity service or an appropriately hardened server implementation; never create custom reversible encryption.
- Use generic sign-in and reset responses where account enumeration would create risk.
- Protect server reads and mutations independently of route guards. A hidden button is not authorization.
- Model verification, active, suspended, and deleted states deliberately.
- Define session expiry, refresh, revocation, device behavior, and sign-out semantics.
- Rate-limit registration, sign-in, verification, and recovery endpoints.
- Test cross-account isolation, missing or expired sessions, suspended accounts, reset-token replay, and invalid verification links.

Completion requires the `TODO.md` acceptance criteria to work across browser reloads and, when a shared backend exists, across devices.

### Shared backend and migration

Use this playbook when replacing local storage or adding server-authoritative state.

- Map current domain objects before selecting tables or documents. Preserve stable identifiers where practical.
- Normalize durable facts; calculate remainders, eligibility, completion rates, and recommendation inputs from authoritative records.
- Define ownership and participant-based access for every object.
- Use transactions for confirmation, session completion, settlement, amendment application, dispute resolution, withdrawal, replacement, and default.
- Use idempotency keys or equivalent protection for repeatable client submissions.
- Add optimistic concurrency or record versions where multiple participants can act on the same exchange.
- Use server-generated timestamps for audit-significant events.
- Plan migration from demo storage separately from production user migration. Never upload fictional or stale browser state into real accounts silently.
- Test backup restoration and migration rollback before checking those roadmap items.

Keep Demo Studio isolated through fixtures, a demo environment, or an explicit resettable demo namespace.

### Profiles and onboarding

Use progressive disclosure. Ask only for information needed to create an account and obtain the first useful match.

- Require at least one Offer and one Need for good discovery, but allow users to save and resume onboarding.
- Keep exact home addresses, private contact information, credentials, and safety preferences private by default.
- Show how missing fields affect matchability without coercive completion tactics.
- Keep per-listing location and mode distinct from a user's general profile location.
- Provide a public-profile preview using the same privacy rules as actual viewers.
- Verify empty, partial, complete, private, suspended, and deleted profile states.

### Discovery card experience

Use this playbook for the Tinder-style discovery redesign.

Treat swiping as an optional input method, not the information architecture.

- Present one clear decision at a time on narrow screens; use a restrained stack or focused layout on larger screens.
- Show identity summary, offered and wanted skills, direct-versus-ring type, give/receive terms, session quantities, common availability, mode, approximate location, reliability evidence, and risk or imbalance warnings.
- Keep **Pass**, **Save**, and **Review match** available as labeled controls.
- Support pointer, touch, keyboard, and assistive technology with equivalent actions.
- Do not create a proposal from an unconfirmed swipe. `Review match` leads to complete terms and explicit confirmation.
- Persist seen, passed, saved, proposed, expired, and unavailable states per authenticated user.
- Provide one-step undo for the latest pass without rewinding committed actions.
- Preserve filters, sort, stack position, and scroll position across detail navigation when feasible.
- Announce the active card and its position, such as “Match 3 of 12.”
- Handle the end of the stack with actions to broaden filters, edit listings, or revisit saved matches.

For multi-party routes, the card may summarize the opportunity, but the review view must name every participant and list every directed service leg before proposal.

Track impressions only when a card is meaningfully visible. Keep analytics privacy-safe and separate from business state.

### Match details and proposals

- Separate hard feasibility from preference ranking.
- Show which Offer satisfies which Need and which constraints matched.
- Display current terms beside suggested revisions.
- Recalculate capacity, eligibility, feasibility, imbalance, and route effects after a change.
- Require renewed consent for material changes.
- Store proposal expiry, decline, cancellation, and supersession as explicit states or events.
- Make repeated submission idempotent and reject stale proposals safely.
- Notify all affected participants after the authoritative change commits.

### Offers and needs

- Reuse the standardized skill library as the primary matching key.
- Give the `Other` path a reviewable canonicalization process; do not make arbitrary free text silently match unrelated services.
- Support editing, duplication, archive, deletion, fulfillment, pause, and resume with clear distinctions.
- Prevent destructive listing changes from invalidating accepted obligations.
- Derive available capacity from total capacity minus active reservations and completed allocation according to domain rules.
- Explain zero-match outcomes with actionable constraint information without exposing another user's private data.

### Messaging and scheduling

- Scope conversations to a proposal or exchange and authorize every participant on each read and write.
- Avoid exposing personal contact details in notifications or previews.
- Store exact times with timezone information and render them in the viewer's locale.
- Model proposed, accepted, rescheduled, cancelled, completed, and no-show states.
- Keep calendar export optional and one-way until update and cancellation semantics are reliable.
- Treat reminders as derived delivery events, not proof that a user received or read a message.
- Define no-show evidence, grace periods, dispute entry, and impact on reliability before applying penalties.

### Trust, moderation, and disputes

- Keep community policy, enforcement action, and product reliability signals separate.
- Require role-based authorization for moderator and administrator actions.
- Preserve submitted evidence and an audit trail while applying retention and access controls.
- Support user, profile, listing, message, and exchange reports with block and mute where appropriate.
- Prevent self-review and duplicate evaluation for the same eligible session.
- Show reliability sample size and component indicators; avoid labeling personal worth.
- Make verification badges specific about what was verified and when.
- Put disputed settlement on hold without deleting the claimed session.
- Record full release, partial release, default, and appeal as explicit outcomes with their effect on remaining obligations.

Do not claim the platform objectively verified subjective service quality unless an actual verification process supports that statement.

### Exchange execution and recovery

- Present a durable exchange page with current status, next action, responsible participant, due time, terms, history, and settlement progress.
- Make session completion mutually visible and preserve the original claim separately from recognized adjustments.
- Support deadline, grace-period, overdue, dispute, withdrawal, replacement, unresolved, defaulted, and settled paths.
- Search all feasible recovery routes rather than a hard-coded demo participant.
- Preserve the original debtor after post-performance withdrawal unless an explicit resolution changes responsibility.
- Pair any route graph with plain-language responsibilities.
- Test recovery both before and after performance, with and without a replacement.

### Notifications

- Generate notifications from committed domain events, not optimistic client actions.
- Persist read state and deep-link targets per recipient.
- Group repetitive events without hiding a required action.
- Respect per-channel preferences, while preserving essential security and account messages.
- Exclude sensitive exchange details from lock-screen and email preview copy by default.
- Make delivery retryable and idempotent.

### Community features

- Apply privacy rules consistently to search results and profile pages.
- Use approximate location or explicit community membership instead of revealing exact addresses.
- Tie exchange endorsements to eligible completed records or label them as unverified.
- Add invitation and referral controls only with rate limits, block/report coverage, and abuse monitoring.

### Navigation and information architecture

- Use stable routes for durable entities and views.
- Preserve browser back/forward behavior, deep links, refresh, authorization redirects, and missing-resource states.
- Keep transient filters in query parameters or deliberate navigation state when sharing or restoration matters.
- Separate Demo Studio and destructive reset actions from production primary navigation.
- Verify the most important mobile actions remain reachable and that overlays do not become navigation dead ends.

### Accessibility

Treat WCAG 2.2 AA as a product acceptance constraint, not a final audit-only task.

- Preserve semantic headings, regions, forms, lists, buttons, links, dialogs, and status messages.
- Trap focus only inside true modal dialogs, restore it to the opener, and support Escape when dismissal is safe.
- Associate errors and instructions with their fields.
- Keep touch targets, contrast, reflow, zoom, focus visibility, and reduced motion in scope.
- Do not encode direct/ring type, risk, status, or settlement only through color, position, or animation.
- Provide text alternatives for diagrams and meaningful images.
- Verify complete flows with keyboard input and representative screen readers; automated scans are necessary but insufficient.

### Performance and code health

- Measure before setting budgets or optimizing.
- Split `src/main.tsx` along stable feature and route boundaries as relevant work touches it.
- Consolidate style ownership incrementally; verify visual regressions when changing overlapping rules in `styles.css` and `theme.css`.
- Lazy-load non-critical routes and demo-only code without hiding essential content behind client-only delays.
- Optimize image dimensions, formats, and responsive delivery.
- Add error boundaries around recoverable UI regions and clear network retry behavior.
- Track bundle size, layout shift, and interaction latency in repeatable environments.

### Content, localization, and legal surfaces

- Use Offer, Need, match, proposal, exchange, Contribution, Commitment, Session, and Settlement consistently with the canonical documents.
- Prefer plain-language primary labels and introduce domain terms with short explanations.
- Clearly label demo identities, simulated administration, and non-production behavior.
- Externalize user-facing strings before translation and use locale-aware dates, times, numbers, and plurals.
- Test long translations and right-to-left layout if any selected launch language requires it.
- Treat Terms, Privacy, Community Standards, Safety, and Support as owner-reviewed product requirements. Do not invent jurisdiction-specific legal claims.

### Matching quality and measurement

- Keep feasibility deterministic and testable before ranking.
- Prefer transparent ranking signals: reciprocity, obligation fulfillment, network recovery, availability overlap, mode or distance, reliability evidence, and risk.
- Allow near-match flexibility only when users can see and negotiate the mismatch.
- Evaluate cold start, sparse areas, new-user exposure, popularity concentration, and commitment-priority side effects.
- Define event names, actor, timestamp, entity IDs, and privacy classification before adding analytics.
- Measure the funnel from eligible recommendation through review, proposal, acceptance, scheduled session, completion, dispute, and settlement.
- Do not optimize card swipes as the primary success metric; optimize useful accepted and completed exchanges.

### Engineering and operations

- Add unit tests for domain rules, component tests for interaction states, integration tests for trusted boundaries, and end-to-end tests for critical journeys.
- Include authorization, concurrency, idempotency, migration, retry, and failure tests where those risks exist.
- Keep logs structured and free of secrets, passwords, reset tokens, private messages, and unnecessary personal data.
- Gate merges with type checks, tests, build, and the relevant accessibility or bundle checks.
- Document environment setup, secrets, deployment, rollback, backup restoration, and incident response as those systems are introduced.
- Use feature flags for high-risk launches, but define ownership, default state, telemetry, and removal criteria.

## Verification matrix

Apply the rows relevant to the selected slice.

| Change type | Required evidence |
|---|---|
| Domain rule | Focused unit tests plus existing domain suite |
| UI interaction | Component or end-to-end test plus keyboard check |
| Responsive layout | Representative phone and desktop rendering |
| Accessibility behavior | Automated scan where available plus manual keyboard or screen-reader flow |
| Authentication | Happy path, invalid credentials, expired state, sign-out, and protected resource tests |
| Authorization | Same-account success and cross-account denial at the trusted boundary |
| Database mutation | Transaction, rollback or failure, idempotency, and concurrency behavior |
| Migration | Forward migration, representative data verification, and rollback or recovery plan |
| Notification | Recipient authorization, idempotent generation, deep link, and preference behavior |
| Analytics | Event payload inspection, duplication check, consent or privacy classification |
| Exchange ledger | Contribution, Commitment, remainder, settlement, and audit consistency |
| Recovery or dispute | Before/after performance branches and effect on immutable history |
| Deployment | Production build, environment validation, deployed critical-path smoke test, and rollback readiness |

## Definition of done

A roadmap slice is done only when:

- The requested behavior works through the real user path, not only through isolated mocks.
- Trusted authorization and domain invariants are enforced below the presentation layer.
- Loading, empty, error, stale, and unauthorized states relevant to the slice are handled.
- Accessibility is built into the interaction rather than deferred without acknowledgment.
- Focused tests pass, regressions are checked, and the production build succeeds when code changed.
- Documentation, schema notes, fixtures, and operational configuration affected by the change are current.
- Secrets and private data are absent from source, logs, analytics, and client bundles.
- Only fully evidenced `TODO.md` items are checked.
- The delivery report states any simulation, unverified external dependency, migration requirement, or remaining risk.

Do not declare a milestone complete merely because each screen exists. Milestones require the cross-device, multi-user, safety, and operational outcomes described in `TODO.md`.
