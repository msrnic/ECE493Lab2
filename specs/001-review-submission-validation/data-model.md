# Data Model: Review Submission Validation

## Scope Traceability

- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-09.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-09-AS.md`
- Requirements covered: FR-001 through FR-009 in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/spec.md`

## Entity: ReviewerPaperAssignment (Existing, Read-Only in this feature)

Represents authorization context for a reviewer and paper pair.

| Field | Type | Required | Notes |
|------|------|----------|------|
| assignmentId | string (uuid) | Yes | Primary key for submit/status routes |
| reviewerId | string (uuid) | Yes | Reviewer identity reference |
| paperId | string (uuid) | Yes | Target paper reference |
| accessState | enum(`ACTIVE`, `REVOKED`) | Yes | `ACTIVE` required for FR-001/FR-005 |

Validation rules:
- Submission is rejected if `accessState != ACTIVE` (FR-005 edge condition).

## Entity: ReviewSubmissionPayload (Transient Request)

Input sent during submit attempt; persists only if validation passes.

| Field | Type | Required | Notes |
|------|------|----------|------|
| recommendation | enum(`STRONG_ACCEPT`, `ACCEPT`, `WEAK_ACCEPT`, `WEAK_REJECT`, `REJECT`, `STRONG_REJECT`) | Yes | Required review outcome field |
| overallScore | integer (1..5) | Yes | Required numeric score |
| confidenceScore | integer (1..5) | Yes | Required reviewer confidence |
| summary | string | Yes | Required; non-empty after trim |
| strengths | string | No | Optional comments |
| weaknesses | string | No | Optional comments |
| commentsForChair | string | No | Optional confidential comments |
| submittedAtClient | string (date-time) | No | Optional client timestamp |

Validation rules:
- Required fields must exist and have non-whitespace content for string fields (FR-002, FR-003).
- Missing/invalid required fields produce `ValidationFeedback` and block persistence (FR-004, FR-008).

## Entity: ValidationFeedback (Transient, Session-Scoped)

Feedback generated when submit validation fails.

| Field | Type | Required | Notes |
|------|------|----------|------|
| assignmentId | string (uuid) | Yes | Correlates to current form session |
| missingFields | string[] | Yes | Canonical field keys that failed required checks |
| messages | object<string,string> | Yes | Human-readable per-field guidance |
| generatedAt | string (date-time) | Yes | Time of failed validation |

Validation rules:
- `missingFields` contains unique keys only.
- Feedback is rendered in view and never persisted as review record (FR-008).

## Entity: ReviewRecord (Persistent Completion)

Final stored review for one reviewer-paper assignment.

| Field | Type | Required | Notes |
|------|------|----------|------|
| reviewId | string (uuid) | Yes | Primary key |
| assignmentId | string (uuid) | Yes | Unique one-to-one with completion state |
| reviewerId | string (uuid) | Yes | Snapshot at completion |
| paperId | string (uuid) | Yes | Snapshot at completion |
| recommendation | enum | Yes | From payload |
| overallScore | integer (1..5) | Yes | From payload |
| confidenceScore | integer (1..5) | Yes | From payload |
| summary | string | Yes | Trimmed content |
| strengths | string | No | Optional |
| weaknesses | string | No | Optional |
| commentsForChair | string | No | Optional |
| status | enum(`COMPLETED`) | Yes | Terminal state for this feature |
| completedAt | string (date-time) | Yes | Commit timestamp |

Validation rules:
- Exactly one `ReviewRecord` per `assignmentId` (FR-007, FR-009).
- Any submit attempt after `status=COMPLETED` is rejected with conflict and record remains unchanged (FR-007).

## Relationships

- `ReviewerPaperAssignment` 1 -> 0..1 `ReviewRecord`
- `ReviewerPaperAssignment` 1 -> 0..N transient `ValidationFeedback` events in active session
- `ReviewSubmissionPayload` -> creates `ReviewRecord` only when validation passes and assignment access is active

## State Transitions

### Review Lifecycle (Assignment-Scoped)

| Current State | Trigger | Guard Conditions | Next State | Persistence |
|--------------|---------|------------------|------------|-------------|
| NOT_SUBMITTED | Submit attempt | Required fields missing/invalid | NOT_SUBMITTED | No review record write; feedback only |
| NOT_SUBMITTED | Submit attempt | Required fields valid + access active + no completed record | COMPLETED | Persist one review record |
| NOT_SUBMITTED | Submit attempt | Access revoked | NOT_SUBMITTED | Reject; no write |
| COMPLETED | Submit attempt | Any payload | COMPLETED | Reject; existing record unchanged |

### Concurrent Submit Resolution

| Competing Attempts | Rule | Outcome |
|--------------------|------|---------|
| >=2 valid submits for same assignment | Atomic first-successful completion | First committer writes `ReviewRecord`; all others receive conflict and do not modify persisted data |

