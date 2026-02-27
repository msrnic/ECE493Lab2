# Data Model: User Login Access (UC-02)

## Scope Mapping

- Use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-02.md`
- Acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-02-AS.md`
- Feature requirements: FR-001 through FR-010 in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md`

## Entities

### 1. UserAccount (Model)

- Purpose: Represents registered user credentials and eligibility for authentication.
- Fields:
  - `id` (string, required, immutable)
  - `email` (string, required, unique, normalized lowercase)
  - `passwordHash` (string, required)
  - `status` (enum: `ACTIVE`, `DISABLED`; default `ACTIVE`)
- Validation rules:
  - `email` must be syntactically valid and normalized before lookup.
  - `passwordHash` must be present for accounts in `ACTIVE` state.
- Relationships:
  - One `UserAccount` can own many `LoginAttemptResult` records.
  - One `UserAccount` can have zero or one active `AuthenticationSession`.

### 2. CredentialSubmission (Model)

- Purpose: Captures user-provided credentials for each login attempt.
- Fields:
  - `email` (string, required)
  - `password` (string, required)
  - `submittedAt` (ISO timestamp, required)
- Validation rules:
  - `email` and `password` cannot be blank.
  - `email` is trimmed and lowercased before authentication.
- Relationships:
  - Each submission produces one `LoginAttemptResult`.

### 3. FailedLoginTracker (Model)

- Purpose: Enforces FR-008 and FR-010 for account-level throttle/lockout.
- Fields:
  - `email` (string, required, normalized key)
  - `failedCount` (integer, default `0`)
  - `firstFailedAt` (ISO timestamp, nullable)
  - `lastFailedAt` (ISO timestamp, nullable)
  - `blockedUntil` (ISO timestamp, nullable)
- Validation rules:
  - `failedCount` increments only after invalid credentials.
  - `blockedUntil` is set when `failedCount` reaches 5.
  - On successful login, `failedCount` resets to `0` and `blockedUntil` clears immediately.
- Relationships:
  - One tracker entry corresponds to one normalized account email.

### 4. AuthenticationSession (Model)

- Purpose: Represents current authenticated state for dashboard access.
- Fields:
  - `sessionId` (string, required, unique)
  - `userId` (string, required, foreign key to `UserAccount.id`)
  - `createdAt` (ISO timestamp, required)
  - `expiresAt` (ISO timestamp, required)
  - `authenticated` (boolean, required, default `true`)
- Validation rules:
  - Session is valid only while current time is before `expiresAt`.
  - Session must be tied to an `ACTIVE` user account.
- Relationships:
  - Each session belongs to one `UserAccount`.

### 5. LoginAttemptResult (Model)

- Purpose: Stores normalized outcome used by controllers and tests.
- Fields:
  - `attemptId` (string, required)
  - `email` (string, required, normalized)
  - `outcome` (enum: `SUCCESS`, `INVALID_CREDENTIALS`, `TEMP_BLOCKED`)
  - `message` (string, required)
  - `failedCountAfterAttempt` (integer, required)
  - `blockedUntil` (ISO timestamp, nullable)
  - `createdAt` (ISO timestamp, required)
- Validation rules:
  - `message` for invalid credentials must equal `Invalid email or password.`
  - `TEMP_BLOCKED` requires non-null `blockedUntil`.
- Relationships:
  - Many results can map to one `UserAccount` and one `FailedLoginTracker` record.

## State Transitions

### FailedLoginTracker Transition Rules

1. `CLEAR` (`failedCount=0`, no block) -> `COUNTING`
- Trigger: invalid credentials.
- Effect: `failedCount` increments to `1`.

2. `COUNTING` -> `COUNTING`
- Trigger: additional invalid credentials with `failedCount < 5`.
- Effect: increment counter and update `lastFailedAt`.

3. `COUNTING` -> `BLOCKED`
- Trigger: invalid credentials when `failedCount` reaches `5`.
- Effect: set `blockedUntil = now + 10 minutes`.

4. `BLOCKED` -> `BLOCKED`
- Trigger: login attempted before `blockedUntil`.
- Effect: reject with `TEMP_BLOCKED`; counter unchanged.

5. `COUNTING` or `BLOCKED` -> `CLEAR`
- Trigger: successful authentication.
- Effect: reset `failedCount` to `0`; clear block timestamps.

### AuthenticationSession Transition Rules

1. `LOGGED_OUT` -> `AUTHENTICATED`
- Trigger: valid credentials and no active block.
- Effect: create session and grant dashboard access.

2. `AUTHENTICATED` -> `AUTHENTICATED`
- Trigger: navigation after login while session valid.
- Effect: preserve dashboard access.

3. `AUTHENTICATED` -> `LOGGED_OUT`
- Trigger: logout, expiration, or invalidation.
- Effect: remove/expire session.
