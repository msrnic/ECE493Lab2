# Data Model: Public User Registration (UC-01)

## Entity: RegistrationSubmission

- Description: Incoming registration payload received by the registration controller.
- Fields:
- `fullName` (string, required, 1-120 chars, trimmed)
- `email` (string, required, RFC-style format, canonicalized to lowercase)
- `password` (string, required, min 12 chars, must include uppercase/lowercase/number/symbol)
- `idempotencyKey` (string, required, generated client-side via Web Crypto API)
- `submittedAt` (datetime, server generated)
- Validation rules:
- Reject if any required field is missing.
- Reject if password policy fails (FR-012).
- Reject if duplicate email exists (FR-009).
- Reject if throttling limit exceeded for email (FR-010).

## Entity: UserAccount

- Description: Persisted account record created after valid registration.
- Fields:
- `accountId` (UUID/string, primary identifier)
- `fullName` (string, required)
- `email` (string, required, unique, canonicalized)
- `passwordHash` (string, required, non-reversible)
- `status` (enum: `pending`, `active`)
- `createdAt` (datetime)
- `updatedAt` (datetime)
- `activatedAt` (datetime, nullable)
- Validation rules:
- `email` must be unique across all accounts.
- `status` starts as `pending` and transitions only by confirmation flow.
- State transitions:
- `pending -> active` when confirmation token is valid and unconsumed (FR-011).

## Entity: ConfirmationToken

- Description: One-time token proving email ownership for account activation.
- Fields:
- `tokenId` (UUID/string)
- `accountId` (foreign key to `UserAccount.accountId`)
- `tokenHash` (string, required)
- `expiresAt` (datetime, required)
- `consumedAt` (datetime, nullable)
- `createdAt` (datetime)
- Validation rules:
- Token must not be expired.
- Token must not already be consumed.
- Token must map to a `pending` account.

## Entity: RegistrationAttempt

- Description: Per-email attempt audit for throttling.
- Fields:
- `attemptId` (UUID/string)
- `email` (string, canonicalized)
- `attemptedAt` (datetime)
- `outcome` (enum: `accepted`, `validation_error`, `duplicate_email`, `throttled`)
- Validation rules:
- Keep timestamps needed to compute rolling 10-minute window.
- Block attempts when 5 prior attempts exist in current rolling window.

## Entity: EmailOutboxJob

- Description: Pending or completed confirmation-email delivery job.
- Fields:
- `jobId` (UUID/string)
- `accountId` (foreign key to `UserAccount.accountId`)
- `template` (enum: `registration_confirmation`)
- `status` (enum: `queued`, `sent`, `retry_pending`, `failed_permanent`)
- `attemptCount` (integer, >= 0)
- `nextAttemptAt` (datetime, nullable)
- `lastError` (string, nullable)
- `createdAt` (datetime)
- `updatedAt` (datetime)
- Validation rules:
- Successful send sets `status=sent`.
- Temporary send failure sets `status=retry_pending` with scheduled `nextAttemptAt` (FR-008).

## Entity: ValidationError (View Model)

- Description: User-facing validation feedback returned by controllers.
- Fields:
- `field` (string)
- `code` (string)
- `message` (string)

## Relationships

- `UserAccount` 1 -> many `ConfirmationToken`
- `UserAccount` 1 -> many `EmailOutboxJob`
- `UserAccount.email` 1 -> many `RegistrationAttempt`
- `RegistrationSubmission` creates one `UserAccount` on success

## State Transition Summary

### UserAccount

- `pending` on successful registration creation
- `active` after successful confirmation token consumption

### EmailOutboxJob

- `queued -> sent` when first delivery succeeds
- `queued -> retry_pending` when delivery temporarily fails
- `retry_pending -> sent` when retry succeeds
- `retry_pending -> failed_permanent` after max retry policy is exhausted
