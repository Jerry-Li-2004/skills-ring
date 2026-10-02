# Skills Ring Data Model and Matching

## 6. Core data model

### 6.1 Offer

An **Offer** represents value that a user is willing to provide. The source model records the following fields:

| Field | Example |
|---|---|
| Skill | Python tutoring |
| Session Duration | 1 hour |
| Capacity | 5 sessions |
| Mode | Online |
| Availability | Weekday evenings |
| Location | Not applicable |
| Conditions | Beginner-friendly |

A compact Offer example is:

```text
Python tutoring
1 hour per session
Up to 5 sessions
Online
Weekday evenings
```

## 7. Need

A **Need** represents value that a user wants to receive. For example:

```text
Tennis coaching
1 hour per session
Up to 5 sessions
Offline
Local meeting point preferred
Weekend
```

Offer and Need conditions must be defined separately. The same user might provide Python tutoring online while seeking tennis coaching offline. For this reason, Mode, Location, and Availability must not be stored only as user-level attributes. They belong to each specific Offer or Need.

## 8. Why Duration and Capacity are separate

These concepts must not be combined.

### Session Duration

**Session Duration** describes how long one service session lasts, such as one hour per session.

### Capacity

**Capacity** describes how many sessions the provider is willing to offer, such as up to five sessions.

Therefore:

```text
Python tutoring
1 hour per session
5 sessions
```

means the provider is willing to offer no more than five separate sessions, each lasting one hour. It does not mean one five-hour session. This distinction allows the system to support continuing, real-world exchanges.

## 9. Core feature one: Reciprocal Matching

Reciprocal Matching is the first layer of the Skills-Ring mechanism.

A traditional matcher asks:

```text
What does A need? -> Who can provide it?
```

Skills-Ring considers four connected facts:

```text
What A needs
+ What A can provide
+ What B needs
+ What B can provide
```

### Example

| Participant | Can Give | Needs |
|---|---|---|
| Alice | Python tutoring | Tennis coaching |
| Bob | Tennis coaching | Python tutoring |

The system discovers:

```text
Alice's Need = Bob's Offer
Bob's Need = Alice's Offer
```

This creates a **Reciprocal Match**:

```text
Alice <-> Bob
```

## 10. Core feature two: Multi-party Value Routing

A direct match will not always exist. Skills-Ring therefore does not stop after reporting "No direct match." It searches for a value exchange cycle among several users.

### Example

| Participant | Gives | Needs |
|---|---|---|
| Alice | Python | Photography |
| Bob | Photography | Tennis |
| Charlie | Tennis | Python |

The system discovers:

```text
Alice -> Bob -> Charlie -> Alice
```

This is a **Value Exchange Cycle**. Operationally:

- Alice provides Python to Charlie.
- Charlie provides tennis to Bob.
- Bob provides photography to Alice.

All three participants receive the value they need.

## 11. Why multi-party routing is a central innovation

Traditional platforms usually look for:

```text
A <-> B
```

Skills-Ring can also find:

```text
A -> B -> C -> A
```

and potentially:

```text
A -> B -> C -> D -> A
```

Value exchange no longer requires the person a user needs to also need that same user's service. The product addresses a classic coordination problem: how to reroute distributed supply and demand when no universal medium of exchange exists.
