# Feature Specification: Registration Payment Flow

**Feature Branch**: `001-registration-payment`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. Attendee enters payment details 2. System
processes payment 3. Payment is approved 4. System confirms registration Extensions: * **2a**:
Payment declined * **2a1**: System prompts retry"

## Clarifications

### Session 2026-02-08

- Q: What is the required payment-data handling model for this feature? → A: Use
  hosted/tokenized gateway collection; this system stores only token, outcome, and registration
  status (no raw card data).
- Q: How should duplicate submissions be handled (e.g., double-click or network retry for the
  same registration)? → A: Enforce idempotency per registration checkout session; duplicate
  submissions return the original attempt result and never create a second charge/confirmation.
- Q: When the gateway times out or returns an unknown result, what should the system do before
  allowing retry? → A: Mark attempt as pending, reconcile via gateway callback/poll, and only
  then allow or block retry based on final outcome.
- Q: What retry policy should apply after declined payments for the same registration session? →
  A: Allow up to 5 retries within 15 minutes, then enforce a 15-minute cooldown before more
  attempts.
- Q: What compliance requirement should be explicitly enforced for this payment flow? → A:
  Require PCI DSS SAQ A scope only: no raw cardholder data stored, processed, or transmitted by
  this system.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-17]
- **Source Use Case Files**: [`Use Cases/UC-17.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-17-AS.md`]
- **Coverage Target**: 100% coverage evidence for in-scope payment-registration behavior; below
  95% requires approved exception.
- **Traceability Commitment**: Every scenario and requirement below maps to UC-17 and UC-17-AS.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Registration Payment (Priority: P1)

As an attendee, I can submit valid payment details and receive confirmation with non-pending
submit-to-outcome latency meeting NFR-001 (<=2s p95) so my conference registration is completed.

**Mapped Use Case(s)**: [UC-17]
**Mapped Acceptance Suite(s)**: [UC-17-AS]

**Why this priority**: This is the primary value path; without successful payment and
confirmation, attendee registration remains incomplete.

**Independent Test**: Execute UC-17-AS with valid payment details; confirm payment approval and
registration confirmation in one end-to-end flow.

**Acceptance Scenarios**:

1. **Given** the attendee is logged in and has selected payment, **When** valid payment details
   are submitted and approved, **Then** the system confirms registration completion.
2. **Given** valid payment details, **When** payment is processed successfully, **Then** the
   attendee receives an explicit approved/declined/pending outcome message with pending/decline
   feedback meeting NFR-002 (<=1s p95), and registration is marked complete after approval.

---

### User Story 2 - Retry After Decline (Priority: P2)

As an attendee, I can retry payment after a declined attempt so I still have a path to complete
registration.

**Mapped Use Case(s)**: [UC-17]
**Mapped Acceptance Suite(s)**: [UC-17-AS]

**Why this priority**: Declined payments are expected in real-world checkout flows; recovery
reduces abandoned registrations.

**Independent Test**: Execute UC-17-AS decline scenario; verify decline notification and retry
prompt are shown, then submit corrected payment details successfully.

**Acceptance Scenarios**:

1. **Given** payment is declined during processing, **When** the decline result is returned,
   **Then** the attendee is notified of the decline and prompted to retry.
2. **Given** the attendee is prompted to retry after a decline, **When** updated valid payment
   details are resubmitted, **Then** the system processes the new payment attempt and confirms
   registration after approval.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-17 | UC-17-AS | Payment entry and submission flow |
| FR-002 | UC-17 | UC-17-AS | Payment processing lifecycle |
| FR-003 | UC-17 | UC-17-AS | Approval handling and registration completion |
| FR-004 | UC-17 | UC-17-AS | Decline handling and user messaging |
| FR-005 | UC-17 | UC-17-AS | Retry initiation and reprocessing |
| FR-006 | UC-17 | UC-17-AS | Registration status integrity across attempts |
| FR-007 | UC-17 | UC-17-AS | Coverage evidence and exception handling |
| FR-008 | UC-17 | UC-17-AS | Idempotent handling for duplicate payment submissions |
| FR-009 | UC-17 | UC-17-AS | Pending outcome reconciliation before retry |
| FR-010 | UC-17 | UC-17-AS | Retry limit and cooldown enforcement |
| FR-011 | UC-17 | UC-17-AS | PCI DSS SAQ A scope compliance for payment handling |
| NFR-001 | UC-17 | UC-17-AS | `tests/acceptance/uc17-performance-protocol.md`, `tests/acceptance/uc17-performance-results.md` |
| NFR-002 | UC-17 | UC-17-AS | `tests/acceptance/uc17-performance-protocol.md`, `tests/acceptance/uc17-performance-results.md` |
| NFR-003 | UC-17 | UC-17-AS | `tests/acceptance/uc17-performance-results.md`, `specs/001-registration-payment/traceability.md` |

### Edge Cases

- Payment details are submitted in an invalid format; the system rejects the attempt and keeps
  registration incomplete.
- If no final gateway outcome is available within NFR-001 thresholds, the attempt is marked
  `pending`, the attendee receives a non-final message within NFR-002 thresholds, and retry is
  gated until reconciliation returns a final outcome.
- An attendee reaches 5 declined retries within 15 minutes for the same checkout session; the
  system enforces a 15-minute cooldown and blocks additional submissions until cooldown expiry.
- An attendee refreshes or revisits the payment step after approval; the system shows registration
  as already complete instead of requesting duplicate payment.
