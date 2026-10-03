# Skills Ring Product To Do List

This backlog turns the current local demo into a trustworthy multi-user product. The first two priorities are account access and a Tinder-style discovery experience; the remaining work covers the largest product, trust, accessibility, and operational gaps found across the website.

## Priority guide

- **P0 — Foundation:** required before real users or shared data.
- **P1 — Core experience:** directly improves successful skill exchanges.
- **P2 — Trust and retention:** makes exchanges safer and easier to complete.
- **P3 — Scale and polish:** improves growth, operations, and long-term quality.

## P0 Foundation

### User login and registration system

- [ ] Choose the production authentication and database stack.
- [ ] Add registration with email verification and clear password requirements.
- [ ] Add sign in, sign out, forgotten-password, and password-reset flows.
- [ ] Add optional social sign-in only if it reduces onboarding friction for the target community.
- [ ] Create authenticated sessions with secure expiry, renewal, and revocation.
- [ ] Replace the demo participant selector with the signed-in user's identity.
- [ ] Protect private routes and server actions; redirect unauthenticated visitors to sign in.
- [ ] Add account states for active, suspended, deleted, and pending verification.
- [ ] Add rate limiting and abuse protection to registration, sign-in, and reset endpoints.
- [ ] Add friendly loading, invalid-credential, duplicate-account, expired-link, offline, and server-error states.
- [ ] Add automated tests for registration, verification, sign-in, reset, sign-out, and route protection.

Acceptance criteria:

- [ ] A new user can create and verify an account, sign in on another device, reset their password, and sign out.
- [ ] One user cannot read or modify another user's private records through the UI or API.
- [ ] The application never stores plain-text passwords or exposes authentication secrets to the browser.

### Shared backend and production data model

- [ ] Move users, profiles, listings, exchanges, sessions, contributions, commitments, disputes, and evaluations from browser-local storage to a transactional backend.
- [ ] Preserve the current domain rules while making every mutation server-authoritative.
- [ ] Add authorization checks for each participant action, including confirmations, session completion, withdrawal, disputes, and resolution.
- [ ] Add optimistic concurrency or version checks so simultaneous approvals cannot overwrite one another.
- [ ] Add immutable audit records with trusted server timestamps.
- [ ] Add schema migrations, indexes for matching queries, backups, and a tested restore procedure.
- [ ] Define data retention, account export, and account deletion behavior.
- [ ] Keep Demo Studio isolated from production accounts and data.

Acceptance criteria:

- [ ] Two signed-in users on different devices see the same exchange state after an update.
- [ ] Conflicting actions fail safely and explain what changed.
- [ ] Refreshing or changing devices does not lose valid user data.

### Profile creation and onboarding

- [ ] Create a short onboarding flow for name, avatar, short bio, languages, general location, preferred modes, and safety preferences.
- [ ] Ask users to add at least one offer and one need, with an option to finish later.
- [ ] Show profile completeness and explain which missing details reduce match quality.
- [ ] Let users edit profile details, notification preferences, privacy settings, and account settings.
- [ ] Add a public profile preview that reveals only information needed to evaluate an exchange.
- [ ] Avoid exposing exact home addresses or unnecessary personal information.

## P1 Core experience

### Redesign Discover matches as a Tinder-style card experience

- [ ] Replace the dense discovery grid with one focused profile card at a time on narrow screens and an optional card stack on larger screens.
- [ ] Show the member's avatar, name, short bio, skills offered, skills wanted, reliability summary, shared availability, mode, general location, and direct-versus-ring match type.
- [ ] Make the exchange proposition explicit: **You give**, **You receive**, number and duration of sessions, and all participants in a multi-person ring.
- [ ] Add visible **Pass**, **Save**, and **Review match** controls.
- [ ] Add left/right swipe gestures as progressive enhancement; keep every action available through buttons and the keyboard.
- [ ] Use a confirmation step before creating a proposal so an accidental swipe cannot commit the user.
- [ ] Explain each recommendation with concrete reasons and surface quantity imbalance or risk before review.
- [ ] Add Undo for the most recent pass and a Saved matches collection.
- [ ] Prevent duplicate cards and remember seen, passed, saved, proposed, expired, and unavailable states.
- [ ] Add filters for skill, category, online/offline, approximate location, availability, session length, direct/ring match, and reliability.
- [ ] Add sort options for best fit, soonest availability, direct match, commitment priority, and newest.
- [ ] Add a clear end-of-stack state with actions to broaden filters, edit offers or needs, and revisit saved matches.
- [ ] Define empty, loading, stale-result, disconnected, and match-no-longer-available states.
- [ ] Instrument impressions, profile expansion, pass, save, review, proposal, and accepted-exchange events.

