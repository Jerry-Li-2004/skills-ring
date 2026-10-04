# Demo implementation and recording specification

## Current timing update

The shortened autoplay follows the current walkthrough at the top of [the storyboard](demo-storyboard.md). It uses 122 seconds of reading holds plus UI readiness/action time. Discovery now publishes one two-session Python offer and keeps the single Bob match; the Guitar addition remains only in fixture coverage tests. The ring chapter demonstrates adding a need. The original A2 sequence and 180-second recording plan below are historical, not the current autoplay requirement.

## Status and boundaries

The core guided tour is implemented in `src/TourGuide.tsx`, with cancellable playback in `src/tour-runner.ts` and isolated fixtures in `src/tour-model.ts`. The original specification below also describes optional future refinements. The app uses chapter-level resume markers, restarts the saved chapter paused after reload, and keeps tour data in memory. Exact mid-step persistence and automated recording are not implemented. Advanced optional chapters remain in the manual Demo Studio.

Implement client-side only. No new public backend endpoint or production migration is needed. Preserve the existing live workspace and manual Demo Studio. The three-minute route follows [the storyboard](demo-storyboard.md); additional chapters are longer educational paths, not extra footage squeezed into 180 seconds.

## Deterministic fixtures

Create fixture builders from existing domain types and catalog values. Use stable listing IDs scoped to the tour, known fictional people, no live matches/stats, and empty exchange/session/contribution/evaluation collections unless the checkpoint specifies otherwise. Resolve categories from the skill library rather than guessing category names.

Common terms: Active status; offers level 2, needs level 0; empty conditions; Saturday Afternoon availability; no date-range restriction. Python, Guitar, and Photography use Online / Anywhere; Tennis uses Offline / Local meeting point. Offer and corresponding need durations must be identical. Capacity must cover the full requested session count. Matching uses reciprocal cycles, so a compatible one-way edge alone is insufficient.

### A: two separate discovery updates

| Owner | Kind | Skill | Minutes | Sessions | Present at start? |
|---|---|---|---|---|---|
| Alice | need | Tennis | 30 | 2 | Yes |
| Bob | offer | Tennis | 30 | 2 | Yes |
| Bob | need | Python | 60 | 2 | Yes |
| James | offer | Guitar | 60 | 1 | Yes |
| James | need | Python | 60 | 1 | Yes |
| Alice | offer | Python | 60 | 3 | No; publish in scene 2 |
| Alice | need | Guitar | 60 | 1 | No; publish after the first match reveal |

A0 has no routes for Alice. A1 adds Alice's Python offer and produces exactly Alice → Bob → Alice. A2 adds Alice's Guitar need and also produces Alice → James → Alice. Do not propose either route during this chapter; reservation would alter capacity and obscure the second proof.

### B: a missing leg closes a ring

Use exactly these listings, all 60 minutes and one session: Alice offers Python; Charlie needs Python and offers Tennis; Bob needs Tennis and offers Photography. Alice's Photography need is initially absent. B0 has no Alice route. Adding that need produces B1: Alice → Charlie → Bob → Alice, with no direct exchange. Exclude David and unrelated listings from this fixture to avoid alternate routes.

B2 is created by proposing B1 and confirming through each participant's normal controls. B3 adds one fictional message and an accepted future booking for Alice's Python service with Charlie. Set the booking one day after rehearsal start at 15:00 Asia/Hong_Kong; configure the capture browser timezone accordingly. Record the resolved timestamp in the take notes. Do not complete this booking during the film.

### C: prepared settlement checkpoint

Use the existing direct scenario's terms: Alice offers 2 × 60-minute Python sessions and needs 2 × 30-minute Tennis sessions; Bob supplies Tennis and needs Python. Build C1 using proposal, both confirmations, and two Alice completion transitions. Do not fabricate contribution or commitment totals. No future booking is attached to this prepared example.

The screen explicitly announces that C1 is another prepared example after Alice has taught. Bob owes 2 Tennis sessions / 60 minutes. One Bob completion produces C2 with 1 session / 30 minutes remaining. The second produces C3 with zero remaining, full settlement, and no outstanding receive-first commitment. Use the ordinary UI completion handlers for C1 → C2 → C3. Existing imbalance and simulated bond disclosures remain visible when applicable; do not describe time or reference-value differences as objective equivalence of skills.

### Fixture proof

Before UI work, run these states through existing `findMatches`, `transition`, `outstanding`, and ledger helpers. Normalize a route identity as its sorted offer/need leg IDs joined with a delimiter for comparison; keep the application's own ordering for rendering and saved preferences. Assert set differences A0→A1, A1→A2, and B0→B1. A reordered result is not a new match. Also test a deliberately incompatible duration or availability to show that the fixture does not bypass matching.

