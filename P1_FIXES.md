# P1 fixes — 2026-10-03

The six requested P1 issues are implemented in the localhost production build at <http://127.0.0.1:3001/>.

| Finding | Implemented behavior | Verification |
| --- | --- | --- |
| Calendar export | Export prepares an HTTP `.ics` attachment with a five-minute encrypted download ticket. Stable IDs, UTC times, RFC escaping and UTF-8 folding. | Actual browser download inspected at `/Users/jerrylhm/Downloads/skills-ring-session (1).ics`; formatting, authentication, tampering, expiry, and cross-instance tests pass. |
| Community controls | Search by name, skill, category or location; twelve-member pages; member skill profiles; compatible match review and add-listing actions. | Browser checked search, profile details, page 1 → 2 of 27, and twelve cards per page. |
| Mode persistence | Restores demo/live choice per account; safe fallback when storage is unavailable. | Unit tests and browser reload confirm demo mode persists. |
| Demo isolation | Demo community reads only the fixed fictional directory, independently of live registrations. | Live community loaded, then demo selected: exactly Alice, Bob, Charlie, David, James and Maya appeared. Regression test covers a registered live member. |
| Proposal status | Distinct declined, cancelled and expired states; capacity released; fresh proposals allowed; historical records interpreted from their stored reason. Actual withdrawals retain recovery behavior. | Transition tests cover outcomes, released capacity, renewed proposal creation, and expiry. |
| Moderator workspace | Open/resolved queues, session evidence, agreed terms, conversation, activity, full/half/default decisions, mandatory reasons, reviewer/time, notification and persistence. | HTTP integration tests cover access denial, self-review denial, invalid/repeated decisions, atomic saves and reload, participant notifications, and revision-checked starter cases. Live moderator identity and queue access verified. |

## New moderator

- Name: Skills-Ring Moderator
- User ID: `usr_5bf59d8e-3eca-4157-94d2-a2ab34b458ef`
- Private sign-in file: `.local/moderator-profile.json` (owner-readable, excluded from Git).
- Local allowlist: `.env.moderators.local` (excluded from Git).

Open the account menu (or registration page), expand **Open a saved profile**, and choose the private file. This switches the profile in that browser. The moderator's live workspace then displays **Moderation**. Keep the file private: it grants access to the account. No token is included in this report or committed source.

Hosted deployment is separate: configure `MODERATOR_USER_IDS` with the ID above on the host. Local access is enabled and verified. Removing the ID and restarting the server revokes moderation permission.

## Checks and remaining scope

- Production build passes.
- 36 frontend/domain tests, 12 production integration tests, and 4 auth tests pass (52 total).
- Browser console has no errors or warnings during the verified flows.
- The production bundle still triggers the existing 500 kB warning.
- No real user's dispute was resolved during testing. Decision persistence was tested with isolated fixtures; the live queue currently has no cases.
- The broader P0 authentication, privacy/legal, mobile-notification, routing, and operational-readiness findings are outside these six fixes and still prevent a production-ready claim.

The React review kept the new community, calendar, profile-import, and moderator views in separate components with labelled controls. The Supabase review kept role authorization on the server, used existing private storage and atomic mutation facilities, and avoided adding public table grants or client-side secrets.
