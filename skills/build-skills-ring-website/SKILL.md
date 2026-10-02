---
name: build-skills-ring-website
description: Design, implement, test, and deploy the Skills-Ring website, a non-monetary service-exchange product with reciprocal and multi-party matching, commitment tracking, fairness controls, partial settlement, disputes, and withdrawal recovery. Use for building or materially changing the Skills-Ring product, prototype, or competition demo.
---

# Build the Skills-Ring Website

Build Skills-Ring as a coordination, informal-credit, and settlement product for skills and time that conventional markets handle poorly. Preserve the economic mechanism throughout product design, implementation, testing, and deployment.

## Canonical Product Documentation

Use the detailed product documentation in [`deliverables/markdown/`](../../deliverables/markdown/) as the source of truth for product rationale, examples, field definitions, and MVP behavior. Start with the [documentation index](../../deliverables/markdown/00-index.md), then read only the references relevant to the active task:

- [Overview and product concept](../../deliverables/markdown/01-overview-and-product-concept.md) for positioning, terminology, and user-facing explanations.
- [Data model and matching](../../deliverables/markdown/02-data-model-and-matching.md) for Offer, Need, reciprocal matching, and cycle routing.
- [Commitments, fairness, and settlement](../../deliverables/markdown/03-commitments-fairness-and-settlement.md) for confirmation, dynamic exchange, partial settlement, and recommendation priorities.
- [Resilience, reliability, and product flow](../../deliverables/markdown/04-resilience-reliability-and-product-flow.md) for withdrawal, disputes, reliability, asymmetry, optional collateral, and the end-to-end flow.
- [Core product data dictionary](../../deliverables/markdown/05-core-product-data-dictionary.md) when changing schemas, enums, forms, seed data, or persistence.
- [Trust graph and recommendation data dictionary](../../deliverables/markdown/06-trust-graph-and-recommendations.md) when changing evaluations, reliability, disputes, withdrawals, fairness, graph routing, or recommendation output.

Do not load every reference for a narrow task. If a user explicitly changes a product rule, update the affected implementation and documentation together rather than silently retaining a conflicting rule here.

## Product Position

Describe Skills-Ring as:

> A non-monetary clearing and settlement system for service obligations.

The product slogan is:

> We don't put a price on what people have. We make it exchangeable.

The product lets members state what they can give and what they need, discover direct or multi-party exchanges, record value delivered before reciprocation, and settle concrete service obligations over time.

Skills-Ring is not:

- A generic freelancer marketplace.
- A social directory with superficial matching.
- A points, token, cryptocurrency, or blockchain product.
- A system that claims unlike skills have one objective monetary value.

Use concrete obligations such as “Bob owes Alice one one-hour tennis session.” Do not replace them with generic balances such as “Bob owes one credit.”

## Initial Product Scope

Design the product as a public community open to individuals who want to share and exchange their skills as personal assets. Membership does not require any institutional, educational, professional, or geographic affiliation. Use community-neutral language and fictional individual profiles for demo data. Let people specify their own location for each Offer or Need, while continuing to enforce feasibility, explicit agreement, and the service-obligation rules.

The primary participants are the same people at different moments:

- A contributor gives a service before receiving the corresponding value.
- A receiver benefits now and accepts a concrete obligation to contribute later.
- A participant may be a contributor in one exchange and a receiver in another.

The website must make these roles and obligations legible without implying that a person’s skill has been objectively priced.

## Non-Negotiable Product Rules

Preserve the following invariants in the interface, data model, business logic, tests, and demo.

1. Model an Offer and a Need separately. Mode, location, availability, duration, level, and conditions belong to the specific Offer or Need, not only to the user.
2. Keep session duration separate from capacity. “One hour per session, up to five sessions” must not become one five-hour service.
3. A match is a proposal, not an exchange. Create an active exchange only after every affected participant explicitly confirms the terms.
4. Keep Contribution and Commitment distinct:
   - A Contribution is value already delivered but not yet settled.
   - A Commitment is value already received that the participant must deliver later.
5. Completed contributions are immutable historical facts. Cancellation, withdrawal, rematching, or dispute must not erase work that already occurred.
6. Support partial settlement. Preserve completed work and display the exact remaining obligation rather than reducing a partially completed exchange to “failed.”
7. Never transfer a participant’s obligation to a replacement without renewed confirmation from the replacement and every affected beneficiary.
8. Do not reward debt accumulation. Rank an opportunity more highly when it can fulfil an existing commitment; never rank someone more highly merely because they have more outstanding commitments.
9. Warnings may compare observable quantities such as hours, sessions, travel, or timing. Do not label one skill economically more valuable than another.
10. Support at least these exchange outcomes: proposed, confirmed, active, partially settled, settled, disputed, withdrawn, and defaulted.
11. Use a standardized Skill Library as the primary matching vocabulary. Allow an “Other” option, but do not rely on arbitrary free text for the core match key.
12. Explain recommendations with compatibility reasons, obligation effects, and risk indicators. Do not present an unexplained aggregate score as the decision.
13. Treat post-confirmation changes as auditable agreement amendments. Never silently rewrite completed sessions, Contributions, or previously confirmed terms.

