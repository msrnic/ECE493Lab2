# Data Model: Reviewer Assignment Workflow

## Entity: PaperSubmission

| Field | Type | Required | Rules |
|---|---|---|---|
| `paperId` | UUID | Yes | Immutable primary identifier |
| `title` | String | Yes | 1-300 chars |
| `state` | Enum | Yes | `submitted`, `under_review`, `withdrawn`; assignment allowed only when `submitted` (FR-001) |
| `assignmentVersion` | Integer | Yes | Non-negative; increments on successful confirmation for optimistic concurrency (FR-012) |
| `requiredReviewerSlots` | Integer | Yes | `>= 1`; each slot must be filled before completion (FR-010) |
| `updatedAt` | Timestamp | Yes | Server-managed |

## Entity: Reviewer

| Field | Type | Required | Rules |
|---|---|---|---|
| `reviewerId` | UUID | Yes | Immutable primary identifier |
| `displayName` | String | Yes | 1-120 chars |
| `email` | String | Yes | RFC 5322-compatible format |
| `availabilityStatus` | Enum | Yes | `available` or `unavailable` (FR-002, FR-004) |
| `coiFlag` | Boolean (contextual) | Yes | Evaluated for specific `paperId`; true blocks assignment (FR-011) |

## Entity: AssignmentAttempt

Tracks an editor's in-progress selection and replacement workflow before commit.

| Field | Type | Required | Rules |
|---|---|---|---|
| `attemptId` | UUID | Yes | Immutable primary identifier |
| `paperId` | UUID | Yes | FK -> `PaperSubmission.paperId` |
| `editorId` | UUID/String | Yes | Initiating editor identity |
| `basePaperVersion` | Integer | Yes | Must equal current paper `assignmentVersion` at confirm time (FR-012) |
| `status` | Enum | Yes | `draft`, `blocked_unavailable`, `blocked_coi`, `ready_to_confirm`, `confirmed`, `rejected_stale`, `cancelled` |
| `createdAt` | Timestamp | Yes | Server-managed |
| `confirmedAt` | Timestamp | No | Set only when `status=confirmed` |

## Entity: AssignmentSelection

Represents one reviewer slot within an assignment attempt.

| Field | Type | Required | Rules |
|---|---|---|---|
| `selectionId` | UUID | Yes | Immutable primary identifier |
| `attemptId` | UUID | Yes | FK -> `AssignmentAttempt.attemptId` |
| `slotNumber` | Integer | Yes | `>= 1`, unique per attempt |
| `reviewerId` | UUID | Yes | FK -> `Reviewer.reviewerId` |
| `availabilitySnapshot` | Enum | Yes | `available` or `unavailable` at validation time |
| `coiSnapshot` | Boolean | Yes | True blocks completion (FR-011) |
| `status` | Enum | Yes | `selected`, `needs_replacement`, `replaced`, `eligible` |
| `replacedBySelectionId` | UUID | No | Self-reference when alternate selected (FR-004, FR-005) |

## Entity: ReviewerAssignment

Committed reviewer-paper relationship created only from a successful confirmation.

| Field | Type | Required | Rules |
|---|---|---|---|
| `assignmentId` | UUID | Yes | Immutable primary identifier |
| `paperId` | UUID | Yes | FK -> `PaperSubmission.paperId` |
| `reviewerId` | UUID | Yes | FK -> `Reviewer.reviewerId` |
| `slotNumber` | Integer | Yes | Must map to required slot |
| `status` | Enum | Yes | `active` (retained even if invitation reaches terminal failure; FR-013) |
| `sourceAttemptId` | UUID | Yes | FK -> `AssignmentAttempt.attemptId` |
| `replacementOfReviewerId` | UUID | No | Prior unavailable/conflicted reviewer for traceability (FR-009) |
| `createdAt` | Timestamp | Yes | Server-managed |

## Entity: ReviewInvitation

| Field | Type | Required | Rules |
|---|---|---|---|
| `invitationId` | UUID | Yes | Immutable primary identifier |
| `assignmentId` | UUID | Yes | FK -> `ReviewerAssignment.assignmentId` |
| `status` | Enum | Yes | `pending`, `sent`, `retry_scheduled`, `failed_terminal` |
| `retryCount` | Integer | Yes | `0..3`; hard limit 3 retries (FR-007) |
| `nextRetryAt` | Timestamp | No | Set when `status=retry_scheduled`, exactly 5 minutes after failure (FR-007) |
| `lastError` | String | No | Failure details for logs and UI follow-up |
| `followUpRequired` | Boolean | Yes | True when terminal failure occurs (FR-008, FR-013) |
| `updatedAt` | Timestamp | Yes | Server-managed |

## Relationships

- `PaperSubmission (1) -> (many) AssignmentAttempt`
- `AssignmentAttempt (1) -> (many) AssignmentSelection`
- `PaperSubmission (1) -> (many) ReviewerAssignment`
- `ReviewerAssignment (1) -> (1) ReviewInvitation`
- `Reviewer (1) -> (many) AssignmentSelection`
- `Reviewer (1) -> (many) ReviewerAssignment`

## Validation Rules Derived from Requirements

- Only papers with `state=submitted` can start assignment attempts (FR-001).
- Reviewer in a selection must be unique within one attempt and per final paper slot to prevent duplicate assignment.
- Any `AssignmentSelection` with `availabilitySnapshot=unavailable` or `coiSnapshot=true` must transition to `needs_replacement`; confirmation is blocked while any slot remains unresolved (FR-010, FR-011).
- Confirmation succeeds only if `basePaperVersion` matches current `PaperSubmission.assignmentVersion`; otherwise mark attempt `rejected_stale` (FR-012).
- On successful confirmation, create `ReviewerAssignment` records and `ReviewInvitation` records atomically (FR-003, FR-006, FR-009).
- Invitation retry scheduling uses fixed 5-minute intervals and stops at retry count 3, then sets `status=failed_terminal` and `followUpRequired=true` while leaving `ReviewerAssignment.status=active` (FR-007, FR-013).

## State Transitions

### AssignmentAttempt

- `draft -> blocked_unavailable` when any selected reviewer is unavailable.
- `draft -> blocked_coi` when any selected reviewer has COI.
- `blocked_unavailable -> ready_to_confirm` once all unavailable slots are replaced with eligible reviewers.
- `blocked_coi -> ready_to_confirm` once all conflicted slots are replaced with non-conflicted reviewers.
- `ready_to_confirm -> confirmed` on successful first confirmation.
- `ready_to_confirm -> rejected_stale` when another editor confirmation already succeeded.
- `draft|blocked_unavailable|blocked_coi|ready_to_confirm -> cancelled` when editor aborts workflow.

### AssignmentSelection

- `selected -> needs_replacement` when validation finds unavailability or COI.
- `needs_replacement -> replaced` when alternate reviewer is chosen.
- `selected|replaced -> eligible` after passing current validation checks.

### ReviewInvitation

- `pending -> sent` when delivery succeeds first attempt.
- `pending -> retry_scheduled` when first delivery fails.
- `retry_scheduled -> sent` when retry succeeds.
- `retry_scheduled -> retry_scheduled` while `retryCount < 3` and failures continue.
- `retry_scheduled -> failed_terminal` when `retryCount=3` and latest retry fails.