## Tour controller and integration

Add a dedicated tour controller/view boundary beside the existing workspace modes. Route “Explore a demo” to a fresh tour run; retain ordinary Demo Studio access for manual scenarios. Entry must not overwrite the existing per-account mode preference. Capture the prior workspace mode/page so Exit returns there, including when launched from manual demo.

Minimum proposed client interfaces:

```ts
type TourStatus = 'idle' | 'playing' | 'paused' | 'waiting' | 'error' | 'completed';
type TourStep = {
  id: string;
  sceneId: string;
  target: string;             // stable data-tour target, qualified by entity ID
  caption: string;
  checkpointId: string;
  minReadMs: number;
  run: (signal: AbortSignal) => Promise<void>;
  isReady: () => boolean;     // target visible and current state appropriate
  isComplete: () => boolean;  // domain result AND visible UI result
};
type TourRun = {
  id: string;
  fixtureVersion: number;
  sceneId: string;
  stepId: string;
  status: TourStatus;
  completedStepIds: string[];
};
```

Functions stay in code; persist only serializable progress and fixture state. Use a versioned session-storage namespace such as `skills-ring-tour-v1:<accountId>:<runId>`. Do not reuse `skills-ring-demo-v1-<accountId>` or discovery preference keys. On reload, offer restart or resume paused from a completed checkpoint; never silently resume clicking. Invalid/version-mismatched tour data offers a clean restart without clearing other storage.

Use `data-tour` anchors on navigation, listing kind/fields/submit, route cards, review actions, participant confirmation, booking controls, session completion, feedback, and tour controls. Resolve dynamic targets using stable fixture entity IDs. Target not found, offscreen, disabled, or covered means not ready. Scroll the target into view before highlighting it.

Use semantic UI actions on real controls: input/change through React-compatible handlers, select, submit, and button activation. Reuse normal save/propose/confirm/complete behavior. Do not assign computed matches, confirmed status, or ledger totals just to advance a scene. Fixture initialization and clearly labeled checkpoint loading are the only state replacement operations.

Present a cursor or click pulse at the target and visible form entry. The animation represents the action actually taken; do not show clicks that conceal direct state fabrication. Decorative pointer travel may be removed for reduced motion while actions and captions remain understandable.

### Playback behavior

- Autoplay starts immediately after isolated fixture initialization. Display Pause, Next, Replay, Exit, scene progress, and Try it yourself. End card adds Explore more chapters and Return to my workspace.
- Each step waits for readiness, performs its action once, verifies completion, and holds the result for its reading interval. Ten seconds without readiness/completion enters an error pause with Retry step and Restart chapter. Read holds never substitute for result checks.
- Pause aborts pending timers, typing, scrolling, and queued actions. A synchronous action already committed remains committed; on resume inspect completion before considering another invocation.
- Next completes/advances the current verified step without its remaining reading delay. Disable it while an action is unresolved; it must not skip required mutations or confirmations.
- Retry checks for an already completed action first. If the state is inconsistent, restart the chapter from its checkpoint instead of replaying a mutation blindly.
- Replay restores the current chapter's initial fixture and tour-only discovery preferences. Full Restart starts A0. Cancel old work and change the run generation token before either reset.
- Exit cancels all work, closes tour overlays, and restores the prior workspace; stale callbacks cannot change either state afterward.
- Try it yourself pauses automation and allows ordinary interaction inside the tour sandbox. Resuming guided playback restores the current chapter checkpoint with a clear “Restarting this guided chapter” notice; do not attempt to infer arbitrary manual progress.
- Hide/background the browser tab: pause. Manual navigation during playback: pause before allowing it. Teardown removes listeners, observers, and animation/timer handles.

### Isolation and accessibility

Use an explicitly tour-scoped state adapter that permits local domain actions and denies calls to live synchronization APIs. Keep tour messages, participant selection, notification state, saved/passed routes, and fixture people separate from live and manual-demo state. Guard the existing global discovery-key clearing behavior so tour reset only clears its own keys.

Keep the tour controls reachable above overlays, including when a product dialog is open, without breaking the dialog's focus containment. Keyboard users can operate all playback controls. Escape closes the active product dialog first and pauses the tour; with no dialog open it pauses and focuses Exit. Restore focus to the launch control on exit. Do not capture typing keystrokes as global playback shortcuts.

