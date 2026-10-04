# Demo storyboard and ideas

## Current short walkthrough

The current autoplay replaces the original three-minute script below. Its reading holds total 122 seconds; allow roughly two and a half minutes including verified UI actions. Actual duration depends on rendering and pauses. The persistent journey is **Share → Find people → Agree → Meet → Finish**.

| Scene | What the user sees and gains | Reading budget |
|---|---|---|
| 1 | Follow fictional Alice from sharing a skill to giving back. | 6s |
| 2 | Publish one Python offer for two lessons; a real match with Bob appears. | 14s |
| 3 | Save the match and check Bob’s profile before deciding. | 8s |
| 4 | Separate example: add one Photography need to connect a group of three. Explain who teaches whom. | 16s |
| 5 | Review the deposit amounts, invite the group, confirm lessons and deposits, and open Bond protection to see Held amounts. | 24s |
| 6 | Message, suggest a time and meeting place, and show Charlie accepting. | 16s |
| 7 | Explicit time jump to the prepared direct exchange. Track held deposits, complete Bob’s remaining lessons, and show both deposits returned in full. | 28s |
| 8 | Leave feedback about a completed lesson and invite the viewer to add their own offer and need. | 10s |

Trimmed: the extra Guitar request, switching between two direct matches, and re-entering default teaching levels and one-lesson counts. Keep one offer form and one need form, all three confirmations, and both completion actions: each demonstrates a distinct outcome. Advanced scenarios remain in manual Demo Studio.

Use everyday words in guidance: “match” instead of “eligible route,” “teaching plan” instead of “complete route,” and “lessons left” instead of “remaining obligation.” Keep actual product navigation labels where they help viewers find the feature.

## Original three-minute storyboard (historical reference)

## Story and presentation rules

Audience: judges and first-time users. Main message: share what you can give, state what you need, discover compatible exchanges, and see responsibilities through to completion.

The main autoplay route lasts 180 seconds. Optional chapters provide full-platform coverage outside this time limit. The following controls and highlights describe the proposed tour; current product labels are quoted where verified. Proposed tour-only targets are named explicitly.

Keep “Fictional demo · no live changes” visible. Use Alice as the main viewpoint and visibly identify switches to another fictional participant. Every scene follows: highlight → visible action → verified result → explanation. Missing targets or failed outcomes pause playback; never continue over an error to preserve the recording schedule.

## Timed action script

