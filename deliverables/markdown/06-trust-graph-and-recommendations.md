# Skills Ring Trust Graph and Recommendation Data Dictionary

## 13. Evaluation

After every completed Session, users evaluate the exchange. This should not be designed as a conventional five-star rating because the product needs to measure whether the exchange was reliable, not how many stars a person is "worth."

| Field | Options or Description |
|---|---|
| `evaluation_id` | ID |
| `session_id` | Corresponding Session |
| `on_time` | Yes / No |
| `completed_as_agreed` | Yes / No |
| `engaged` | Yes / No |
| `would_exchange_again` | Yes / No |
| `comment` | Optional |

## 14. Reliability

Reliability is calculated automatically by the system.

### Reliability indicators

| Indicator | Description |
|---|---|
| Completion Rate | Proportion of commitments completed |
| On-time Rate | Proportion completed on time |
| Commitment Fulfillment | Proportion of Commitments fulfilled |
| Response Rate | Proportion of requests or confirmations answered |
| Dispute-free Rate | Proportion completed without dispute |
| Cancellation Rate | Proportion cancelled |
| No-show Rate | Proportion recorded as no-show |

An illustrative formula is:

```text
Reliability =
  0.30 x Completion
+ 0.25 x OnTime
+ 0.20 x Commitment
+ 0.15 x Response
+ 0.10 x DisputeFree
```

Example output:

```text
Exchange Reliability: 94
```

## 15. Dispute

The 48-hour MVP can use a simple dispute model.

| Field | Options or Description |
|---|---|
| `dispute_id` | ID |
| `session_id` | Corresponding Session |
| `raised_by` | User who opened the dispute |
| `reason` | Not Completed / Not as Agreed / No-show / Other |
| `status` | Open / Resolved |
| `resolution` | Full Release / Partial Release / Forfeit |
| `resolved_at` | Resolution time |

## 16. Withdrawal

Withdrawal supports exchanges with three or more participants. A withdrawal breaks the cycle and triggers a replacement search.

```text
Cycle Broken
    |
Remove User
    |
Search Alternative
    |
Check Feasibility
    |
Rank Alternative
    |
New Exchange
```

| Field | Options or Description |
|---|---|
| `withdrawal_id` | ID |
| `exchange_id` | Corresponding Exchange |
| `user_id` | Withdrawn User |
| `reason` | Optional |
| `status` | Requested / Confirmed |
| `rematch_required` | Yes / No |

## 17. Fairness and Imbalance

Fairness and imbalance should be an independent product module.

Example warning:

```text
Potential Imbalance

You offer:
2 hours of Python

You receive:
1 hour of Tennis

Both users can still proceed if both explicitly confirm.
```

The core rule remains: the system may detect imbalance, but it does not decide value on behalf of users.

| Field | Options or Description |
|---|---|
| `balance_status` | Balanced / Potential Imbalance / Strong Imbalance |
| `duration_ratio` | Calculated automatically |
| `warning` | System-generated message |
| `mutual_confirmation` | Yes / No |

## 18. Commitment Limit

Commitment limits prevent the system from accumulating a large number of unfulfilled obligations.

The central policy is:

```text
Receive-first is limited.
Give-first may create future Contribution.
```

| Field | Rule |
|---|---|
| `max_active_commitments` | MVP = 1 |
| `can_receive_first` | Yes / No |
| `can_give_first` | Yes |
| `blocked_reason` | Existing commitment / Reliability / Other |

## 19. Network Graph

The Network Graph enables multi-party exchange.

### Node

```text
User
```

### Edge

```text
A -> B
```

An edge means that value offered by A can satisfy a Need held by B.

Example:

```text
Alice --Python------> Bob
Bob -----Photography-> Charlie
Charlie --Tennis-----> Alice
```

This forms the cycle:

```text
Alice -> Bob -> Charlie -> Alice
```

## 20. Recommendation algorithm inputs

The recommendation algorithm primarily reads these fields:

| Input | Source |
|---|---|
| Skill | Offer / Need |
| Level | Offer / Need |
| Duration | Offer / Need |
| Capacity | Offer |
| Sessions Needed | Need |
| Mode | Offer / Need |
| Location | Offer / Need |
| Availability | Offer / Need |
| Reciprocity | Match |
| Existing Commitment | Commitment |
| Contribution | Contribution |
| Reliability | User |
| Active Commitments | User |
| Network Position | Graph |
| Withdrawal Status | Exchange |
| Imbalance | Exchange |

## 21. Recommendation output

The system should not output only a score such as `Match Score: 92`. It should explain the recommended person, the proposed exchange, the reasons for the recommendation, and the risk.

### Recommended participant

```text
Bob
```

### Recommended exchange

```text
You give:
Python — 1 hour

You receive:
Tennis — 1 hour
```

### Recommendation reasons

```text
[x] Skill compatible
[x] Schedule compatible
[x] Reciprocal exchange
[x] Fulfills an existing commitment
[x] High reliability
```

### Risk

```text
Low Exchange Risk
```

### If an imbalance exists

```text
[!] Potential imbalance

You provide: 2 hours
You receive: 1 hour

Both participants must confirm.
```

## Core object model

The database can be reduced to 12 core objects:

```text
User
|
+-- Offer
|   +-- Skill
|
+-- Need
|   +-- Skill
|
+-- Match
|
+-- Exchange
|   +-- Commitment
|   +-- Contribution
|   +-- Session
|   +-- Settlement
|
+-- Evaluation
|
+-- Reliability
|
+-- Dispute
```

The central closed loop is:

```text
Skill Library -> Offer / Need -> Match -> Exchange
-> Commitment -> Session -> Settlement -> Evaluation
-> Reliability -> Recommendation -> Next Exchange
```

This field set can serve directly as the product data dictionary for a 48-hour MVP. Offer, Need, Match, Commitment, Contribution, Session, and Settlement should not be reduced much further because, together, they form the mechanism that distinguishes Skills-Ring from an ordinary skill exchange platform.
