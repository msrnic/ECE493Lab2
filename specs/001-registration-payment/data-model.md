# Data Model: UC-17 Registration Payment

## Entity: RegistrationCheckoutSession

**Purpose**: Represents one attendee registration payment journey.

| Field | Type | Required | Notes |
|------|------|----------|------|
| `sessionId` | `string (UUID)` | Yes | Unique checkout session key used for idempotency scope |
| `attendeeId` | `string (UUID)` | Yes | Logged-in attendee identifier |
| `registrationStatus` | `enum(incomplete, complete)` | Yes | Set to `complete` only after approved payment |
| `completedAt` | `string (date-time) \| null` | No | Timestamp of registration completion |
| `createdAt` | `string (date-time)` | Yes | Session creation time |
| `updatedAt` | `string (date-time)` | Yes | Last mutation time |

Validation rules:
- `sessionId` and `attendeeId` must be valid UUIDs.
- `registrationStatus` transitions only from `incomplete` to `complete`.
- A completed session cannot accept new payment attempts.

State transitions:
- `incomplete` -> `complete` only when a linked `PaymentAttempt` final outcome is `approved`.

## Entity: PaymentAttempt

**Purpose**: Captures one tokenized payment submission and outcome.

| Field | Type | Required | Notes |
|------|------|----------|------|
| `attemptId` | `string (UUID)` | Yes | Unique attempt identifier |
| `sessionId` | `string (UUID)` | Yes | FK to `RegistrationCheckoutSession.sessionId` |
| `idempotencyKey` | `string` | Yes | Client-provided dedupe key, unique per session |
| `paymentToken` | `string` | Yes | Gateway token/reference only; no raw card data |
| `gatewayReference` | `string \| null` | No | Gateway-side transaction identifier |
| `outcome` | `enum(processing, approved, declined, pending)` | Yes | Current attempt status |
| `declineReasonCode` | `string \| null` | No | Populated only for declined outcomes |
| `isIdempotentReplay` | `boolean` | Yes | True when returned from dedupe lookup |
| `submittedAt` | `string (date-time)` | Yes | Initial submit timestamp |
| `finalizedAt` | `string (date-time) \| null` | No | Set for final approved/declined outcomes |

Validation rules:
- `paymentToken` must match gateway token format (for example `tok_...`) and must not contain
  raw PAN/CVV data.
- `idempotencyKey` must be 8 to 128 chars and unique within `sessionId`.
- `declineReasonCode` is required when `outcome=declined`.
- `finalizedAt` is required when `outcome` is `approved` or `declined`.

State transitions:
- `processing` -> `approved`
- `processing` -> `declined`
- `processing` -> `pending`
- `pending` -> `approved`
- `pending` -> `declined`

## Entity: RetryPolicyState

**Purpose**: Tracks retry eligibility and cooldown windows per checkout session.

| Field | Type | Required | Notes |
|------|------|----------|------|
| `sessionId` | `string (UUID)` | Yes | FK to checkout session |
| `declinedAttemptTimestamps` | `array<date-time>` | Yes | Declines in rolling 15-minute window |
| `retriesRemaining` | `integer` | Yes | Derived from max 5 retries per window |
| `cooldownUntil` | `string (date-time) \| null` | No | Set after 5th declined retry in 15 minutes |
| `retryAllowed` | `boolean` | Yes | False during pending reconciliation or cooldown |

Validation rules:
- Keep only decline timestamps within now minus 15 minutes.
- If 5 declines exist in-window, set `cooldownUntil=last_decline+15 minutes`.
- If any attempt is unresolved `pending`, set `retryAllowed=false` until final outcome exists.

State transitions:
- `open` -> `open` (decline count < 5 and no cooldown)
- `open` -> `cooldown` (5th declined retry in 15-minute window)
- `cooldown` -> `open` (current time >= `cooldownUntil`)

## Entity: ReconciliationEvent

**Purpose**: Audits pending-attempt resolution events from webhook or polling.

| Field | Type | Required | Notes |
|------|------|----------|------|
| `eventId` | `string` | Yes | Gateway event identifier |
| `attemptId` | `string (UUID)` | Yes | FK to payment attempt |
| `source` | `enum(webhook, poll)` | Yes | How the event was received |
| `resolvedOutcome` | `enum(approved, declined)` | Yes | Final result applied to attempt |
| `receivedAt` | `string (date-time)` | Yes | Event ingestion timestamp |

Validation rules:
- One `eventId` processes once (idempotent webhook handling).
- `resolvedOutcome` must be final and cannot be `pending`.

## Relationships

- `RegistrationCheckoutSession` 1 -> N `PaymentAttempt`
- `RegistrationCheckoutSession` 1 -> 1 `RetryPolicyState`
- `PaymentAttempt` 1 -> N `ReconciliationEvent`

## Invariants

- Registration completion is impossible unless at least one linked `PaymentAttempt.outcome` is
  final `approved`.
- Declined or pending attempts never move `registrationStatus` to `complete`.
- Duplicate submissions with same `sessionId + idempotencyKey` return the same `PaymentAttempt`
  result and never create a second charge.
