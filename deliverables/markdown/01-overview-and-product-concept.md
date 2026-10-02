# Skills Ring Overview and Product Concept

## Executive summary

Skills-Ring is open to the public: any individual can share their skills as personal assets and exchange services with others. Participation does not depend on institutional membership or a shared affiliation.

Skills-Ring is a coordination and settlement platform for non-monetary value exchange. It addresses a common problem: people possess skills, time, and other valuable resources, but cannot exchange them efficiently because they lack a suitable counterpart, a shared way to compare value, or a reliable mechanism for ensuring that promised services are ultimately delivered.

Users define both what they can provide and what they want to receive. A typical profile might say, "I can provide Python tutoring and I need tennis coaching." The system searches for compatible relationships using each participant's needs, skills, session duration, number of sessions, availability, location, and online or offline requirements.

When two people can satisfy one another directly, Skills-Ring creates a reciprocal exchange. When no direct match exists, it searches the user network for a multi-party route. For example:

```text
Alice gives Python and needs Photography
Bob gives Photography and needs Tennis
Charlie gives Tennis and needs Python

Alice -> Bob -> Charlie -> Alice
```

This cycle allows value that cannot be exchanged one-to-one to move through coordinated participation by several people.

Real exchanges are often asynchronous. If one person provides a service before the other person has performed their side, Skills-Ring records a specific **Exchange Commitment**, such as: "Bob must provide Alice with one one-hour tennis coaching session." Future recommendations then prioritize opportunities that help users fulfill existing commitments.

The platform does not impose a universal price on unlike skills. It warns participants when an exchange may be imbalanced, but allows them to proceed through **Mutual Confirmation**. During an exchange, participants can adjust the timing and duration of future sessions. The system supports completed, partially completed, cancelled, withdrawn, and disputed states. If a participant leaves a multi-party exchange, the platform can search for a replacement participant or an alternative route.

After each service session, participants can evaluate punctuality, engagement, and whether the agreed service was completed. These results form **Exchange Reliability**, which influences future matching and risk controls.

The complete loop is:

```text
Value discovery -> Matching -> Multi-party routing -> Confirmation
-> Commitment -> Service -> Settlement -> Evaluation -> Rematching
```

Skills-Ring is therefore not simply a skill-sharing or second-hand marketplace. It is an exchange network in which skills and time can be discovered, coordinated, exchanged, and settled even when they do not have a single monetary price.

## 1. Project name

### Skills-Ring

**Subtitle:** A Coordination and Settlement Network for Non-Monetary Value

**Core slogan:**

> We don't put a price on what people have. We make it exchangeable.

## 2. Project background

Many valuable resources are underused in everyday life. One person may know Python but have no current project. Another may know tennis but need help with Python. Others may have skills in photography, design, languages, programming, or music instruction and may be willing to contribute time, yet those capabilities are difficult to bring into a conventional market.

The problem is not necessarily a lack of value. The value may be undiscovered, may not have found the right exchange counterpart, or may lack a mechanism that ensures the exchange is completed.

Conventional markets solve this problem through money:

```text
Python tutoring -> GBP 30 -> Tennis coaching
```

Money converts unlike forms of value into a common medium of exchange. If participants do not want to use money, or cannot use it, direct barter creates four important problems.

### 2.1 Needs do not always match directly

- Alice can teach Python and wants to learn tennis.
- Bob can teach tennis but wants to learn photography.

Both people have something valuable, but they cannot exchange directly.

### 2.2 Exchanges do not always happen at the same time

Alice may finish teaching Python today while Bob cannot deliver the tennis lesson until next week. Alice therefore needs a reason to provide value first. This creates a commitment problem.

### 2.3 A feasible exchange chain may exist across several people

```text
Alice gives Python and needs Photography
  |
Bob gives Photography and needs Tennis
  |
Charlie gives Tennis and needs Python
```

The three participants form a complete cycle:

```text
Alice -> Bob -> Charlie -> Alice
```

A traditional one-to-one matcher cannot discover this relationship.

### 2.4 Unlike values have no natural objective equivalence

For example:

```text
2 hours of Python tutoring <-> 1 hour of tennis coaching
```

The system cannot credibly claim that one hour of Python is objectively equal to two hours of tennis. Value is subjective. If the system forces every skill into a universal price, it recreates a monetary market.

## 3. Core problem

Skills-Ring does not ask, "How should a skill be priced?" It asks:

> How can value without a universal monetary price still be discovered, matched, committed, and settled in the real world?

The problem is divided into four layers:

```text
Discover -> Match -> Commit -> Settle
```

That means discovering value, matching compatible value, committing to the exchange, and settling the completed exchange.

## 4. Core philosophy

### Skills-Ring is not a skill marketplace

A conventional skill platform primarily answers: "Who can provide this service?"

Skills-Ring also answers:

- Who needs the value I can provide?
- Who can provide the value I need?
- What happens if there is no direct exchange counterpart?
- What happens if the parties perform at different times?
- What happens if the parties do not consider their contributions perfectly equivalent?
- What happens if a participant withdraws?

The product position is:

> Skills-Ring is not a skill marketplace. It is a coordination and settlement layer for non-monetary value.

## 5. Product definition

Skills-Ring asks every user to define two things.

### 5.1 I can give

The user identifies what they can provide. Examples include:

- Python tutoring
- Tennis coaching
- English conversation
- Photography
- Resume review
- Graphic design
- Coding help

### 5.2 I need

The user identifies what they want to receive. Examples include:

- Tennis coaching
- Python tutoring
- Photography
- English conversation

Users do not need to price their skills, purchase virtual currency, or use blockchain. The system records the operational facts that matter: who can provide each service and who needs each service.
