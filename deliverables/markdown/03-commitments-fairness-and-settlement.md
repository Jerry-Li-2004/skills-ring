# Skills Ring Commitments Fairness and Settlement

## 12. Core feature three: Exchange Commitment

Exchange Commitment is one of the product's most important mechanisms because real-world exchanges are rarely simultaneous.

Suppose Alice teaches Bob Python today, but Bob cannot teach Alice tennis until next week. Without a formal record, Alice bears the risk of providing value first and receiving value later.

Skills-Ring therefore creates an **Exchange Commitment**:

```text
Bob owes Alice
Tennis coaching
1 x 1 hour
Status: Pending
```

This is not "Bob owes one token" or "Bob owes GBP 30." It is a concrete service obligation: Bob must provide Alice with one one-hour tennis coaching session in the future.

## 13. Contribution and Commitment

Skills-Ring does not convert every activity into generic points. It distinguishes two different states.

### 13.1 Contribution

A **Contribution** records value a user has already provided without yet receiving the corresponding value.

For example, Alice may already have:

- Taught Bob one hour of Python.
- Taught Charlie one hour of Python.
- Reviewed David's resume once.

Alice therefore has **Unsettled Contributions**: value already provided to the network for which the related exchange has not yet been settled.

### 13.2 Commitment

A **Commitment** records value a user has already received but still needs to deliver in the future.

For example, Bob may have received one hour of Python tutoring but not yet provided the promised one hour of tennis coaching. Bob therefore has an **Active Commitment**.

The system can clearly distinguish:

```text
I have given value.
```

from:

```text
I still need to give value.
```

This distinction separates Skills-Ring from a simple points-based skill exchange.

## 14. Core fairness rule

The project prompt asks for one rule that keeps the arrangement fair. Skills-Ring's rule is:

> Mutual Confirmation overrides minor valuation differences.

An exchange may proceed when all affected participants explicitly confirm it, even if the system detects some difference between their contributions.

### Why this rule is needed

Value does not have one objectively correct price. For example:

| Participant | Contribution |
|---|---|
| Alice | 2 hours of Python tutoring |
| Bob | 1 hour of tennis coaching |

The system may identify a **Potential Imbalance**, but it should not automatically declare the exchange unfair and prohibit it. Several legitimate reasons may explain the difference:

- Alice enjoys teaching Python.
- Bob is a professional tennis coach.
- Alice has an urgent need for the tennis lesson.
- Both parties explicitly accept the arrangement.

The system may **warn**, but it must not decide value on the participants' behalf and automatically **reject** the exchange.

## 15. A Match is not a Trade

The system can display:

```text
Potential imbalance detected.
```

The exchange becomes confirmed only after both users decide:

```text
Alice -> Confirm
Bob -> Confirm

Exchange -> Confirmed
```

The design principle is simple: the system identifies risk, while users decide value.

## 16. Core feature four: Dynamic Exchange

Confirmation does not permanently freeze every detail of an exchange. A sequence might develop as follows:

| Session | Service |
|---|---|
| Session 1 | Python — 1 hour |
| Session 2 | Tennis — 1.5 hours |
| Session 3 | Python — 2 hours |

For later sessions, users can change:

- Duration.
- The next session time.
- The number of sessions.
- Whether the exchange is paused.
- Whether a future session is cancelled.

An Exchange is therefore a **Dynamic Agreement**, not a one-time fixed contract.

## 17. Partial Settlement

Suppose the parties originally agree to:

```text
5 Python sessions <-> 5 Tennis sessions
```

The recorded completion state is:

```text
Python: 5/5
Tennis: 3/5
```

The system should show:

```text
Exchange Partially Settled
Bob — Remaining Commitment: 2 x 1-hour Tennis sessions
```

The whole exchange should not be reduced to a generic **Failed** state. Partial Settlement preserves what was successfully completed and identifies exactly what remains outstanding.

## 18. Core feature five: Commitment-aware Recommendation

Commitment-aware Recommendation creates a second important product loop.

Suppose Bob has this active obligation:

```text
Active Commitment
-> Alice
-> 1 hour of Tennis
```

The system should not merely recommend every skill Bob might like. It should prioritize:

### Fulfill Your Existing Commitment

If Alice currently needs tennis coaching, the system can say:

> This opportunity can directly fulfill your existing commitment.

The ranking logic must not reward the size of a user's outstanding obligations. "More debt means higher priority" would encourage users to accumulate unfulfilled commitments. The correct rule is:

```text
Opportunity that fulfills an existing Commitment -> Higher priority
```

The system rewards **Fulfillment**, not **Debt accumulation**.

## 19. Recommendation levels

Recommendations can be organized into four levels.

### Level 1 — Commitment Fulfillment

An opportunity that can directly complete an existing commitment.

### Level 2 — Network Recovery

An opportunity that can repair a disrupted multi-party exchange route.

### Level 3 — Reciprocal Exchange

A new direct, two-way exchange.

### Level 4 — New Opportunity

An ordinary new match without an existing commitment or network-recovery purpose.

Together these levels form the loop:

```text
Contribution
    |
Commitment
    |
Fulfillment
    |
Settlement
    |
Reliability
    |
Better Future Matching
```
