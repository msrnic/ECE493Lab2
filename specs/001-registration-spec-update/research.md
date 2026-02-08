# Research: User Registration Requirement Clarifications (UC-01)

## Scope

- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-01.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-01-AS.md`
- Constitution constraints applied: HTML/CSS/JavaScript stack, MVC separation, explicit UC/AS traceability, 100% coverage target with 95% exception floor

## Decision 1: Endpoint set for all user actions

- **Decision**: Use four endpoints: `GET /register`, `POST /api/v1/registrations`, `POST /api/v1/registrations/confirm`, and `POST /api/v1/registrations/resend-confirmation`.
- **Rationale**: Covers every user-facing action in the specification, including the FR-016 recovery path to request a new confirmation email after terminal delivery failure or token expiry.
- **Alternatives considered**: Only two endpoints (rejected because resend/recovery behavior would be implicit and untestable), GraphQL mutation set (rejected to keep UC-01 flow traceability straightforward).

## Decision 2: Safe re-submission strategy for interrupted network flows

- **Decision**: Treat `Idempotency-Key` plus normalized request payload as a submission intent and return the original final outcome for repeated submissions within 15 minutes.
- **Rationale**: Makes FR-013 deterministic and prevents duplicate account creation when users retry after connection loss.
- **Alternatives considered**: Time-window-only duplicate suppression without a request key (rejected due to ambiguity when users edit values), client-only retry tracking (rejected because server must guarantee safety).

## Decision 3: Validation error contract for missing vs invalid inputs

- **Decision**: Standardize field-level error items with `field`, `errorType` (`missing` or `invalid`), `code`, and `message`, returning all failing fields in one response.
- **Rationale**: Directly satisfies FR-003/FR-006 and supports multi-step correction where one field is fixed while others still fail.
- **Alternatives considered**: Single generic validation message (rejected due to low correction guidance), first-error-only response (rejected because it forces repeated blind retries).

## Decision 4: Email retry reliability policy

- **Decision**: Apply initial send + retries at +1, +5, +15, and +30 minutes; terminal failure is entered after all retries are exhausted.
- **Rationale**: Quantifies FR-008 and FR-023 reliability expectations with measurable cadence and maximum attempts.
- **Alternatives considered**: Fixed short retries only (rejected due to weaker delivery resilience), infinite retries (rejected because terminal state and recovery path are required).

## Decision 5: Temporary block semantics and feedback requirements

- **Decision**: Enforce 5 attempts per email in rolling 10 minutes; block additional attempts for a non-extending 15-minute interval and include reason, remaining time, and exact unblock timestamp in user feedback.
- **Rationale**: Resolves FR-010/CHK006/CHK028 ambiguity and yields deterministic behavior for both users and tests.
- **Alternatives considered**: Extending block on each blocked retry (rejected because it creates opaque user experience), IP-based throttling only (rejected because requirement is explicitly per email).

## Decision 6: Source of truth and concurrency handling for duplicate emails

- **Decision**: Canonicalize email values (`trim` + lowercase) and enforce uniqueness against canonical account records where both `pending` and `active` reserve the address.
- **Rationale**: Satisfies FR-009/CHK026 and prevents concurrent same-email races from creating multiple accounts.
- **Alternatives considered**: Case-sensitive comparison (rejected due to bypass risk), excluding pending accounts from uniqueness checks (rejected because it conflicts with pending-on-create semantics).

## Decision 7: Confirmation token exception handling and state transitions

- **Decision**: Only valid, unexpired, unused tokens can transition `pending` to `active`; invalid, expired, and reused tokens return distinct error codes with explicit recovery guidance.
- **Rationale**: Resolves CHK015/CHK029 and keeps account activation rules unambiguous and testable.
- **Alternatives considered**: Soft-accepting reused tokens (rejected due to ambiguous activation semantics), auto-activating on resend without token use (rejected because confirmation proof would be bypassed).

## Decision 8: Recovery behavior after retry exhaustion

- **Decision**: Keep account `pending`, mark email delivery in terminal-failure state, and expose resend-confirmation flow that issues a fresh token and delivery job.
- **Rationale**: Meets FR-016 and avoids dead-end registrations when dependency outages persist.
- **Alternatives considered**: Automatically deleting pending accounts (rejected because user completed valid submission), forcing support-only manual recovery (rejected due to poor user experience and non-self-service flow).

## Decision 9: Performance measurement boundaries

- **Decision**: Measure submission responsiveness from user submit action to visible outcome message; separately measure dispatch window from accepted submission to send/retry-queue creation.
- **Rationale**: Clarifies SC-005 start/end points (CHK013, CHK024) and makes thresholds auditable.
- **Alternatives considered**: Measuring only server processing time (rejected because success criteria are user-outcome oriented), measuring full email delivery latency for responsiveness (rejected because third-party delivery time is outside immediate registration responsiveness).

## Decision 10: Coverage and regression verification strategy

- **Decision**: Treat `UC-01-AS` as immutable baseline and add supplemental scenarios for retry cadence, throttling feedback details, token exception flows, and safe re-submission; enforce line-coverage reporting with remediation plans for uncovered lines.
- **Rationale**: Aligns with constitution principles II, IV, and V while proving newly clarified requirements.
- **Alternatives considered**: Acceptance-only baseline with no supplemental tests (rejected because clarified edge behavior would be under-verified), reduced coverage target by default (rejected by constitution).

## Clarification Closure

- Remaining `NEEDS CLARIFICATION` items in technical context: None.
