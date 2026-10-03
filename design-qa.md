# Design QA — Discover matches

**Source visual truth:** /Users/jerrylhm/.codex/generated_images/01a0ff8f-6c52-7ac2-98a6-17a6f59ccd00/exec-067831b2-45cd-44d2-83b5-0e0dad315376.png (selected design 2), amended by the user request to remove the “Why this matches” banner shown in /var/folders/0n/hbphj99s0zv7qfbf3r7pxp3r0000gn/T/TemporaryItems/NSIRD_screencaptureui_KphrMJ/Screenshot 2026-10-03 at 11.34.49 AM.png.

**Implementation screenshot:** Codex in-app browser tab 6, captured inline from http://127.0.0.1:4180/. The screenshot API did not expose a filesystem path.

**Viewport and state:** Desktop capture at 1487 × 1058 CSS px and device pixel ratio 1, plus full-page phone capture at 390 × 844 CSS px. Alice is viewing the first match with filters closed. The implementation uses actual demo listing terms.

## Full-view comparison evidence

The two portraits, three numbered teach/learn/meet steps, arrows, and Review/Save/Pass controls follow the selected design. The user-requested banner is absent and the actions now sit immediately below the match card. The established app shell retains its existing dimensions.

## Focused-region comparison evidence

The user screenshot identifies the exact banner. The post-change desktop and phone captures show the match card followed directly by Review/Save/Pass, with no banner or reserved whitespace. Portraits, step labels, and actions remain readable in the desktop capture.

## Findings

No actionable P0, P1, or P2 differences remain.

- **Typography:** Existing system font; increased heading, step, body, and action sizes to match the visual hierarchy.
- **Spacing and layout:** Three-column desktop card and centered actions follow the mockup with the requested banner removed. No empty gap remains between the card and actions. The existing sidebar and top bar retain their dimensions.
- **Colors and tokens:** Off-white, navy, lavender, and periwinkle match the reference and app theme.
- **Images:** Generated photographic portraits have sharp circular crops. The main card does not substitute CSS illustrations or placeholder initials.
- **Copy and content:** Teach/learn/meet and consent guidance remain. The removed explanation copy no longer appears on Discover; full reasoning remains available in Review match. Match terms and trust text reflect actual demo records.
- **Responsive behavior:** At 390 × 844 CSS px, profiles remain side by side, steps stack, actions remain reachable, and document scroll width is 390 px.
- **Interaction and browser errors:** Filters, save/remove, pass/undo, review confirmation, dialog scrolling, ArrowRight save, ArrowLeft pass, Enter review, and Escape close were exercised. The browser accessibility tree exposes named profile regions, match position, and labeled actions. Fresh production preview logged no warnings or errors. Build and 28 domain tests pass.

## Comparison history

1. Initial desktop comparison found P2 text density. Portrait size, card height, typography, and action targets were increased. The revised 1487 × 1058 capture shows the corrected hierarchy.
2. Mobile review found a P1 overlay position bug after page scrolling. Rendering Review through a body portal fixed it. The revised phone capture shows the header and close control in view.
3. Filtering from card two exposed an inconsistent position label and Previous control. Clamping the visible index fixed both; browser state confirms Match 1 of 1 with both navigation controls disabled.
4. Final production capture after adding explicit loading and stale-match states was compared with the source in one input. No P0/P1/P2 issue remained.
5. The user then requested removal of the “Why this matches” banner. Removed its markup and styles. New desktop and phone browser captures show no banner and no horizontal overflow; actions remain directly under the match card.

## Open questions

None for this local design build. Production identity and shared data remain separate P0 backlog work.

## Implementation checklist

- [x] Build the selected dynamic matching interface.
- [x] Preserve filters, saved matches, pass/undo, keyboard/swipe actions, and proposal review.
- [x] Verify desktop, phone, production console, tests, and build.

final result: passed