## Primary Fairness Rule

Use this as the main fairness rule for the MVP:

> A participant may have at most one unfulfilled receive-first commitment. They must fulfil it before receiving value first again.

Enforce this rule in business logic, not only in explanatory text. When blocked, show:

- The existing obligation.
- What remains to be delivered.
- Why another receive-first exchange is unavailable.
- The action that will restore eligibility.

The rule protects contributors and the network from serial accumulation of unpaid obligations. It costs honest newcomers and participants who need several services before they can reciprocate. State that trade-off plainly in the product explanation and demo.

Reliable members may later earn a larger commitment limit, but do not implement an unexplained or opaque limit increase. The MVP may keep the limit at one for everyone.

## Valuation and Imbalance Rule

Treat explicit mutual confirmation as a valuation-consent rule, not as proof that an exchange is substantively fair.

When proposed contributions differ materially in observable quantity:

1. Display a neutral “Potential imbalance” warning.
2. Show the actual difference, such as two hours versus one hour.
3. Explain that the comparison is about quantity, not the market value of either skill.
4. Require explicit confirmation from every affected participant.
5. Preserve the confirmed terms in the exchange record.

If a threshold is needed for the demo, default to warning when total scheduled time differs by more than 25 percent or when session counts differ. Keep the threshold configurable and label it as a heuristic.

Mutual confirmation protects participant autonomy and subjective valuation. It may cost less-informed or lower-bargaining-power participants, so the interface must make terms comparable and must not use manipulative confirmation patterns.

## Core Product Flow

Implement one coherent stateful loop:

```text
Define Offer and Need
        -> Match
        -> Direct exchange or multi-party route
        -> Review terms and imbalance
        -> Confirm
        -> Create commitments
        -> Record service session
        -> Settle fully or partially
        -> Evaluate reliability
        -> Recommend fulfilment or a new exchange
```

Do not create disconnected mock screens that bypass this loop. Actions in one stage must update the same underlying exchange, contribution, commitment, session, and settlement records used by later stages.

## Matching and Routing

Treat hard feasibility constraints separately from ranking signals. Skill, mode, location, availability, level, duration, capacity, conditions, and participant eligibility determine whether a leg is feasible. Reciprocity, commitment fulfilment, network recovery, reliability, and risk help rank feasible options.

For a competition MVP, coarse availability slots such as weekday morning, weekday afternoon, weekday evening, and Saturday or Sunday morning, afternoon, and evening are sufficient unless the user requests calendar-level scheduling.

### Reciprocal matching

A reciprocal match exists when A’s Need is satisfied by B’s Offer and B’s Need is satisfied by A’s Offer. Include compatibility for skill, duration, availability, mode, location, capacity, and relevant conditions.

### Multi-party routing

When no reciprocal match exists, search for a short exchange cycle, normally three or four participants for the MVP.

For example:

```text
Alice gives Python to Charlie
Charlie gives Tennis to Bob
Bob gives Photography to Alice
```

Show both the network route and each person’s plain-language responsibility. A graph alone is insufficient.

Prefer shorter, feasible cycles. Do not present a route as valid unless every leg satisfies its Offer and Need constraints and every participant can review the complete route before confirming.

In the network graph, a directed edge `A -> B` means that A has an Offer capable of satisfying B's Need. Always pair a graph visualization with a written list of providers, receivers, services, sessions, and remaining obligations.

### Recommendation priority

Rank feasible recommendations in this order unless the user specifies another transparent policy:

1. Commitment fulfilment: directly completes an existing Commitment.
2. Network recovery: repairs a disrupted multi-party route.
3. Reciprocal exchange: creates a new direct two-way exchange.
4. New opportunity: creates an ordinary compatible match.

The output must identify the recommended participant or route, what each participant gives and receives, why it is recommended, any existing Commitment it affects, and any risk or imbalance warning.

## Commitment and Settlement Ledger

Use these domain objects or equivalent normalized structures:

- User
- Skill
- Offer
- Need
- Match
- Exchange
- Commitment
- Contribution
- Session
- Settlement
- Evaluation
- Reliability
- Dispute
- Withdrawal

For field-level work, use the two data-dictionary references rather than inventing a parallel schema. Keep derived values such as `remaining_sessions`, active-commitment counts, completion rates, and reliability indicators consistent with their underlying records; do not treat them as independently editable facts.

At minimum, a Commitment records:

