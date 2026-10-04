---
name: demo-skills-ring
description: Plan, implement, rehearse, or record the Skills-Ring guided product demo, including dynamic offer/need matching, exchange settlement, and a three-minute presentation. Use for Skills-Ring demo tours and recording preparation.
---

# Skills-Ring demo pipeline

Use this skill to turn “Explore a demo” into an understandable, repeatable product story for judges and first-time users. Show new matches emerging from actual listing changes, then explain agreement, coordination, delivery, and settlement.

## Choose the requested stage

- For brainstorming, narration, or a shot list, read [the storyboard](references/demo-storyboard.md).
- For implementation, fixtures, verification, or recording preparation, read [the implementation specification](references/demo-implementation.md). Also read the storyboard when changing playback order or timing.
- For recording, complete the specification's rehearsal and capture gates before describing footage as ready.

Keep the user's requested stage explicit. A documentation request produces Markdown, not application changes or a video. A tour implementation request does not itself request deployment. A recording request requires an available recorder and a verified running tour; explain missing capabilities rather than claiming capture occurred.

## Repository context

This specification was checked against source on 2026-10-04. Reinspect relevant code before implementing because labels and behavior may change.

- `src/main.tsx` owns workspace mode, navigation, Demo Studio, listing forms, and exchange detail views. “Explore a demo” opens the isolated guided tour; manual Demo Studio remains separate.
- `src/domain.ts` owns fictional fixtures, compatibility, route discovery, and state transitions. Demo routes are calculated from listings; do not replace this with scripted match cards.
- `src/Discovery.tsx` provides discovery, save/pass/filter controls, and proposal review. `src/Coordination.tsx` provides exchange messages and bookings.
- Existing local demo scenarios cover everyday exchanges, direct partial settlement, and ring recovery. `src/TourGuide.tsx`, `src/tour-runner.ts`, and `src/tour-model.ts` implement autoplay, highlights, pause/replay, and isolated chapter checkpoints. Video recording remains a separate optional task.

Use source behavior as the authority when older README walkthroughs disagree with current live/demo separation. “Give” and “offer” refer to the same listing type; “need” is a distinct type.

## Workflow

1. Establish the requested output: documentation, implementation, rehearsal, or footage. Default to English and fictional participants.
2. Inspect mode entry, storage, listing submission, route computation, and exchange controls. Preserve live state and existing manual demo progress.
3. Prepare the deterministic fixtures in the implementation reference. Verify that adding an offer, adding a need, and closing a ring each changes actual eligible route identities.
4. Build or rehearse the storyboard using ordinary UI handlers and domain transitions. Highlight actions and their results; wait for readiness rather than advancing on timing alone.
5. Validate pause, replay, exit, hands-on controls, accessibility, and isolation as well as the narrative's domain outcomes.
6. Rehearse the 180-second route. Keep deeper features in optional chapters and remove rushed gestures before shortening result-reading time.
7. When capture is requested, follow the recording checklist and review the exported video and captions.
8. Report which artifacts exist, what was verified, and what remains proposed or simulated.

## Required story invariants

- A new listing must produce an actual compatible route before displaying “new match.” Compare route identities, not just counts or ranking position.
- Match results adapt to declared offers and needs. Do not claim that the platform infers or edits a user's needs without input.
- Keep a persistent fictional-demo label. Explicitly label simulated participant consent, elapsed-time checkpoints, moderation, and financial references.
- Never send tour writes to live listing, message, exchange, recommendation, or moderation endpoints. Local messages address fictional participants only.
- Use the domain model for completed contributions, remaining commitments, partial settlement, and restored receive-first eligibility. Never write invented totals into the presentation.
- Do not complete a future booking by disabling time guards. Introduce the documented prepared settlement checkpoint instead.
- Do not imply that rematching guarantees repayment or that simulated bonds hold real money.

## Completion evidence

For Markdown work, validate YAML frontmatter, links, source terminology, fixture feasibility, and the 180-second timing total. For application work, also demonstrate the acceptance matrix in the implementation reference. For video work, deliver playable footage and synchronized captions only after reviewing the actual export. Do not report application or video acceptance checks as passed when only the specification exists.
