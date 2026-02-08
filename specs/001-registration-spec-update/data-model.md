# Data Model: User Registration Requirement Clarifications (UC-01)

## Entity: RegistrationSubmissionIntent

- Description: Canonical record for a user registration submission intent used to ensure safe re-submission outcomes after network interruption.
- Fields:
- `intentId` (UUID/string, primary key)
- `idempotencyKey` (string, required, unique within retention window)
- `requestHash` (string, required, normalized payload hash)
- `fullName` (string, required, 1-120 chars after trim)
- `email` (string, required, canonicalized to lowercase)
- `submittedAt` (datetime, required)
- `expiresAt` (datetime, required, 15 minutes after `submittedAt`)
- `finalOutcome` (enum: `accepted_pending`, `validation_error`, `duplicate_email`, `throttled`)
- `outcomeReferenceId` (string, nullable; points to created account or error record)
- Validation rules:
- Same `idempotencyKey` + same `requestHash` within validity window must return stored `finalOutcome`.
- Different payload with same `idempotencyKey` must be rejected as idempotency misuse.

## Entity: UserAccount

- Description: Persistent account created by valid registration and activated only by confirmed token.
- Fields:
- `accountId` (UUID/string, primary key)
- `fullName` (string, required)
- `email` (string, required, canonicalized, unique)
- `passwordHash` (string, required)
- `status` (enum: `pending`, `active`)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- `activatedAt` (datetime, nullable)
- Validation rules:
- `email` must be unique across both `pending` and `active` records.
- `status` can only transition from `pending` to `active` via valid token confirmation.

## Entity: ConfirmationToken

- Description: One-time token proving control of the email address for account activation.
- Fields:
- `tokenId` (UUID/string, primary key)
- `accountId` (foreign key -> `UserAccount.accountId`, required)
- `tokenHash` (string, required)
- `issuedAt` (datetime, required)
- `expiresAt` (datetime, required, 24 hours after issue)
- `consumedAt` (datetime, nullable)
- `replacedByTokenId` (UUID/string, nullable)
- Validation rules:
- Token is valid only if unexpired and `consumedAt` is null.
- Replaced tokens cannot be used for activation.

## Entity: RegistrationAttempt

- Description: Per-email audit trail used for throttling calculations and abuse controls.
- Fields:
- `attemptId` (UUID/string, primary key)
- `email` (string, required, canonicalized)
- `attemptedAt` (datetime, required)
- `outcome` (enum: `accepted`, `validation_error`, `duplicate_email`, `throttled`)
- Validation rules:
- Attempts are counted in a rolling 10-minute window per canonical email.
- More than 5 attempts in the window triggers a temporary block.

## Entity: RegistrationBlock

- Description: Temporary block state for an email that exceeded allowed attempt rate.
- Fields:
- `blockId` (UUID/string, primary key)
- `email` (string, required, canonicalized)
- `blockStartedAt` (datetime, required)
- `unblockAt` (datetime, required, exactly 15 minutes after start)
- `reason` (enum: `attempt_limit_exceeded`)
- Validation rules:
- Block duration is fixed and non-extending.
- Attempts during active block return throttling guidance including `unblockAt`.

## Entity: EmailOutboxJob

- Description: Delivery tracking record for confirmation email sending and retry cadence.
- Fields:
- `jobId` (UUID/string, primary key)
- `accountId` (foreign key -> `UserAccount.accountId`, required)
- `tokenId` (foreign key -> `ConfirmationToken.tokenId`, required)
- `status` (enum: `queued`, `sent`, `retry_pending`, `failed_terminal`)
- `attemptCount` (integer, required, range 0-5)
- `nextAttemptAt` (datetime, nullable)
- `lastAttemptAt` (datetime, nullable)
- `lastErrorCode` (string, nullable)
- `createdAt` (datetime, required)
- `updatedAt` (datetime, required)
- Validation rules:
- Retry cadence uses +1, +5, +15, +30 minutes after initial failure.
- After attempt 5 fails, `status` becomes `failed_terminal` and no automatic retries remain.

## Entity: ValidationErrorItem (View Model)

- Description: Structured field-level feedback returned to clients when registration validation fails.
- Fields:
- `field` (string, required)
- `errorType` (enum: `missing`, `invalid`)
- `code` (string, required)
- `message` (string, required)
- Validation rules:
- Every invalid input field must have one item.
- Response must include all failing fields in a single submission response.

## Relationships

- `RegistrationSubmissionIntent` may reference one `UserAccount` when accepted.
- `UserAccount` 1 -> many `ConfirmationToken`.
- `UserAccount` 1 -> many `EmailOutboxJob`.
- `UserAccount.email` 1 -> many `RegistrationAttempt`.
- `RegistrationBlock.email` is keyed to the same canonical value tracked by `RegistrationAttempt`.

## State Transition Summary

### UserAccount

- `pending` (created after valid registration)
- `active` (only after valid, unused, unexpired token confirmation)

### ConfirmationToken

- `issued` (valid for confirmation)
- `consumed` (used once; cannot be reused)
- `expired` (time exceeded; cannot activate)
- `replaced` (superseded by resend flow; cannot activate)

### EmailOutboxJob

- `queued -> sent` (successful initial send)
- `queued -> retry_pending` (initial send failed)
- `retry_pending -> sent` (retry success)
- `retry_pending -> failed_terminal` (all retries exhausted)

### RegistrationBlock

- `active` from `blockStartedAt` through `unblockAt`
- `expired` after `unblockAt` without extending duration
