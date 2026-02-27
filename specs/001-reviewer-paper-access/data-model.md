# Data Model: Reviewer Paper Access

**Feature**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/spec.md`  
**Use Case Scope**: `UC-08`  
**Acceptance Scope**: `UC-08-AS`

## 1. ReviewerAccessEntitlement

Represents whether a reviewer can currently access a specific paper.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| entitlementId | string (UUID) | Yes | Unique entitlement record ID |
| reviewerId | string | Yes | Reviewer user ID |
| paperId | string | Yes | Paper ID |
| assignmentStatus | enum(`accepted`, `withdrawn`) | Yes | Assignment acceptance state |
| accessStatus | enum(`active`, `revoked`) | Yes | Current access decision |
| revokedAt | string (ISO-8601 datetime) | No | Revocation timestamp |
| revokedBy | string | No | Actor who revoked access |
| updatedAt | string (ISO-8601 datetime) | Yes | Last entitlement update |

Validation rules:
- `assignmentStatus` must be `accepted` before access can be `active`.
- `accessStatus=revoked` requires `revokedAt`.
- One active entitlement max per `reviewerId + paperId`.

State transitions:
- `active -> revoked` (revocation event)
- `revoked -> active` only via explicit reassignment workflow (outside UC-08, but model supports it)

## 2. PaperFileBundle

Represents metadata for files tied to a selected paper.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| paperId | string | Yes | Paper ID |
| files | array<PaperFile> | Yes | Available files for display/download |
| availabilityStatus | enum(`available`, `temporarily-unavailable`) | Yes | Current file-service state |
| generatedAt | string (ISO-8601 datetime) | Yes | Bundle generation time |

`PaperFile` fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| fileId | string | Yes | File ID |
| fileName | string | Yes | Display/download name |
| contentType | string | Yes | MIME type |
| sizeBytes | integer | Yes | File size |
| checksum | string | No | Integrity metadata |

Validation rules:
- `files` must be non-empty when `availabilityStatus=available`.
- `files` may be empty when `availabilityStatus=temporarily-unavailable`.

State transitions:
- `available <-> temporarily-unavailable` driven by file storage health.

## 3. PaperAccessAttempt

Append-only audit record for each reviewer access request.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| attemptId | string (UUID) | Yes | Attempt record ID |
| reviewerId | string | Yes | Reviewer making the request |
| paperId | string | Yes | Requested paper |
| fileId | string | No | Requested file if file-level request |
| outcome | enum(`granted`, `denied-revoked`, `temporarily-unavailable`, `throttled`) | Yes | Access result |
| reasonCode | string | Yes | Machine-readable reason |
| occurredAt | string (ISO-8601 datetime) | Yes | Timestamp |
| requestId | string | Yes | Request correlation ID |
| viewerRoleSnapshot | array<string> | Yes | Roles known at request time |
| retryAfterSeconds | integer | No | Required when `outcome=throttled` |

Validation rules:
- `retryAfterSeconds` is required and `>=1` when `outcome=throttled`.
- `reasonCode` must match outcome family (`ACCESS_REVOKED`, `TEMPORARY_OUTAGE`, `TEMP_OUTAGE_THROTTLED`, etc.).

State transitions:
- None (append-only immutable log entries).

## 4. OutageRetryWindow

Tracks throttle windows for repeated temporary-outage retries.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| reviewerId | string | Yes | Reviewer scope key |
| paperId | string | Yes | Paper scope key |
| firstOutageAt | string (ISO-8601 datetime) | Yes | First outage timestamp in current window |
| immediateRetryUsed | boolean | Yes | Whether one immediate retry was consumed |
| nextAllowedRetryAt | string (ISO-8601 datetime) | No | Next retry timestamp when throttled |

Validation rules:
- Key uniqueness on `reviewerId + paperId`.
- `nextAllowedRetryAt` must be set when `immediateRetryUsed=true` and request is throttled.

State transitions:
- `new window -> immediate retry allowed -> throttled window -> reset on successful/expired window`

## Relationships

- `ReviewerAccessEntitlement (1) -> (many) PaperAccessAttempt`
- `PaperFileBundle (1 per paper request) -> (many) PaperFile`
- `OutageRetryWindow (1 per reviewer-paper pair) -> controls PaperAccessAttempt outcomes for temporary outages`
- `PaperAccessAttempt.paperId` joins to editor-role authorization context for access-record viewing (FR-008)

## Requirement Mapping

- FR-001, FR-002, FR-003, FR-004, FR-010 -> `ReviewerAccessEntitlement`, `PaperFileBundle`
- FR-005 -> `PaperAccessAttempt.reasonCode` + controller/view messaging layer
- FR-006, FR-008 -> `PaperAccessAttempt` retrieval with role restrictions
- FR-009, FR-011 -> `PaperFileBundle.availabilityStatus`, `OutageRetryWindow`, `PaperAccessAttempt.outcome`
