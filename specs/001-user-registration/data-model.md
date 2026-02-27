# Data Model: Public User Registration

## Context

- Spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`
- Use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-01.md`
- Acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-01-AS.md`

## Entities

### 1) RegistrationSubmission (request model, non-persistent)

| Field | Type | Required | Rules |
|---|---|---|---|
| fullName | string | yes | 1-120 chars after trim |
| email | string | yes | Valid email format, normalized (`trim().toLowerCase()`) |
| password | string | yes | Min 12 chars, >=1 uppercase, >=1 lowercase, >=1 number, >=1 symbol |
| confirmPassword | string | yes | Must equal `password` |

### 2) UserAccount (persistent)

| Field | Type | Required | Rules |
|---|---|---|---|
| id | uuid | yes | Primary key |
| full_name | string | yes | 1-120 chars |
| email_normalized | string | yes | Unique index |
| password_hash | string | yes | Strong one-way hash output |
| status | enum(`pending`,`active`) | yes | Default `pending` |
| created_at | datetime | yes | Server-generated |
| activated_at | datetime \| null | no | Set only when status changes to `active` |

### 3) EmailConfirmationToken (persistent)

| Field | Type | Required | Rules |
|---|---|---|---|
| id | uuid | yes | Primary key |
| user_account_id | uuid | yes | FK -> `UserAccount.id` |
| token_hash | string | yes | Store hash, never plaintext token |
| expires_at | datetime | yes | Time-bounded validity |
| consumed_at | datetime \| null | no | Null until successful confirmation |
| created_at | datetime | yes | Server-generated |

### 4) RegistrationAttempt (persistent)

| Field | Type | Required | Rules |
|---|---|---|---|
| id | uuid | yes | Primary key |
| email_normalized | string | yes | Indexed for rolling-window lookup |
| attempted_at | datetime | yes | Server-generated |
| outcome | enum(`validation_failed`,`duplicate_email`,`throttled`,`created_pending`) | yes | Auditable attempt reason |
| block_until | datetime \| null | no | Set when throttle exceeded |

### 5) EmailDeliveryJob (persistent)

| Field | Type | Required | Rules |
|---|---|---|---|
| id | uuid | yes | Primary key |
| user_account_id | uuid | yes | FK -> `UserAccount.id` |
| template | string | yes | `registration_confirmation` |
| status | enum(`queued`,`sent`,`queued_retry`,`failed_terminal`) | yes | Retry-aware state |
| attempt_count | integer | yes | Starts at 0 |
| next_attempt_at | datetime | yes | Immediate on first send; backoff for retries |
| last_error | string \| null | no | Diagnostic message for failures |
| created_at | datetime | yes | Server-generated |
| updated_at | datetime | yes | Server-generated |

### 6) ValidationError (response model, non-persistent)

| Field | Type | Required | Rules |
|---|---|---|---|
| field | string | yes | `fullName`, `email`, `password`, `confirmPassword`, or `global` |
| code | string | yes | Stable code, e.g. `REQUIRED`, `INVALID_FORMAT`, `EMAIL_EXISTS` |
| message | string | yes | User-facing text |

## Relationships

- `UserAccount (1) -> (0..1) EmailConfirmationToken` (active token during pending state).
- `UserAccount (1) -> (0..n) EmailDeliveryJob` (initial send plus retries).
- `UserAccount.email_normalized` links logically to many `RegistrationAttempt` records for throttling windows.

## Validation Rules Mapped to Requirements

- FR-003/FR-006: Required fields and format validation run before account creation.
- FR-009: Duplicate `email_normalized` blocks creation with explicit duplicate-email error.
- FR-010: More than 5 attempts for same normalized email in rolling 10 minutes returns temporary block and does not create account.
- FR-012: Password policy enforced exactly (length + uppercase + lowercase + number + symbol).

## State Transitions

### UserAccount.status

- `pending -> active`: Successful email confirmation token validation (FR-011).
- `pending -> pending`: Initial confirmation email delivery fails; retry job queued (FR-008).
- `active -> active`: Any repeated/late confirmation attempts after activation are idempotent no-op.

### EmailDeliveryJob.status

- `queued -> sent`: Provider accepts delivery.
- `queued -> queued_retry`: Initial attempt failed and retry scheduled.
- `queued_retry -> sent`: Retry succeeds.
- `queued_retry -> failed_terminal`: Retry budget exhausted.

### RegistrationAttempt throttle state

- Within limit: attempts recorded, `block_until = null`.
- Exceeds limit: new attempt recorded as `throttled` and `block_until` set (10-minute temporary block window).
