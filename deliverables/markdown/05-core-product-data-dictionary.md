# Skills Ring Core Product Data Dictionary

This document translates the first part of the source data dictionary. The source numbering moves directly from section 6 to section 8; that numbering is retained here rather than inventing a missing entity.

## 1. User

Location, Mode, and Availability do not belong on the User record. They belong to each Offer or Need because the same person may offer Python online while needing tennis coaching offline.

| Field | Type | Options or Description |
|---|---|---|
| `user_id` | ID | Generated automatically by the system |
| `name` | Text | User name |
| `avatar` | Image | Optional |
| `reliability_score` | Number | Calculated from exchange history; range 0–100 |
| `completion_rate` | Number | Historical completion rate |
| `on_time_rate` | Number | Historical punctuality rate |
| `dispute_rate` | Number | Historical dispute rate |
| `active_commitments` | Number | Number of currently unfinished Commitments |

## 2. Skill Library

The Skill Library is a critical standardization table. Users should select a skill from the library instead of entering arbitrary skill names as the core matching value. Every category should also include an **Other** option.

A 48-hour MVP does not need hundreds of skills. A library of approximately 30–50 skills is sufficient.

| Category | Skill |
|---|---|
| Programming | Python |
| Programming | Java |
| Programming | C++ |
| Programming | Web Development |
| Programming | Mobile Development |
| Data | Excel |
| Data | SQL |
| Data | Data Analysis |
| Data | Data Visualization |
| Data | Machine Learning |
| Languages | English |
| Languages | Chinese |
| Languages | Japanese |
| Languages | Korean |
| Sports | Tennis |
| Sports | Badminton |
| Sports | Swimming |
| Sports | Running |
| Sports | Basketball |
| Creative | Photography |
| Creative | Graphic Design |
| Creative | Video Editing |
| Creative | Music Production |
| Academic | Mathematics |
| Academic | Statistics |
| Academic | Academic Writing |
| Academic | Presentation |
| Career | Resume Review |
| Career | Interview Practice |
| Career | Career Advice |
| Career | Public Speaking |
| Music | Guitar |
| Music | Piano |
| Music | Singing |

## 3. Offer

An Offer answers: **What can you give?**

### Example

```text
Category: Programming
Skill: Python
Level: Advanced
Duration: 1 hour
Mode: Online
Location: Anywhere
Availability: Weekday Evening
Conditions: Prefer beginner learners
```

| Field          | Type         | Options or Description                                                                                                                                                |
| -------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `offer_id`     | ID           | Generated automatically                                                                                                                                               |
| `user_id`      | Foreign key  | Corresponding User                                                                                                                                                    |
| `category`     | Enum         | Programming / Data / Languages / Sports / Creative / Academic / Career / Music                                                                                        |
| `skill`        | Foreign key  | Selected from the Skill Library                                                                                                                                       |
| `level`        | Enum         | Beginner / Intermediate / Advanced                                                                                                                                    |
| `duration`     | Enum         | 30 min / 45 min / 1 hour / 1.5 hours / 2 hours                                                                                                                        |
| `mode`         | Enum         | Online / Offline / Either                                                                                                                                             |
| `location`     | Text         | City or agreed meeting place / Anywhere                                                                                                 |
| `availability` | Multi-select | Weekday Morning / Weekday Afternoon / Weekday Evening / Saturday Morning / Saturday Afternoon / Saturday Evening / Sunday Morning / Sunday Afternoon / Sunday Evening |
| `conditions`   | Text         | Optional short text                                                                                                                                                   |
| `status`       | Enum         | Active / Paused / Completed                                                                                                                                           |

## 4. Need

A Need answers: **What do you need?**

### Example

```text
Category: Sports
Skill: Tennis
Desired Level: Beginner
Duration: 1 hour
Sessions Needed: 5
Mode: Offline
Location: Local meeting point
Availability: Saturday Afternoon
```

| Field | Type | Options or Description |
|---|---|---|
| `need_id` | ID | Generated automatically |
| `user_id` | Foreign key | Corresponding User |
| `category` | Enum | Same categories as the Skill Library |
| `skill` | Foreign key | Selected from the Skill Library |
| `desired_level` | Enum | Beginner / Intermediate / Advanced |
| `duration` | Enum | 30 min / 45 min / 1 hour / 1.5 hours / 2 hours |
| `sessions_needed` | Integer | 1 / 2 / 3 / 5 / 10 |
| `mode` | Enum | Online / Offline / Both |
| `location` | Text | City or agreed meeting place / Anywhere |
| `availability` | Multi-select | Same options as Offer |
| `conditions` | Text | Optional |
| `status` | Enum | Active / Paused / Fulfilled |
| `created_at` | DateTime | Creation time |

