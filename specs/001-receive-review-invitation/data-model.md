# Data Model: Reviewer Invitation Delivery

## Traceability

- Governing use case: `Use Cases/UC-07.md`
- Governing acceptance suite: `Acceptance Tests/UC-07-AS.md`
- Primary requirements: FR-001 through FR-011 in `specs/001-receive-review-invitation/spec.md`

## Entity: ReviewInvitation

Represents the invitation lifecycle for a reviewer-paper assignment.

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string (UUID) | Yes | Invitation identifier |
| `reviewerAssignmentId` | string | Yes | Upstream assignment reference |
| `paperId` | string | Yes | Paper reference for authorization + log filtering |
| `reviewerId` | string | Yes | Reviewer receiving invitation |
| `status` | enum(`pending`,`delivered`,`failed`,`canceled`) | Yes | Current delivery state |
| `retryCount` | integer (0-3) | Yes | Number of retries already executed |
| `maxRetries` | integer | Yes | Fixed value `3` for this feature |
| `nextRetryAt` | datetime (nullable) | No | Next scheduled retry time when `status=pending` |
| `followUpRequired` | boolean | Yes | True only when terminal failure occurs after all retries |
| `lastFailureReason` | string (nullable) | No | Most recent failure explanation |
| `deliveredAt` | datetime (nullable) | No | Time of successful delivery |
| `canceledAt` | datetime (nullable) | No | Time assignment-removal cancellation took effect |
| `isActive` | boolean | Yes | Active invitation marker used by uniqueness constraint |
| `createdAt` | datetime | Yes | Record creation timestamp |
| `updatedAt` | datetime | Yes | Last mutation timestamp |

### Validation Rules

- Unique active invitation: one record where `isActive=true` per `reviewerAssignmentId`.
- `retryCount` must never exceed `maxRetries`.
- `nextRetryAt` is required only when `status=pending` and a retry is still due.
- `followUpRequired=true` only when `status=failed` after 3 retries.
- Cancellation is allowed only when assignment removal is received while invitation is still pending/retrying.

### State Transitions

| Current State | Event | Next State | Notes |
|--------------|-------|------------|-------|
| `pending` | Initial send succeeds | `delivered` | Stop retry scheduling |
| `pending` | Send fails and `retryCount < 3` | `pending` | Increment retry count, set `nextRetryAt` +5 minutes |
| `pending` | Send fails and `retryCount == 3` | `failed` | Set `followUpRequired=true`, clear `nextRetryAt` |
| `pending` | Assignment removed | `canceled` | Stop all future retries immediately |
| `delivered` | Any later retry tick | `delivered` | No-op; invitation already complete |
| `failed` | Late provider success callback | `failed` | Keep terminal state, record ignored late callback audit |
| `canceled` | Late provider callback | `canceled` | Keep canceled state, record ignored callback audit |

## Entity: DeliveryAttempt

Tracks each initial send or retry execution.

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string (UUID) | Yes | Attempt identifier |
| `invitationId` | string (FK) | Yes | Parent invitation |
| `attemptNumber` | integer (0-3) | Yes | `0` for initial send, `1..3` for retries |
| `attemptType` | enum(`initial`,`retry`) | Yes | Attempt classification |
| `scheduledAt` | datetime | Yes | Time the attempt was due |
| `startedAt` | datetime | Yes | Time execution began |
| `completedAt` | datetime (nullable) | No | Time execution completed |
| `outcome` | enum(`delivered`,`failed`,`canceled`,`ignored`) | Yes | Attempt result |
| `failureReason` | string (nullable) | No | Error details when `outcome=failed` |
| `providerMessageId` | string (nullable) | No | Correlates callback data |

### Validation Rules

- `attemptNumber=0` appears once per invitation.
- Retry attempts are sequential and cannot skip numbers.
- `attemptType=retry` requires `attemptNumber >= 1`.
- `outcome=failed` requires non-empty `failureReason`.

## Entity: FailureLogEntry

Audit view of delivery failures and retry outcomes for editors/support/admin.

| Field | Type | Required | Description |
|------|------|----------|-------------|
| `id` | string (UUID) | Yes | Failure log identifier |
| `invitationId` | string (FK) | Yes | Related invitation |
| `deliveryAttemptId` | string (FK, nullable) | No | Related failed attempt (nullable for policy/system events) |
| `paperId` | string | Yes | Used for editor-of-paper authorization |
| `reviewerId` | string | Yes | Reviewer impacted |
| `eventType` | enum(`initial-failure`,`retry-failure`,`terminal-failure`,`retry-canceled`,`late-callback-ignored`) | Yes | Failure/audit event category |
| `message` | string | Yes | Human-readable troubleshooting detail |
| `createdAt` | datetime | Yes | Audit timestamp |

### Validation Rules

- A log entry is created for every failed attempt (initial and retries).
- A terminal-failure log entry is required when retry limit is exhausted.
- Access is restricted to paper editors and `support`/`admin` roles.

## Relationships

- `ReviewInvitation` 1-to-many `DeliveryAttempt`
- `ReviewInvitation` 1-to-many `FailureLogEntry`
- `DeliveryAttempt` 0-or-1 to `FailureLogEntry` for failure outcomes
