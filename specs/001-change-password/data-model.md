# Data Model: Change Account Password

## Entity: PasswordChangeSubmission

- Purpose: Captures one user-submitted password-change request.
- Fields:
  - `submissionId` (string, UUID)
  - `userId` (string, required)
  - `sessionId` (string, required)
  - `currentPassword` (string, required, non-empty, write-only)
  - `newPassword` (string, required, non-empty, write-only)
  - `submittedAt` (datetime, required)
  - `clientMetadata` (object, optional; includes IP and user agent for audit context)
- Validation rules:
  - `currentPassword` and `newPassword` must be present.
  - `newPassword` must satisfy global password policy.
  - `newPassword` must not equal `currentPassword`.

## Entity: CredentialRecord

- Purpose: Represents the persisted authentication credential state for a user.
- Fields:
  - `userId` (string, primary key)
  - `passwordHash` (string, required)
  - `passwordUpdatedAt` (datetime, required)
  - `credentialVersion` (integer, required)
- Validation rules:
  - Hash must be updated atomically with `passwordUpdatedAt`.
  - Successful password change increments `credentialVersion`.

## Entity: PasswordChangeAttempt

- Purpose: Tracks each password-change attempt and outcome for throttling and auditing.
- Fields:
  - `attemptId` (string, UUID)
  - `userId` (string, required)
  - `sessionId` (string, required)
  - `outcome` (enum: `updated`, `incorrect_current_password`, `policy_violation`, `temporarily_blocked`, `invalid_request`, `system_error`)
  - `failureCode` (string, optional)
  - `createdAt` (datetime, required)
  - `auditId` (string, optional)
- Validation rules:
  - Every attempt must have exactly one `outcome`.
  - `failureCode` is required for all non-`updated` outcomes.

## Entity: PasswordChangeThrottleState

- Purpose: Maintains per-user throttling counters and block windows.
- Fields:
  - `userId` (string, primary key)
  - `incorrectAttempts` (integer, required)
  - `windowStartAt` (datetime, required)
  - `windowEndAt` (datetime, required)
  - `blockedUntil` (datetime, optional)
- Validation rules:
  - When `incorrectAttempts >= 5` within rolling 10-minute window, set `blockedUntil = now + 10 minutes`.
  - During active block window, no credential update may occur.

## Entity: SessionRecord

- Purpose: Represents authenticated sessions for a user.
- Fields:
  - `sessionId` (string, primary key)
  - `userId` (string, required)
  - `isActive` (boolean, required)
  - `isCurrentSession` (boolean, derived in request context)
  - `invalidatedAt` (datetime, optional)
  - `invalidatedReason` (string, optional)
- Validation rules:
  - After successful password change, all active sessions except `isCurrentSession = true` are invalidated.

## Entity: SecurityNotification

- Purpose: Captures notification dispatch intent and status for successful password changes.
- Fields:
  - `notificationId` (string, UUID)
  - `userId` (string, required)
  - `channel` (enum: `email`, `in-app`, `sms`)
  - `status` (enum: `queued`, `sent`, `failed`)
  - `queuedAt` (datetime, required)
  - `sentAt` (datetime, optional)
- Validation rules:
  - Successful password changes must enqueue at least one security notification.

## Entity: SecurityAuditEntry

- Purpose: Immutable security log for all password-change attempts.
- Fields:
  - `auditId` (string, UUID)
  - `attemptId` (string, required)
  - `userId` (string, required)
  - `eventType` (constant: `password_change_attempt`)
  - `outcome` (same enum as `PasswordChangeAttempt.outcome`)
  - `recordedAt` (datetime, required)
  - `details` (object, optional; non-sensitive metadata only)
- Validation rules:
  - Every password-change attempt (success or failure) requires a matching audit entry.
  - Sensitive plaintext password fields must never be persisted in audit `details`.

## Relationships

- `PasswordChangeSubmission` is processed into one `PasswordChangeAttempt`.
- A successful `PasswordChangeAttempt` updates one `CredentialRecord`.
- A successful `PasswordChangeAttempt` invalidates many `SessionRecord` rows (excluding current session).
- A successful `PasswordChangeAttempt` creates at least one `SecurityNotification`.
- Every `PasswordChangeAttempt` creates one `SecurityAuditEntry`.
- `PasswordChangeThrottleState` is updated after each failed current-password attempt and consulted before processing new submissions.

## State Transitions

### PasswordChangeAttempt

1. `received` -> `temporarily_blocked` if active block exists.
2. `received` -> `incorrect_current_password` if credential verification fails.
3. `received` -> `policy_violation` if new password fails global rules or equals current password.
4. `received` -> `updated` when all checks pass and credential update commits.

### PasswordChangeThrottleState

1. `normal` -> `counting_failures` on first incorrect current-password attempt.
2. `counting_failures` -> `blocked` when failure count reaches 5 inside rolling 10-minute window.
3. `blocked` -> `normal` when `blockedUntil` expires.