## 5. Availability

Availability may be separated into its own table for a more normalized database.

### Time Slot

The MVP does not need exact calendar ranges such as `2026-10-03 14:00–15:00`, which would substantially increase development work. Time-slot overlap is sufficient for the first version.

| ID | Option |
|---:|---|
| 1 | Weekday Morning |
| 2 | Weekday Afternoon |
| 3 | Weekday Evening |
| 4 | Saturday Morning |
| 5 | Saturday Afternoon |
| 6 | Saturday Evening |
| 7 | Sunday Morning |
| 8 | Sunday Afternoon |
| 9 | Sunday Evening |

## 6. Match

A Match is generated automatically by the system and is not entered by the user.

| Field | Description |
|---|---|
| `match_id` | Match ID |
| `offer_id` | Referenced Offer |
| `need_id` | Referenced Need |
| `compatibility_score` | Basic compatibility |
| `reciprocity_score` | Whether the relationship is reciprocal |
| `commitment_score` | Whether the match can fulfill an existing Commitment |
| `network_score` | Contribution to the wider network |
| `reliability_score` | Counterparty's historical reliability |
| `availability_score` | Degree of schedule compatibility |
| `risk_score` | Exchange risk |
| `final_score` | Final recommendation ranking |
| `match_type` | Direct / Reciprocal / Multi-party |

## 8. Exchange

A Match becomes an Exchange only after it is accepted by all affected participants.

| Field | Options or Description |
|---|---|
| `exchange_id` | Generated automatically |
| `exchange_type` | Direct / Reciprocal / Multi-party |
| `participants` | User list |
| `status` | Proposed / Confirmed / Active / Partially Settled / Settled / Disputed / Withdrawn / Defaulted |
| `created_at` | Creation time |
| `updated_at` | Last update time |

## 9. Commitment

Commitment is a major distinction between Skills-Ring and an ordinary skill platform.

Example:

```text
Bob owes Alice 1 x 1-hour Tennis session.
```

The central calculation is:

```text
Remaining = Total - Completed
```

| Field | Description |
|---|---|
| `commitment_id` | ID |
| `debtor_id` | Person who must perform the service |
| `beneficiary_id` | Person who should receive the value |
| `skill` | Example: Tennis |
| `duration` | Example: 1 hour |
| `total_sessions` | Example: 1 |
| `completed_sessions` | Example: 0 |
| `remaining_sessions` | Example: 1 |
| `deadline` | Optional |
| `status` | Proposed / Active / Fulfilled / Disputed / Defaulted / Cancelled |

## 10. Contribution

Contribution is stored separately from Commitment.

If Alice has already provided Bob with one hour of Python, but Bob has not yet provided the tennis session in return, Alice has one hour of **Unsettled Contribution**.

```text
Contribution = What I have already given
Commitment = What I still need to give
```

| Field | Description |
|---|---|
| `contribution_id` | ID |
| `provider_id` | Person who provided value |
| `receiver_id` | Person who received value |
| `skill` | Example: Python |
| `duration` | Example: 1 hour |
| `session_id` | Corresponding Session |
| `settlement_status` | Unsettled / Settled |
| `created_at` | Creation time |

## 11. Session

One instance of an actual service is recorded as a Session.

| Field | Options or Description |
|---|---|
| `session_id` | ID |
| `exchange_id` | Corresponding Exchange |
| `provider_id` | Provider |
| `receiver_id` | Receiver |
| `skill` | Skill |
| `duration` | Planned service duration |
| `scheduled_time` | Scheduled time |
| `status` | Scheduled / In Progress / Completed / Cancelled / No-show / Disputed |
| `actual_duration` | Actual completed duration |
| `notes` | Optional short text |

## 12. Settlement

Settlement is the financial-like accounting layer of the system, although the exchanged value is not priced in money.

Example:

```text
Exchange
Python 5 hours <-> Tennis 5 hours

Python: 5/5 completed
Tennis: 3/5 completed

Settlement: Partially Settled
Remaining: 2 hours of Tennis
```

| Field | Options or Description |
|---|---|
| `settlement_id` | ID |
| `exchange_id` | Corresponding Exchange |
| `contribution_id` | Corresponding Contribution |
| `commitment_id` | Corresponding Commitment |
| `status` | Pending / Partial / Settled / Disputed |
| `completed_value` | Amount of service completed |
| `remaining_value` | Amount of service remaining |
| `settled_at` | Settlement time |