Use polite announcements for scene changes, readable captions, non-color-only targets, and responsive callouts that never cover the action. Reduced motion removes pointer travel and pulsing; it does not hide the teaching sequence. On narrow screens, use a bottom caption panel and scroll targets into view. Never automatically invoke screen capture or microphone permissions.

## Acceptance matrix for future implementation

| Area | Check and required outcome |
|---|---|
| Entry | Explore a demo starts A0 automatically with fictional label; no overwrite of manual demo or live workspace. |
| Dynamic matches | A0→A1→A2 gives exact new route identities; B0→B1 creates the three-leg ring; no refresh button or hard-coded card injection. |
| Compatibility | Mismatched duration/availability prevents the intended route; fixing the listing enables it. |
| Proposal | One proposal, explicit per-person confirmations, correct reservation; repeated clicks create no duplicate proposal. |
| Coordination | One message and accepted booking; only service participants accept; future session completion stays unavailable. |
| Settlement | C1→C2→C3 yields 2→1→0 remaining Tennis sessions, preserved Alice contributions, partial/full status, restored eligibility. |
| Feedback | Evaluation is attached to an actual completed session; no invented review count or trust score. |
| Playback | Pause during typing, readiness wait, and post-save hold; resume without duplicate writes. Next respects dependencies. |
| Reset | Replay and chapter restart are deterministic; saved/pass state is tour-only; stale asynchronous actions cannot run. |
| Failure | Missing/disabled target and failed completion pause with useful retry; no false success or continued clicks. |
| Hands-on | User can explore locally; guided resume clearly restores a checkpoint. |
| Exit/reload | Exit at every scene preserves live and manual data; reload stays paused; invalid tour version does not clear unrelated storage. |
| Network | Monitor requests through a full run: no tour mutation reaches live endpoints and no external messages are sent. |
| Accessibility | Keyboard-only and reduced-motion pass; dialogs retain usable focus; desktop 1920×1080 and mobile 390×844 have readable, unobscured controls. |
| Timing | A rehearsed clean run fits 180 seconds; errors stop the run instead of being hidden by timing logic. |

For implementation, add focused domain fixture tests and controller lifecycle tests, run `npm test` and `npm run build`, then exercise the actual browser path. Do not run live smoke scripts for this tour: local configuration may point at the production database. Backend test suites become relevant only if later scope changes backend behavior.

For this documentation deliverable, validate the skill with the bundled skill-creator `quick_validate.py`, check relative links and terminology, and run a temporary read-only domain harness to verify fixture math. UI acceptance remains pending until the tour exists.

## Recording pipeline

1. **Prepare:** use a verified tour build, fictional data, a clean browser profile/view, 1920×1080 at 100% zoom, English UI, Asia/Hong_Kong timezone, and muted desktop notifications. Keep tour labels legible. Record build revision, fixture version, browser, and resolved booking time in take notes.
2. **Rehearse:** run the full 180-second story twice from A0. Check each before/after result, names, visible pointer, captions, and checkpoint announcements. Confirm no accidental duplicate actions and no private/live details on screen.
3. **Time narration:** read the storyboard's approximately 350–390 words aloud. Fit each paragraph to its scene. Shorten narration or decorative movement if rushed; never omit result proof or disguise waiting errors.
4. **Capture:** use an available external screen recorder at 1080p, preferably 30 fps. Manually start capture, then launch the tour. Capture narration separately for easier synchronization. Recording is a requested later operation, not an automatic consequence of Explore a demo.
5. **Edit:** trim lead-in/out and align eight scenes to the storyboard. Preserve before/action/after evidence. Keep the prepared-example transition audible and visible; do not splice settlement footage as though the future booking immediately completed. Export exactly 180 seconds, including the closing card.
6. **Caption/export:** create synchronized SRT or VTT captions, use at most two readable lines per cue, and keep them clear of important buttons. Export `skills-ring-demo-3min.mp4` using H.264 video and AAC audio, plus `skills-ring-demo-3min.srt` and take notes containing verification and simulation details.
7. **Review the export:** play the actual MP4 from beginning to end. Check duration, resolution, audio intelligibility, caption synchronization, readable forms, new-match proof, participant-consent labels, settlement arithmetic, and clean ending. Confirm no real payment or guaranteed-repayment claim.
8. **Deliver:** link actual output files and note any omitted optional chapters. If no recorder is available, deliver the script and capture checklist and explicitly state that no video was recorded.

## Defaults and exclusions

English narration; judges and new users; autoplay with controls; desktop master recording and mobile usability check; fictional people only. No deployment, production mutations, real funds, external notifications, or recording permission prompts are part of entering the tour. Full-platform education is the core route plus optional chapters, not a promise to show every control in three minutes.