Acceptance criteria:

- [ ] A user can evaluate the essential exchange terms without opening another page.
- [ ] Swipe, pointer, touch, keyboard, and screen-reader users can complete the same actions.
- [ ] Passing never creates an exchange; Review match opens the full terms and confirmation flow.
- [ ] A multi-person ring is understandable before the user proposes it.

### Match detail and proposal flow

- [ ] Add a full profile and match-detail view behind every discovery card.
- [ ] Show why the match is feasible, which constraints align, and which constraints are flexible.
- [ ] Visualize direct and multi-party routes with readable names, directions, and service terms.
- [ ] Let users suggest changes to session count, duration, mode, location, or availability before proposing.
- [ ] Show the effect of proposed changes on every participant and require renewed consent when terms change.
- [ ] Add proposal expiry, decline reasons, cancellation, and re-proposal behavior.
- [ ] Notify every affected participant when a proposal is created, changed, accepted, declined, or expires.

### Offers and needs management

- [ ] Add edit, duplicate, archive, delete, and mark-fulfilled actions; the current interface only pauses or resumes listings.
- [ ] Support multiple availability slots and optional date ranges in the form.
- [ ] Improve the **Other** skill path with a searchable suggestion and moderation workflow.
- [ ] Show how many matches each listing can produce and why a listing has no matches.
- [ ] Warn when pausing or deleting a listing would affect an active proposal.
- [ ] Validate capacity against reserved and completed sessions.

### Scheduling and communication

- [ ] Add in-product conversation threads scoped to a proposal or exchange.
- [ ] Protect users from sharing sensitive contact information too early.
- [ ] Let participants propose, accept, reschedule, cancel, and complete exact session times with timezone handling.
- [ ] Add calendar export and reminders; consider two-way calendar sync after the core flow is stable.
- [ ] Add online meeting-link and safe public meeting-place fields.
- [ ] Add no-show reporting and a grace-period policy.

## P2 Trust, safety, and retention

### Trust and safety

- [ ] Define community standards, prohibited services, age requirements, and escalation rules.
- [ ] Add block, report, and mute controls for users, profiles, messages, listings, and exchanges.
- [ ] Add moderation queues, evidence handling, case notes, and role-based moderator permissions.
- [ ] Separate participant actions from administrator-only dispute resolution; remove simulated admin controls from normal production views.
- [ ] Add identity or credential verification as optional, clearly labeled trust signals rather than guarantees.
- [ ] Show how reliability is calculated, the sample size, and when there is not enough evidence.
- [ ] Prevent self-review, duplicate feedback, retaliation patterns, and obvious review manipulation.
- [ ] Add safety guidance for online and in-person exchanges and an emergency-support link appropriate to the launch region.
- [ ] Run a privacy and security review before launch.

### Exchange execution and recovery

- [ ] Turn the current exchange detail modal into a clear step-by-step status page.
- [ ] Show the next required action, responsible person, due date, and consequences of delay.
- [ ] Add session evidence or mutual completion confirmation without implying that the platform independently verified service quality.
- [ ] Add deadlines, reminders, grace periods, and overdue states to commitments.
- [ ] Generalize replacement search beyond the current demo participant and rank all feasible recovery routes.
- [ ] Preserve original obligations and contributions through amendment, replacement, dispute, and default.
- [ ] Add appeal and moderator review paths for disputed outcomes.
- [ ] Make final settlement understandable with a participant-by-participant summary.

### Notifications

- [ ] Replace the current static notification modal with persistent, user-specific notifications.
- [ ] Add read/unread state, deep links, grouping, and notification history.
- [ ] Let users choose in-app and email preferences by event type.
- [ ] Notify only on meaningful actions: proposal, confirmation, schedule change, reminder, completion, dispute, recovery, and settlement.
- [ ] Avoid exposing private exchange details in lock-screen or email previews by default.

### Community and profiles

- [ ] Add search and filters to the Community page.
- [ ] Add profile pages with offers, needs, mutual connections, reliability evidence, and completed exchange history.
- [ ] Add endorsements only when tied to a completed exchange or otherwise clearly labeled.
- [ ] Add community or neighborhood membership with privacy-preserving approximate location.
- [ ] Add invitations and referrals with abuse controls.

## P2 Website quality

### Navigation and information architecture

- [ ] Replace string-based page switching with real routes and browser history support.
- [ ] Give exchanges, profiles, listings, notifications, and settings stable URLs.
- [ ] Preserve filters and scroll/card position when returning from match details.
- [ ] Review mobile navigation so the most important actions remain reachable with one hand.
- [ ] Move Demo Studio and workspace-reset controls out of the production primary navigation.

### Accessibility