- An attendee submits the same payment action more than once for the same checkout session; the
  system treats duplicates idempotently and returns the original attempt result without a second
  charge or confirmation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-17 / UC-17-AS)**: System MUST allow a logged-in attendee to enter payment details
  after selecting the payment option, using hosted/tokenized gateway collection so this system
  never stores raw card data.
- **FR-002 (UC-17 / UC-17-AS)**: System MUST process submitted payment details and return an
  explicit outcome of approved, declined, or pending for each attempt.
- **FR-003 (UC-17 / UC-17-AS)**: When payment is approved, System MUST mark registration as
  complete and present a registration confirmation to the attendee.
- **FR-004 (UC-17 / UC-17-AS)**: When payment is declined, System MUST keep registration
  incomplete and notify the attendee that payment was declined.
- **FR-005 (UC-17 / UC-17-AS)**: After a declined payment, System MUST prompt the attendee to
  retry payment and allow submission of new payment details while retry policy limits have not
  been reached.
- **FR-006 (UC-17 / UC-17-AS)**: System MUST ensure only approved payment transitions registration
  to complete, and declined attempts MUST NOT create a completed registration state.
- **FR-008 (UC-17 / UC-17-AS)**: System MUST enforce idempotency for duplicate submissions within
  the same registration checkout session, returning the original attempt result and preventing
  duplicate charge or duplicate registration confirmation.
- **FR-009 (UC-17 / UC-17-AS)**: When gateway processing returns timeout or unknown, System MUST
  mark the attempt as `pending`, reconcile to a final approved/declined outcome via callback or
  polling, and only allow retry after reconciliation produces a final declined outcome.
- **FR-010 (UC-17 / UC-17-AS)**: System MUST enforce a retry policy of at most 5 declined retry
  attempts within any 15-minute window per registration checkout session, and MUST apply a
  15-minute cooldown that blocks additional submissions until expiry.
- **FR-011 (UC-17 / UC-17-AS)**: System MUST enforce PCI DSS SAQ A scope for this flow by
  ensuring raw cardholder data is not stored, processed, or transmitted by this system.
- **FR-007 (UC-17 / UC-17-AS)**: System MUST produce coverage evidence for in-scope
  payment-registration behavior, target 100%, and document remediation when below 100%; below 95%
  requires approved exception.

### Non-Functional Requirements

- **NFR-001 (UC-17 / UC-17-AS)**: Non-pending payment submit-to-outcome latency MUST be <=2s at
  p95.
- **NFR-002 (UC-17 / UC-17-AS)**: Pending/decline UI feedback latency MUST be <=1s at p95.
- **NFR-003 (UC-17 / UC-17-AS)**: Performance evidence MUST be recorded with measurement method
  and sample size.

If a source requirement is ambiguous, implementation MUST pause and log a clarification request
that cites exact `Use Cases/UC-17.md` and `Acceptance Tests/UC-17-AS.md` text.

### Key Entities *(include if feature involves data)*

- **Payment Attempt**: A single submission of attendee payment details and its processing outcome,
  storing only gateway token/reference, outcome, and attempt metadata (no raw card data).
- **Payment Outcome**: Result for an attempt (`approved`, `declined`, or `pending`) used to
  control the next user step and reconciliation behavior.
- **Registration Status**: Attendee registration state (`incomplete`, `complete`) driven by
  payment outcome.
- **Retry Prompt**: User-facing instruction that appears after decline and allows a new attempt.
- **Retry Policy State**: Per-checkout-session counters and timestamps used to enforce retry
  limits and cooldown windows.

### Assumptions

- A logged-in attendee has already reached the registration payment step before this flow begins.
- Payment outcomes may initially be approved, declined, or pending; pending outcomes are
  reconciled to a final approved/declined result.
- Registration is considered complete only after an approved payment outcome.
- The system can present clear outcome messaging immediately after each payment attempt.
- Retry policy is evaluated per registration checkout session.
- Compliance target for this feature is PCI DSS SAQ A only.

### Dependencies

- Availability of a payment processing capability that supports hosted/tokenized payment detail
  collection and returns approved/declined outcomes, plus callback or polling support for pending
  outcome reconciliation.
- Access to attendee registration records to update completion status.
- Capability to track per-session retry counters and cooldown window timestamps.
- Existing attendee-authenticated session context for reaching the payment step.
- Payment gateway and integration approach that supports PCI DSS SAQ A scoped handling.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of UC-17-AS acceptance scenarios pass exactly as written.
- **SC-002**: In acceptance testing, 100% of approved payment attempts result in confirmed,
  complete registration.
- **SC-003**: In acceptance testing, 100% of declined payment attempts leave registration
  incomplete and display a retry prompt.
- **SC-004**: At least 90% of attendees in usability testing can complete payment and receive
  registration confirmation in 2 minutes or less on the first successful attempt.
- **SC-005**: In 100% of tested retry flows within retry limits, attendees can submit a new
  payment attempt without losing their registration context.
- **SC-006**: In 100% of tested timeout/unknown-result flows, attempts enter `pending`, no retry
  is allowed before reconciliation, and final outcome handling follows approved/declined rules.
- **SC-007**: In 100% of tested limit-boundary flows, the 6th declined retry attempt inside 15
  minutes is blocked with cooldown messaging, and submissions are re-enabled exactly after the
  15-minute cooldown expires.
- **SC-008**: In compliance validation for this feature, 0 test cases show raw cardholder data
  stored, processed, or transmitted by this system.
- **SC-009**: 100% of previously passing acceptance suites for UC-01 through UC-16 remain passing
  after UC-17 changes.
