# Data Model: Author Decision Notifications

## Scope Mapping

- Use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-12.md`
- Acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-12-AS.md`

## Entities

### 1. FinalizedDecision

Represents the decision event that triggers notification processing.

| Field | Type | Required | Validation |
|---|---|---|---|
| `decisionId` | string (UUID or canonical ID) | Yes | Must be unique and non-empty |
| `submissionId` | string | Yes | Must reference an existing submission |
| `authorId` | string | Yes | Must reference an existing author |
| `decisionOutcome` | enum (`accepted`, `rejected`, `revision`) | Yes | Must match configured decision values |
| `finalizedAt` | datetime (UTC) | Yes | Must be <= current processing time |

Relationships:
- One `FinalizedDecision` maps to exactly one `DecisionNotification` for the primary author.

### 2. DecisionNotification

Stores the generated author notification tied to a finalized decision.

| Field | Type | Required | Validation |
|---|---|---|---|
| `notificationId` | string (UUID) | Yes | Unique |
| `decisionId` | string | Yes | Foreign key to `FinalizedDecision.decisionId` |
| `submissionId` | string | Yes | Must match `FinalizedDecision.submissionId` |
| `authorId` | string | Yes | Must match `FinalizedDecision.authorId` |
| `channel` | enum (`email`) | Yes | Must be `email` (FR-011) |
| `recipientEmail` | string | Yes | Must match email format |
| `subject` | string | Yes | Non-empty |
| `bodyHtml` | string | Yes | HTML payload for decision message |
| `status` | enum (`generated`, `delivery_in_progress`, `delivered`, `retry_pending`, `unresolved_failure`) | Yes | Must follow state transitions |
| `dedupeKey` | string | Yes | Unique index on decision+author identity |
| `createdAt` | datetime (UTC) | Yes | System-generated |
| `updatedAt` | datetime (UTC) | Yes | System-generated |
| `deliveredAt` | datetime (UTC) | No | Set only when delivery succeeds |

Relationships:
- One `DecisionNotification` has one or two `DeliveryAttempt` records.
- One `DecisionNotification` may have zero or one `UnresolvedFailureRecord`.

### 3. DeliveryAttempt

Captures each send attempt outcome.

| Field | Type | Required | Validation |
|---|---|---|---|
| `attemptId` | string (UUID) | Yes | Unique |
| `notificationId` | string | Yes | Foreign key to `DecisionNotification.notificationId` |
| `attemptNumber` | integer | Yes | Allowed values: `1`, `2` |
| `attemptedAt` | datetime (UTC) | Yes | System-generated |
| `status` | enum (`success`, `failure`) | Yes | Derived from email adapter response |
| `failureReason` | string | Conditional | Required when `status=failure` |
| `providerMessageId` | string | No | Present when provider returns message ID |

Relationships:
- Many `DeliveryAttempt` rows belong to one `DecisionNotification`.

### 4. UnresolvedFailureRecord

Audit record persisted only when retry also fails.

| Field | Type | Required | Validation |
|---|---|---|---|
| `failureRecordId` | string (UUID) | Yes | Unique |
| `notificationId` | string | Yes | Foreign key to `DecisionNotification.notificationId` |
| `timestamp` | datetime (UTC) | Yes | Must equal unresolved failure creation time |
| `submissionId` | string | Yes | Copied from notification context |
| `authorId` | string | Yes | Copied from notification context |
| `failureReason` | string | Yes | Non-empty |
| `attemptNumber` | integer | Yes | Must be `2` for final failed retry |
| `finalDeliveryStatus` | enum (`unresolved_failure`) | Yes | Must be unresolved |
| `retainedUntil` | datetime (UTC) | Yes | `timestamp + 365 days` |
| `createdAt` | datetime (UTC) | Yes | System-generated |

Relationships:
- One `UnresolvedFailureRecord` belongs to one `DecisionNotification`.

### 5. UserRoleContext (Authorization Support)

Represents authenticated actor metadata used for admin-only access checks.

| Field | Type | Required | Validation |
|---|---|---|---|
| `userId` | string | Yes | Authenticated principal |
| `role` | enum (`admin`, `author`, `reviewer`) | Yes | Must include `admin` for failure-log viewing |

## State Transitions

### DecisionNotification Lifecycle

1. `generated` -> `delivery_in_progress` when attempt 1 starts.
2. `delivery_in_progress` -> `delivered` when attempt 1 succeeds.
3. `delivery_in_progress` -> `retry_pending` when attempt 1 fails.
4. `retry_pending` -> `delivery_in_progress` when attempt 2 starts.
5. `delivery_in_progress` -> `delivered` when attempt 2 succeeds.
6. `delivery_in_progress` -> `unresolved_failure` when attempt 2 fails and failure record is persisted.

Transition guards:
- No transition may create an `attemptNumber > 2`.
- `dedupeKey` uniqueness prevents multiple delivered messages for one finalized decision and author.

### DeliveryAttempt Rules

- Attempt 1 must exist before attempt 2 can be created.
- Attempt 2 can be created only if attempt 1 status is `failure`.
- Additional attempts are invalid and must be rejected.

## Derived/Operational Rules

- Failure-log visibility queries must enforce `role=admin`.
- Retention job deletes/archives `UnresolvedFailureRecord` entries only after `retainedUntil`.
- Notification generation must be idempotent for repeated finalized-decision triggers with the same `dedupeKey`.