- Debtor.
- Beneficiary.
- Skill or service.
- Duration per session.
- Total sessions.
- Completed sessions.
- Remaining sessions.
- Optional deadline.
- Status.

Use the invariant:

```text
remaining_sessions = total_sessions - completed_sessions
```

Never allow the remaining amount to become negative. Record adjustments as auditable agreement changes rather than silently rewriting completed history.

A Session records the actual provider, receiver, service, scheduled time, status, and actual duration. Completing a session creates or settles the appropriate Contribution and Commitment records atomically.

## Dynamic Agreements

An Exchange may evolve after confirmation, but only future performance can be changed. Participants may propose changes to a future session's duration or time, the number of remaining sessions, a pause, or a cancellation.

- Show the current confirmed terms beside the proposed changes.
- Require every affected participant to confirm a material change before it takes effect.
- Preserve an audit trail of who proposed and confirmed the amendment.
- Recalculate imbalance, feasibility, Commitment remainder, and settlement projections.
- Never use an amendment to erase or reduce already completed service without an explicit dispute resolution or recorded adjustment.

## Withdrawal and Rematching

Withdrawal handling must depend on whether any value has already been delivered.

### Before performance begins

- Mark the route broken.
- Remove the withdrawing participant from the proposed route.
- Search for a compatible replacement or alternative route.
- Require all affected participants to confirm the revised route.

### After at least one service has been delivered

- Preserve completed Contributions.
- Freeze affected unsettled legs while recalculating the route.
- Keep the original responsible participant attached to any obligation they incurred.
- Search for a replacement, but do not make the replacement inherit debt automatically.
- Require renewed confirmation for any replacement service or reassigned benefit.
- If no route exists by the applicable deadline, show the uncovered Contribution and mark the responsible obligation defaulted or unresolved according to the chosen resolution.

Do not claim that rematching can reverse an irreversible service.

## Disputes

Allow either party to dispute whether a session was completed as agreed. A dispute must:

- Preserve the claimed session and its evidence or notes.
- Put the affected settlement on hold.
- Identify who raised the dispute and why.
- Support full release, partial release, or default/forfeit as MVP resolutions.
- Record the resolution and its effect on remaining commitments.

Do not present the MVP as objective arbitration. It records disagreement and applies the selected resolution; it cannot independently verify subjective service quality.

## Reliability and Risk Controls

Collect simple, behaviour-based evaluation data after a session:

- Was the participant on time?
- Was the agreed service completed?
- Was the participant engaged?
- Would the other participant exchange with them again?

Use reliability to explain risk, rank otherwise compatible options, or gate future commitment capacity. Do not present it as a bank credit score, personal worth score, or unexplained black-box rating.

Base reliability on observable exchange history such as completion, punctuality, Commitment fulfilment, response, dispute-free completion, cancellation, and no-show rates. If the demo uses a composite score, keep the weights configurable and show the contributing indicators. The formula in the trust-and-recommendation data dictionary is illustrative, not an objective measure of personal worth.

Use a binary, behavior-focused session evaluation for the MVP rather than a generic five-star review: on time, completed as agreed, engaged, and willing to exchange again, with an optional comment.

If collateral is included, label it as an optional simulated risk-control demonstration. Do not use “Demo Credits” as the core medium of exchange. Prefer to omit collateral from the primary MVP unless the user explicitly wants to demonstrate deposits, escrow, or guarantees.

## Required Demonstration Cases

The deployed demo must run the same matching and ledger logic across at least two cases. Seed deterministic data so the cases can be repeated during judging.

### Case one: imbalance and partial settlement

1. Alice offers two hours of Python tutoring.
2. Bob offers one hour of tennis coaching.
3. The system displays a potential imbalance warning.
4. Both participants explicitly confirm.
5. Alice completes her service first.
6. The system records Alice’s unsettled Contribution and Bob’s active tennis Commitment.
7. Bob is blocked from another receive-first exchange.
8. Bob completes only part of the obligation.
9. The settlement becomes partially settled and displays the exact remainder.
10. Completing the remainder settles the exchange and restores Bob’s receive-first eligibility.

### Case two: multi-party withdrawal after performance

1. Alice, Bob, and Charlie confirm a three-person cycle.
2. At least one service is completed.
3. Charlie withdraws before fulfilling Charlie’s obligation.
4. The system preserves completed Contributions and freezes affected settlement legs.
5. It finds David as a compatible replacement and displays the revised responsibilities.
6. Every affected participant reconfirms the new route.
7. Also demonstrate the no-replacement branch: preserve the uncovered Contribution and show the unresolved or defaulted obligation.

### Optional case three: disputed completion

One participant marks a session complete and the other disputes performance. Put settlement on hold, apply a partial-release resolution, and show the resulting remaining obligation.

## Website Information Architecture