Fixture names below are defined in [the implementation specification](demo-implementation.md#deterministic-fixtures). Narration is in the next section; scene numbers connect the two.

| Scene / time | Starting state | Targets and exact action sequence | Completion proof / caption | Recovery |
|---|---|---|---|---|
| 1 · 0–15s | Live workspace; no active tour | Click **Explore a demo**. Enter isolated fixture A as Alice. Highlight Home, **My offers & needs**, and **Discover matches** without extra page changes. | Tour shows scene 1, fictional label, and playback controls. Caption: “Give a skill. Learn something new.” | If isolation is unavailable, do not start actions; offer retry or exit. |
| 2 · 15–45s | A0: Alice needs Tennis but offers nothing; zero routes | Open **My offers & needs** → **Add an offer or need**. Choose offer, Python, and fixture terms → **Publish offer**. Open **Discover matches** and highlight the new Bob route. Return to listings, choose need, Guitar, and fixture terms → **Publish need**. Return to discovery and highlight the new James route. | Actual route counts 0 → 1 → 2; route-set differences identify Bob, then James. Caption: “New offer. New need. New possibilities.” | Pause if either delta is absent; retry from the last completed checkpoint, not by publishing duplicate listings. |
| 3 · 45–65s | A2: two eligible direct routes | Select Bob's route → **Save** → **Saved matches**. Open **Community** → Bob → **View profile**. Highlight offers, wants, and recorded evidence. | Saved route is identifiable; Bob's profile shows fixture skills. Caption: “Understand the exchange before proposing.” | Clear tour-scoped filters or restore A2 if the intended route is hidden. Do not invent review evidence. |
| 4 · 65–90s | Announce “Another example: a three-person ring”; load B0 | As Alice, add a Photography need → **Publish need**. Open **Discover matches**. Highlight the three legs: Alice gives Python to Charlie, Charlie gives Tennis to Bob, Bob gives Photography to Alice. | Zero routes before save; one three-leg route afterward. Caption: “A ring connects people who cannot swap directly.” | Restore B0 and repeat only after verifying missing-leg setup. |
| 5 · 90–115s | B1: eligible ring, no proposal | **Review match** → inspect all legs → **Continue to confirmation** → **Send proposal to everyone**. Show any displayed terms/bond acknowledgments. Use each visible **Confirm as [participant]** control for the three fictional people. | Exactly one proposal; all three confirmations; confirmed exchange. Caption: “Everyone reviews and agrees.” | Pause on invalid terms; return to review. Never simulate consent by directly setting confirmed state. |
| 6 · 115–135s | Confirmed ring | **Conversation & schedule** → **Your message**: “Looking forward to our Python session!” → **Send message**. Select Alice's Python service, enter prepared future **Exact time**, and meeting platform “Demo video room” → **Propose session time**. Switch visibly to Charlie → **Accept time**. | One message, one accepted booking, both involved people represented. Caption: “Agree when and where to meet.” | Pause if the service or participant is wrong. Do not complete this future booking. |
| 7 · 135–165s | Announce “Prepared example: after Alice has taught”; load C1 | Show Alice's **My contributions**. Switch to Bob → **My commitments**. Open the direct exchange's **Overview** and record one Bob Tennis session using its visible Record control. Show one session remaining. Record Bob's second session. | Bob's remaining Tennis sessions 2 → 1 → 0; partial then full settlement; receive-first eligibility restored. Caption: “Value given. Responsibility visible. Full circle.” | Restore C1 if a session count differs. Repeated clicks must not be used to guess the correct state. |
| 8 · 165–180s | C3: direct exchange settled | Switch to Alice. Open **Sessions & trust**, complete behavior-based feedback for a Bob session, and submit using the existing feedback form. Briefly show history. Open proposed tour end card: **Try it yourself**, **Explore more chapters**, **Return to my workspace**. | Feedback exists; no invented reputation score; end card offers a clear next action. Caption: “Start with what you can give.” | If feedback is already recorded, show it rather than duplicating it; keep exit available. |

Use the currently rendered labels for dynamically worded Record and feedback submit controls; bind them through stable targets and the relevant leg/session identity. Do not select the first generic button when several services appear.

## Narration script

The eight paragraphs are the spoken script, 352 words. Record a timed read; the scene budget includes pauses while viewers inspect results. Captions may split sentences into shorter cues without changing meaning.

### 1

Welcome to Skills-Ring. Share a skill you can offer, tell the community what you want to learn, and discover ways to help each other. This fictional workspace lets you explore without changing your real activity.

### 2

Alice wants tennis coaching, but an exchange also needs something she can give. Let's add Python tutoring. After saving, a compatible exchange with Bob appears. Now Alice adds a second need: guitar lessons. Another match appears with James. These results come from the updated listings, so new offers and needs can create new possibilities automatically.

### 3

Each match explains what you teach and what you learn. Save an option for later, then inspect the person's profile and available evidence. Matching checks practical details, including session length, capacity, and availability. A suggestion is a starting point; review the terms before making a proposal.

### 4

What if two people cannot swap directly? Here is a separate three-person example. Alice offers Python, Charlie offers tennis, and Bob offers photography. Adding Alice's photography need closes the ring. Alice teaches Charlie, Charlie teaches Bob, and Bob teaches Alice. Everyone contributes something another person needs.

### 5

Open the match and review every person's responsibilities. Send the proposal, then watch each fictional participant confirm. These are simulated approvals for the demonstration. In an exchange, agreement matters: participants must understand the services and any warnings or protection terms before the exchange moves forward.

### 6

Next, coordinate inside the exchange. Send a message, propose an exact session time, and let the other person accept. The booking makes the plan visible to both people. Notifications remain inside the platform; this demonstration does not send external messages.

### 7

Now jump to a prepared direct-exchange example after Alice has taught. Her contribution is recorded, and Bob still owes two tennis sessions. Completing one leaves a precise remaining commitment. Completing the second settles the exchange and restores Bob's ability to receive first again. The record shows both what was given and what remains owed.

### 8

Finish with feedback about the session's observable behavior. Explore more scenarios, try the demo yourself, or return to your workspace. Start with what you can give, and see what becomes possible.

## Optional chapters and prioritized ideas

P0 = essential main-film proof; P1 = extended guided learning; P2 = advanced or failure exploration. All optional chapters need their own resettable fixture and an exit back to the chapter menu.

| Priority / idea | Teaching purpose | Setup and actions | Expected visible result | Placement |
|---|---|---|---|---|
| P0 · Offer and need deltas | Explain automatic discovery updates | Fixture A; add both missing listings separately | Bob route then James route | Main film |
| P0 · Ring closure | Explain the platform's distinctive value | Fixture B; add closing need | Three explicit responsibilities | Main film |
| P0 · Settlement | Explain reciprocity over time | Fixture C; deliver in parts | Exact remaining obligation and restored eligibility | Main film |
| P1 · Listing lifecycle | Teach management | Unreserved listing; edit, pause, reactivate; separately complete an exchange to fulfil capacity | Routes disappear/reappear when eligible; fulfilled capacity is unavailable | Extended |
| P1 · Fix an empty state | Explain compatibility without blaming the user | One mismatched availability slot, then one offline venue mismatch; fix each | Eligible route only after relevant constraints align | Extended |
| P1 · Discovery toolkit | Teach efficient browsing | Several eligible routes; pass, undo, save, filter, sort | View changes with underlying routes intact | Save only in main film |
| P1 · Revised agreement | Explain consent after changes | Proposed/confirmed scenario appropriate to existing revision controls | Revised terms and required renewed confirmations; prior history remains | Extended |
| P1 · Calendar and updates | Teach coordination | Accepted future booking; export calendar, cancel, propose new time | Exported event; cancelled old booking; new acceptance required; in-app update | Extended |
| P1 · Four-person ring | Show broader network reach | Four unique providers with only a four-leg cycle | All four give/receive legs appear | Extended |
| P1 · Withdrawal with replacement | Show recovery after delivery | Existing ring scenario with David available; Charlie withdraws | Original contribution retained; revised route requires affected consent | Extended |
| P2 · No replacement | Explain the limit of recovery | Same withdrawal, no eligible replacement | Preserved claim and unresolved/defaulted responsibility, not guaranteed repayment | Extended |
| P2 · Disputed completion | Explain uncertainty and resolution | Recorded session and fictional disagreement | Hold, preserved claim, simulated resolution, resulting remainder | Extended |
| P2 · New custom skill | Explain catalog review | “Other” skill suggestion | Pending review does not match; simulated approval changes eligibility only when counterpart terms align | Extended |
| P2 · Completion bonds | Explain optional risk controls | Proposal with calculated reference values | Clearly simulated 20% bond, acceptance, and ledger outcome; no real custody | Extended |
| P2 · Capacity and fairness | Explain why apparent matches may be blocked | Reserved listing or active receive-first commitment | Specific capacity/eligibility reason; resolve through legitimate fulfilment | Extended |
| P2 · Keyboard walkthrough | Demonstrate accessible operation | Hands-on chapter | Navigate, review, pause, and exit without a pointer | Separate accessibility clip |

## Coverage map

Home: scene 1. Offers and needs: scene 2. Discovery: scenes 2–5. Community: scene 3. Exchanges: scenes 5–8. Contributions and commitments: scene 7. Feedback/history: scene 8. Notifications, calendar, advanced revisions, recovery, moderation simulation, and bonds: optional chapters. Account registration and production moderator operations are outside the main tour, which starts from an existing workspace.
