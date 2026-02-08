# Feature Specification: User Registration Requirement Clarifications

**Feature Branch**: `001-registration-spec-update`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Update 001-user-registration specification by resolving requirement gaps and ambiguities for confirmation email content, retry behavior, timing thresholds, throttling feedback, validation structure, account-state transitions, and measurable success criteria."

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-01]
- **Source Use Case Files**: [`Use Cases/UC-01.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-01-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope registration behavior; below 95% requires approved exception.
- **Traceability Commitment**: Every scenario and requirement below maps to UC-01 and UC-01-AS, including precondition and exception handling derived from UC-01 constraints.
- **Use Case Reconciliation**: UC-01 success-end wording ("created and activated") is treated as an eventual outcome. This specification defines a two-phase flow: submission success creates a `pending` account, and activation occurs only after successful email confirmation.

## Preconditions

- Primary precondition: The user is not authenticated.
- Alternate precondition handling: If the user is already authenticated and tries to open registration, the system must direct them away from registration and explain next steps.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Submit Registration Request (Priority: P1)

As a public user, I can submit required registration details and receive immediate feedback on whether my request was accepted.

**Mapped Use Case(s)**: [UC-01]
**Mapped Acceptance Suite(s)**: [UC-01-AS]

**Why this priority**: This is the required first step for account onboarding and unlocks all downstream behavior.

**Independent Test**: Execute registration with valid details, missing details, invalid details, duplicate email, and repeated submissions after a network interruption.

**Acceptance Scenarios**:

1. **Given** a logged-out user with valid required details, **When** registration is submitted, **Then** exactly one `pending` account is created and the user sees confirmation that email verification is required.
2. **Given** one or more required fields are blank, **When** registration is submitted, **Then** the system returns field-level `missing` errors and no account is created.
3. **Given** required fields are present but format or policy checks fail, **When** registration is submitted, **Then** the system returns field-level `invalid` errors and no account is created.
4. **Given** the user is already authenticated, **When** registration is requested, **Then** registration is not shown, no registration attempt is recorded, and the user is guided to proceed to account/dashboard actions.
5. **Given** two valid submissions with the same email arrive concurrently, **When** both are processed, **Then** one request creates the `pending` account and all others are rejected as duplicate-email attempts.
6. **Given** the user submits and then loses network connectivity before seeing the outcome, **When** the same details are re-submitted within 15 minutes, **Then** the system returns the original final outcome and does not create an additional account.

---

### User Story 2 - Confirm Account Email (Priority: P2)

As a newly registered user, I can confirm my email through a secure link so my account becomes active.

**Mapped Use Case(s)**: [UC-01]
**Mapped Acceptance Suite(s)**: [UC-01-AS]

**Why this priority**: Activation is required before the account can be used for authenticated system access.

**Independent Test**: Execute confirmation with valid, invalid, expired, and previously used tokens.

**Acceptance Scenarios**:

1. **Given** a `pending` account with a valid, unused, unexpired confirmation token, **When** the user opens the confirmation link, **Then** the account transitions to `active` and the token becomes used.
2. **Given** an invalid token, **When** confirmation is attempted, **Then** the account remains `pending`, activation is blocked, and the user is told to request a new confirmation email.
3. **Given** an expired token, **When** confirmation is attempted, **Then** the account remains `pending`, activation is blocked, and the user is told the link expired with guidance to request a new one.
4. **Given** a reused token that was already consumed, **When** confirmation is attempted again, **Then** no new activation occurs and the user is guided to log in or request a new email if still pending.

---

### User Story 3 - Handle Delivery Failures and Throttling (Priority: P3)

As a registrant, I receive clear guidance when email delivery fails or when too many attempts trigger temporary throttling.

**Mapped Use Case(s)**: [UC-01]
**Mapped Acceptance Suite(s)**: [UC-01-AS]

**Why this priority**: Recovery and abuse-control behavior prevents dead-end registration outcomes and reduces support burden.

**Independent Test**: Force email-delivery failures and repeated submissions to verify retry cadence, terminal recovery state, and temporary block messaging.

**Acceptance Scenarios**:

1. **Given** registration is valid but initial email send fails, **When** delivery retries run, **Then** retries occur at defined intervals and the account stays `pending` until confirmation completes.
2. **Given** all delivery retries fail, **When** retry policy is exhausted, **Then** account state remains `pending`, delivery status becomes terminal failure, and the user receives recovery guidance to request a new confirmation email.
3. **Given** more than 5 registration attempts for one email in a rolling 10-minute window, **When** another attempt is made, **Then** attempts are blocked for 15 minutes and the message includes the unblock time and next steps.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas | Success Criteria ID(s) |
|----------------|----------------|-------------------------|--------------------|------------------------|
| FR-001 | UC-01 | UC-01-AS | Registration entry controls | SC-001 |
| FR-002 | UC-01 | UC-01-AS | Registration form and required fields | SC-001, SC-003 |
| FR-003 | UC-01 | UC-01-AS | Validation and error presentation | SC-003 |
| FR-004 | UC-01 | UC-01-AS | Account creation state management | SC-002 |
| FR-005 | UC-01 | UC-01-AS | Confirmation email content and guidance | SC-004 |
| FR-006 | UC-01 | UC-01-AS | Invalid submission rejection | SC-003 |
| FR-007 | UC-01 | UC-01-AS | Coverage evidence governance | SC-011 |
| FR-008 | UC-01 | UC-01-AS | Email retry policy and terminal state | SC-006 |
| FR-009 | UC-01 | UC-01-AS | Duplicate email rules and source of truth | SC-007 |
| FR-010 | UC-01 | UC-01-AS | Throttling and temporary block communication | SC-008 |
| FR-011 | UC-01 | UC-01-AS | Confirmation-state transitions | SC-009 |
| FR-012 | UC-01 | UC-01-AS | Password policy enforcement | SC-010 |
| FR-013 | UC-01 | UC-01-AS | Safe re-submission after interruption | SC-005 |
| FR-014 | UC-01 | UC-01-AS | Already-authenticated alternate flow | SC-001 |
| FR-015 | UC-01 | UC-01-AS | Invalid, expired, reused token exceptions | SC-009 |
| FR-016 | UC-01 | UC-01-AS | Exhausted retry recovery path | SC-006 |

### Edge Cases

- A user corrects one invalid field while other fields are still invalid: corrected fields remain accepted, and remaining invalid fields continue to show explicit errors.
- Duplicate-email submissions happen at the same time: one account can be created at most, and all other requests resolve as duplicate-email rejections.
- User resubmits after a network timeout and does not know whether the first request succeeded: no duplicate account may be created from safe re-submission.
- Registration is attempted while already authenticated: registration must not proceed and the user must receive alternate guidance.
- Confirmation token is invalid, expired, or reused: no activation occurs and clear recovery guidance is provided.
- Email delivery remains unavailable through all retry attempts: account stays pending and user is offered a path to request a new confirmation email.
- Temporary block expires while the user keeps the page open: next attempt after expiry succeeds only if standard validation passes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-01 / UC-01-AS)**: System MUST provide a registration option only to non-authenticated users.
- **FR-002 (UC-01 / UC-01-AS)**: System MUST present a registration form that requires exactly these fields: full name, unique email address, and password.
- **FR-003 (UC-01 / UC-01-AS)**: System MUST return field-level validation errors for each failing field using explicit error type labels `missing` or `invalid`, with user-facing messages that identify the field and correction needed.
- **FR-004 (UC-01 / UC-01-AS)**: For a valid submission, System MUST create exactly one account record in `pending` status and MUST NOT set `active` status before confirmation.
- **FR-005 (UC-01 / UC-01-AS)**: Confirmation email content MUST include: recipient greeting by name, a one-time confirmation link carrying the confirmation token, link-expiration duration, and user guidance for "did not request", "link expired", and "need a new email" outcomes.
- **FR-006 (UC-01 / UC-01-AS)**: When submission data is missing or invalid, System MUST block account creation and return all field errors in one response so users can correct multiple fields without repeated blind retries.
- **FR-007 (UC-01 / UC-01-AS)**: System MUST produce coverage evidence for in-scope registration behavior and target 100% line coverage; below 95% requires approved exception.
- **FR-008 (UC-01 / UC-01-AS)**: If initial confirmation-email delivery fails after a valid registration, System MUST retry delivery at 1, 5, 15, and 30 minutes after the initial failure (four retries, five total attempts including initial send); if delivery succeeds, status returns to normal pending-confirmation flow.
- **FR-009 (UC-01 / UC-01-AS)**: Duplicate-email decisions MUST use the canonical user-account store as the source of truth, treating both `pending` and `active` accounts as reserved; for concurrent same-email submissions, one request may create an account and all others MUST be rejected as duplicates.
- **FR-010 (UC-01 / UC-01-AS)**: System MUST limit submissions to 5 attempts per email in a rolling 10-minute window; the 6th and later attempts during that window MUST be blocked for exactly 15 minutes from block start, without extending the block; block feedback MUST include reason, remaining time, exact unblock timestamp, and guidance to retry later.
- **FR-011 (UC-01 / UC-01-AS)**: Account activation state transitions MUST follow: `pending` -> `active` only when confirmation token is valid, unused, and unexpired; successful transition MUST consume the token so it cannot activate again.
- **FR-012 (UC-01 / UC-01-AS)**: Passwords MUST be at least 12 characters and include at least one uppercase letter, one lowercase letter, one number, and one symbol; non-compliant passwords MUST be rejected with rule-specific feedback.
- **FR-013 (UC-01 / UC-01-AS)**: For network interruptions where users may safely re-submit, System MUST ensure re-submitting identical registration details within 15 minutes returns the same final outcome and never creates a second account for that submission intent.
- **FR-014 (UC-01 / UC-01-AS)**: If an already-authenticated user attempts registration, System MUST deny registration entry, preserve the existing session, and present guidance to continue to account/dashboard or sign out first.
- **FR-015 (UC-01 / UC-01-AS)**: Confirmation attempts with invalid, expired, or reused tokens MUST leave account status unchanged and return explicit recovery guidance: invalid token -> request new email, expired token -> request replacement link, reused token -> log in if active or request new email if still pending.
- **FR-016 (UC-01 / UC-01-AS)**: When all FR-008 retries are exhausted without delivery, System MUST set email delivery status to terminal failure while keeping account `pending`, and MUST provide a user-visible recovery path to request a fresh confirmation email and token.

If a source requirement is ambiguous, implementation MUST pause and log a clarification request that cites exact `Use Cases/UC-01.md` and `Acceptance Tests/UC-01-AS.md` text.

### Key Entities *(include if feature involves data)*

- **Registration Submission Intent**: The user attempt identified by a single set of registration details and submission time window used for safe re-submission.
- **User Account**: Identity record with immutable email uniqueness and lifecycle states `pending` and `active`.
- **Confirmation Token**: One-time token tied to a `pending` account with attributes for issue time, expiry, and consumed state.
- **Registration Attempt Window**: Rolling 10-minute per-email window used to enforce throttling and temporary blocking.
- **Email Delivery Job**: Delivery tracking record containing send attempts, retry schedule, and terminal status.
- **Validation Error Item**: Field-specific feedback object with field name, error type (`missing` or `invalid`), and correction guidance.

### Assumptions

- The final required registration field set is full name, unique email address, and password.
- Confirmation link validity is 24 hours from issue time unless replaced by a newer token.
- System responsibility for initial confirmation dispatch is met when email send succeeds or retry is queued within 60 seconds of accepted registration.
- Pending accounts reserve email uniqueness the same as active accounts.

### Dependencies

- An email-delivery dependency exists and can return delivery success/failure signals; when unavailable, fallback behavior follows FR-008 and FR-016.
- A canonical account data source exists for uniqueness checks and includes all pending and active accounts.
- A trusted server time source exists to enforce retry cadence, token expiry, rolling windows, and unblock timestamps consistently.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scoped UC-01-AS baseline scenarios pass without scenario edits, including the precondition that registration is only available to logged-out users.
- **SC-002**: In 100% of valid registration submissions, exactly one account is created in `pending` status and no `active` account is created before email confirmation.
- **SC-003**: In 100% of invalid or incomplete submissions, no account is created and users receive field-level errors that distinguish `missing` versus `invalid` input.
- **SC-004**: In 100% of successful registration submissions, confirmation email records contain all required content elements from FR-005.
- **SC-005**: In at least 95% of successful registration attempts, the time from user submit action to on-screen submission outcome is 3 seconds or less; in 100% of accepted submissions, email send or retry-queue creation occurs within 60 seconds of submission acceptance.
- **SC-006**: In 100% of forced email-delivery failure tests, retry attempts occur at 1, 5, 15, and 30 minutes after initial failure; if all retries fail, account remains `pending`, terminal delivery failure is recorded, and a recovery path to request a new confirmation email is available.
- **SC-007**: In 100% of duplicate-email tests, including concurrent same-email submissions, at most one account is created and all other attempts return duplicate-email guidance.
- **SC-008**: In 100% of tests exceeding 5 attempts per email within a rolling 10-minute window, attempts are blocked for exactly 15 minutes and block feedback includes reason, remaining time, and exact unblock timestamp.
- **SC-009**: In 100% of confirmation tests, valid unused unexpired tokens activate pending accounts exactly once; invalid, expired, and reused tokens never activate an account and always return recovery guidance.
- **SC-010**: In 100% of password-policy tests, passwords violating any FR-012 rule are rejected with feedback identifying each unmet rule.
- **SC-011**: Coverage evidence for in-scope registration behavior is produced for every release candidate and reports 100% line coverage unless an approved exception is documented; coverage below 95% is never accepted without approved exception.