- [ ] Test all flows against WCAG 2.2 AA, including color contrast, zoom, reflow, focus order, target size, labels, and error identification.
- [ ] Trap focus inside dialogs, restore focus to the opener, and support Escape consistently.
- [ ] Announce asynchronous results, card changes, errors, and confirmations without overloading live regions.
- [ ] Give swipe cards meaningful structure and expose position such as “Match 3 of 12.”
- [ ] Ensure charts, route diagrams, avatars, icons, and status colors have text equivalents.
- [ ] Recheck all animation and celebration effects with reduced-motion preferences.
- [ ] Test with keyboard-only navigation and at least VoiceOver and NVDA.

### Responsive design and performance

- [ ] Test key flows at small phone, large phone, tablet, laptop, and wide desktop sizes.
- [ ] Remove duplicated or conflicting style rules across the two large stylesheet layers.
- [ ] Split the large application component into route, feature, and shared UI modules.
- [ ] Lazy-load non-critical routes, images, and demo-only features.
- [ ] Optimize skill-cover images and provide responsive image sizes.
- [ ] Set measurable budgets for initial JavaScript, image weight, interaction latency, and layout shift.
- [ ] Add error boundaries and a recoverable offline/network-error experience.

### Content and usability

- [ ] Standardize terminology for offer, need, match, proposal, exchange, commitment, contribution, session, and settlement.
- [ ] Add concise contextual help for ring exchanges, receive-first limits, imbalance, disputes, and replacement responsibility.
- [ ] Replace demo-specific names and simulated actions in production copy.
- [ ] Add a first-run checklist and sample preview without forcing users through the long animated intro.
- [ ] Make destructive or irreversible actions explicit and require confirmation where appropriate.
- [ ] Add Terms, Privacy, Community Standards, Safety, and Support pages before public launch.

## P3 Scale and operations

### Search and matching quality

- [ ] Separate hard feasibility constraints from preference-based ranking.
- [ ] Rank matches using reciprocity, availability overlap, distance or mode, reliability evidence, active commitments, and network value.
- [ ] Explain ranking without presenting a misleading universal compatibility score.
- [ ] Add controlled flexibility for near matches, such as adjacent times or session-length negotiation.
- [ ] Add fairness checks for cold start, popularity bias, geographic sparsity, and new-user disadvantage.
- [ ] Measure accepted-match rate, time to first match, time to settlement, completion rate, dispute rate, and rematch success.

### Engineering quality

- [ ] Expand tests from domain logic to component, integration, API authorization, migration, and end-to-end coverage.
- [ ] Add end-to-end tests for the complete direct exchange and multi-person ring journeys.
- [ ] Add automated accessibility checks and visual regression tests for critical pages.
- [ ] Add structured logging, privacy-safe analytics, error monitoring, and operational alerts.
- [ ] Add CI checks for type safety, tests, build, accessibility, and bundle-size budgets.
- [ ] Document environments, secrets, deployment, rollback, backup restoration, and incident response.
- [ ] Add feature flags for the discovery redesign and other high-risk launches.

### Localization and growth

- [ ] Prepare interface copy for localization and locale-aware dates, times, and plurals.
- [ ] Decide launch languages and test long translated strings before release.
- [ ] Add shareable public profile or listing links with privacy controls.
- [ ] Add invite loops only after activation, safety, and completion metrics are healthy.

## Suggested delivery sequence

### Milestone 1 — Real accounts and shared state

- [ ] Complete authentication, profiles, backend persistence, authorization, and audit history.
- [ ] Convert the current demo scenarios into isolated test fixtures.

### Milestone 2 — Better discovery

- [ ] Ship the accessible Tinder-style card stack behind a feature flag.
- [ ] Add filters, saved/pass state, match details, proposal review, and discovery analytics.

### Milestone 3 — Complete a real exchange

- [ ] Add messaging, scheduling, notifications, session completion, feedback, and settlement.
- [ ] Validate the end-to-end flow with a small invited community.

### Milestone 4 — Trustworthy public beta

- [ ] Add reporting, moderation, disputes, recovery, privacy controls, legal pages, monitoring, and support operations.
- [ ] Run accessibility, security, data-recovery, and abuse-response checks before opening registration.

## Product success checks

- [ ] New users understand the give-and-receive model without staff explanation.
- [ ] At least one useful match appears quickly or the product clearly explains how to improve matchability.
- [ ] Users can distinguish a direct match from a multi-person ring and understand their own obligation.
- [ ] Participants can coordinate and complete an exchange without moving to another service.
- [ ] Every state-changing action is attributable, authorized, and recoverable through the audit history.
- [ ] Reliability communicates evidence and uncertainty without becoming a hidden social credit score.
- [ ] The product remains fully usable without swipe gestures or decorative motion.