Ensure users can reach these product areas without understanding financial jargon:

- Onboarding and community context.
- “What I can give” Offers.
- “What I need” Needs.
- Match and exchange-route review.
- Confirmation and imbalance warning.
- Active exchanges and upcoming sessions.
- “Value I have given” Contributions.
- “What I still owe” Commitments.
- Settlement progress and history.
- Disputes, withdrawals, and rematching.
- Reliability history and its explanation.

Use plain-language labels as primary copy. Terms such as Commitment, Contribution, and Settlement may appear as secondary labels or explanations so the financial mechanism remains visible.

## Interaction and Visual Direction

Make the product feel trustworthy, calm, and operational. Avoid crypto aesthetics, speculative-finance imagery, casino-like balances, and decorative dashboards that obscure responsibilities.

Prioritize:

- A clear give/need pair for each participant.
- Plain-language match reasons.
- Side-by-side exchange terms before confirmation.
- A visible timeline for service and settlement state.
- A compact network view for multi-party cycles, paired with written responsibilities.
- Prominent outstanding obligations and next actions.
- Accessible warnings that do not rely on colour alone.
- Responsive behaviour for desktop and mobile.

Do not imply an exchange is safe merely because it has been confirmed. Distinguish agreement, performance, and settlement visually.

## Failure Boundary

State this limitation in product or demo documentation:

> Skills-Ring breaks when value has already been delivered, the responsible participant defaults, and no acceptable replacement or alternative route exists. The system can preserve the claim, restrict the defaulter, and record the loss, but it cannot recreate an irreversible service or guarantee repayment.

Also account for:

- A network too small to form a feasible match or cycle.
- Subjective service quality that cannot be independently verified.
- Collusion or dishonest mutual confirmations.
- Unequal information or pressure during confirmation.
- A technically compatible replacement whom the beneficiary does not accept.

Do not hide these limits behind optimistic empty states.

## Implementation Guidance

Inspect the repository before selecting architecture. Preserve an existing viable stack and conventions. When starting from documentation only, choose the smallest maintainable stack that supports stateful flows, persistent records, deterministic seed data, and deployment to the user’s available platform.

Keep matching, exchange state transitions, fairness enforcement, and settlement calculations in testable domain logic rather than scattering them across UI components.

For a fresh competition MVP, prefer the bounded enums and approximately 30–50 standardized skills in the data dictionary. Treat those values as seed/configuration data rather than duplicating them throughout forms and matching code.

At minimum, test:

- Direct reciprocal matching.
- Three-person cycle discovery.
- Rejection of incompatible mode, schedule, or location constraints.
- Creation of Contributions and Commitments after receive-first performance.
- Enforcement of the one-active-receive-first rule.
- Partial settlement arithmetic.
- Withdrawal before and after performance.
- Rematching with renewed confirmation.
- No-replacement default handling.
- Disputed settlement hold and resolution.
- Recommendation priority and explanation.
- Dynamic amendments with renewed confirmation and preserved history.
- Reliability aggregation from underlying evaluations and exchange outcomes.

Use transactional updates, or their local equivalent, when one action changes several ledger objects. A failed session-completion action must not leave only part of the ledger updated.

## Deployment Rules

Deploy only when the user has requested deployment or the active task clearly includes it. Reuse the repository’s configured platform and infrastructure when present. Do not create paid resources, domains, external accounts, or production data stores without authorization.

Before calling the deployment complete:

1. Run the relevant type checks, tests, and production build.
2. Exercise both required demo cases through the user interface.
3. Verify that state remains consistent after reload or document that the deployment is intentionally ephemeral.
4. Confirm mobile and desktop usability for the critical flow.
5. Seed demo data without real personal information.
6. Keep credentials out of the repository and browser bundle.
7. Verify the deployed URL and its main user journey.

If authentication, persistence, dispute administration, or real collateral is simulated, label it clearly. Do not imply production-grade financial custody or enforcement.

## Completion Criteria

The Skills-Ring website is ready to present only when:

- Users can define distinct Offers and Needs.
- The system produces a direct match and a multi-party cycle from actual data.
- Every participant can review and confirm responsibilities.
- The primary fairness rule is enforced visibly.
- Completing a service updates Contributions, Commitments, and Settlement consistently.
- Partial settlement shows the exact remaining obligation.
- Withdrawal preserves prior work and triggers a real rematching or failure state.
- At least two cases run through the same state and ledger model.
- Recommendations explain compatibility, Commitment effects, and risk rather than exposing only a score.
- Future-session amendments require confirmation and preserve prior terms and completed history.
- The fairness trade-off and failure boundary are stated plainly.
- The deployed critical path has been verified rather than represented only by static mockups.

When reporting completion, distinguish implemented behaviour, simulated behaviour, and future extensions.
