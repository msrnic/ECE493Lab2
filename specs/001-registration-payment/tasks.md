# Tasks: Registration Payment Flow

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-payment/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation and coverage evidence are required by `spec.md` (FR-007,
SC-001 through SC-009, and NFR-001 through NFR-003) and `plan.md`.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project structure, tooling, and traceability artifacts.

- [ ] T001 Create MVC source directories in `src/models/`, `src/controllers/`, `src/views/`, `src/assets/css/`, and `src/assets/js/` for UC-17 / UC-17-AS
- [ ] T002 Create testing directories in `tests/acceptance/`, `tests/unit/models/`, `tests/unit/controllers/`, `tests/integration/`, and `tests/coverage/` for UC-17 / UC-17-AS
- [ ] T003 Initialize Node.js project scripts for acceptance and coverage in `./package.json` for UC-17 / UC-17-AS
- [ ] T004 [P] Configure Vitest + coverage defaults in `./vitest.config.js` for UC-17 / UC-17-AS
- [ ] T005 [P] Add npm ignore/package metadata for generated coverage artifacts in `./.gitignore` for UC-17 / UC-17-AS
- [ ] T006 Create UC-17 traceability baseline linking FR-001 through FR-011 to code areas in `specs/001-registration-payment/traceability.md` for UC-17 / UC-17-AS
- [ ] T007 [P] Create acceptance evidence template for UC-17 outcomes in `tests/acceptance/uc17-evidence-template.md` for UC-17 / UC-17-AS

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared domain and integration foundations required by all stories.  
**⚠️ CRITICAL**: Complete this phase before user story work.

- [ ] T008 Implement shared payment input validation helpers (UUID, token, idempotency key) in `src/models/payment-validation.js` for UC-17 / UC-17-AS
- [ ] T009 [P] Implement shared persistence/repository interfaces for session, attempts, retry policy, and reconciliation in `src/models/payment-repository.js` for UC-17 / UC-17-AS
- [ ] T010 [P] Implement gateway client abstraction for tokenized submit/status lookup operations in `src/controllers/gateway-client.js` for UC-17 / UC-17-AS
- [ ] T011 Implement base `RegistrationCheckoutSession` domain model and allowed state transitions in `src/models/registration-session-model.js` for UC-17 / UC-17-AS
- [ ] T012 [P] Create controller routing bootstrap for registration payment endpoints in `src/controllers/payment-routes.js` for UC-17 / UC-17-AS
- [ ] T013 Define contract-to-controller mapping notes for all four OpenAPI endpoints in `specs/001-registration-payment/contracts/README.md` for UC-17 / UC-17-AS
- [ ] T014 Configure enforced minimum coverage threshold (95%) and 100% target reporting in `./vitest.config.js` for UC-17 / UC-17-AS

**Checkpoint**: Shared architecture and quality gates are ready; story implementation can begin.

---

## Phase 3: User Story 1 - Complete Registration Payment (Priority: P1) 🎯 MVP

**Goal**: Attendee submits valid payment details and receives immediate registration confirmation.  
**Independent Test**: Execute approved-flow scenarios in `Acceptance Tests/UC-17-AS.md`; verify registration transitions to `complete` and confirmation is rendered.

### Validation Tasks

- [ ] T015 [P] [US1] Encode UC-17 approved-path acceptance scenario in `tests/acceptance/uc17-registration-payment.acceptance.test.js` for UC-17 / UC-17-AS
- [ ] T016 [P] [US1] Add unit tests for approved payment attempt lifecycle transitions in `tests/unit/models/payment-attempt-model.test.js` for UC-17 / UC-17-AS
- [ ] T017 [P] [US1] Add unit tests for registration completion transition rules in `tests/unit/models/registration-session-model.test.js` for UC-17 / UC-17-AS
- [ ] T018 [US1] Prepare approved-path acceptance evidence template in `tests/acceptance/uc17-us1-results.md` for UC-17 / UC-17-AS

### Implementation Tasks

- [ ] T019 [P] [US1] Implement `PaymentAttempt` model for processing/approved outcomes and replay metadata in `src/models/payment-attempt-model.js` for UC-17 / UC-17-AS
- [ ] T020 [P] [US1] Implement payment submit form and hosted-field container markup in `src/views/payment.html` for UC-17 / UC-17-AS
- [ ] T021 [P] [US1] Implement approved confirmation page markup in `src/views/confirmation.html` for UC-17 / UC-17-AS
- [ ] T022 [P] [US1] Implement payment/confirmation styling for success path states in `src/assets/css/payment.css` for UC-17 / UC-17-AS
- [ ] T023 [US1] Implement payment submission controller for `POST /api/registration-sessions/{sessionId}/payment-attempts` approved and idempotent-replay responses in `src/controllers/payment-controller.js` for UC-17 / UC-17-AS
- [ ] T024 [US1] Implement registration-session status controller for `GET /api/registration-sessions/{sessionId}` in `src/controllers/payment-status-controller.js` for UC-17 / UC-17-AS
- [ ] T025 [US1] Implement view-only submit/confirmation wiring (no business logic) in `src/assets/js/payment-view.js` for UC-17 / UC-17-AS
- [ ] T026 [US1] Update approved + idempotent replay API examples and schemas in `specs/001-registration-payment/contracts/openapi.yaml` for UC-17 / UC-17-AS
- [ ] T027 [US1] Execute approved-path acceptance checks and record coverage output in `tests/coverage/uc17-us1-coverage.md` for UC-17 / UC-17-AS

**Checkpoint**: US1 is complete and independently verifiable as the MVP.

---

## Phase 4: User Story 2 - Retry After Decline (Priority: P2)

**Goal**: Attendee is notified when payment is declined and can retry within policy limits after reconciliation rules are satisfied.  
**Independent Test**: Execute decline/retry scenarios in `Acceptance Tests/UC-17-AS.md`; verify retry prompt, pending gating, 5-in-15 limit, cooldown blocking, and successful recovery after corrected details.

### Validation Tasks

- [ ] T028 [P] [US2] Extend acceptance suite with declined, retry, pending, and cooldown boundary scenarios in `tests/acceptance/uc17-registration-payment.acceptance.test.js` for UC-17 / UC-17-AS
- [ ] T029 [P] [US2] Add unit tests for retry window and cooldown expiry logic in `tests/unit/models/retry-policy-model.test.js` for UC-17 / UC-17-AS
- [ ] T030 [P] [US2] Add integration tests for pending reconciliation via webhook/poll fallback in `tests/integration/gateway-webhook-controller.test.js` for UC-17 / UC-17-AS
- [ ] T031 [US2] Prepare decline/retry acceptance evidence template in `tests/acceptance/uc17-us2-results.md` for UC-17 / UC-17-AS

### Implementation Tasks

- [ ] T032 [P] [US2] Implement retry-limit and cooldown policy state model in `src/models/retry-policy-model.js` for UC-17 / UC-17-AS
- [ ] T033 [P] [US2] Implement reconciliation-event model with idempotent event processing in `src/models/reconciliation-event-model.js` for UC-17 / UC-17-AS
- [ ] T034 [P] [US2] Extend payment page messaging regions for declined, pending, and cooldown states in `src/views/payment.html` for UC-17 / UC-17-AS
- [ ] T035 [P] [US2] Extend payment view scripting for retry prompts, pending lockout, and cooldown timers in `src/assets/js/payment-view.js` for UC-17 / UC-17-AS
- [ ] T036 [US2] Extend payment submission controller for declined/pending outcomes and retry blocking (`409`) responses in `src/controllers/payment-controller.js` for UC-17 / UC-17-AS
- [ ] T037 [US2] Implement attempt-status controller for `GET /api/registration-sessions/{sessionId}/payment-attempts/{attemptId}` in `src/controllers/payment-status-controller.js` for UC-17 / UC-17-AS
- [ ] T038 [US2] Implement gateway webhook reconciliation endpoint for `POST /api/payments/webhooks/gateway` in `src/controllers/gateway-webhook-controller.js` for UC-17 / UC-17-AS
- [ ] T039 [US2] Update OpenAPI schemas/examples for pending reconciliation, blocked reasons, and webhook errors in `specs/001-registration-payment/contracts/openapi.yaml` for UC-17 / UC-17-AS
- [ ] T040 [US2] Execute decline/retry acceptance checks and record coverage output in `tests/coverage/uc17-us2-coverage.md` for UC-17 / UC-17-AS

**Checkpoint**: US2 is complete and independently verifiable.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Finish regression, compliance, documentation, and release readiness.

- [ ] T041 [P] Execute full UC-17 acceptance regression and archive final evidence in `tests/acceptance/uc17-final-regression.md` for UC-17 / UC-17-AS
- [ ] T042 Enforce final in-scope coverage report (target 100%, block <95%) in `tests/coverage/uc17-final-coverage.md` for UC-17 / UC-17-AS
- [ ] T043 [P] Document PCI DSS SAQ A validation checks for token-only handling in `specs/001-registration-payment/compliance-checklist.md` for UC-17 / UC-17-AS
- [ ] T044 [P] Update execution instructions and troubleshooting notes in `specs/001-registration-payment/quickstart.md` for UC-17 / UC-17-AS
- [ ] T045 Finalize FR-to-task and evidence traceability mapping in `specs/001-registration-payment/traceability.md` for UC-17 / UC-17-AS
- [ ] T046 [P] Define SC-004 timed usability protocol in `tests/acceptance/uc17-usability-protocol.md` for UC-17 / UC-17-AS
- [ ] T047 Execute SC-004 usability run (>=90% complete <=2 minutes) and record results in `tests/acceptance/uc17-usability-results.md` for UC-17 / UC-17-AS
- [ ] T048 Execute regression suites `Acceptance Tests/UC-01-AS.md` through `Acceptance Tests/UC-16-AS.md` and record results in `tests/acceptance/regression-uc01-uc16.md` for UC-17 / UC-17-AS
- [ ] T049 Link UC-01 through UC-16 regression evidence to release traceability in `specs/001-registration-payment/traceability.md` for UC-17 / UC-17-AS
- [ ] T050 [P] Define p95 latency measurement procedure for NFR-001 and NFR-002 in `tests/acceptance/uc17-performance-protocol.md` for UC-17 / UC-17-AS
- [ ] T051 Execute latency measurements for approved, decline, and pending feedback paths and record p95 evidence in `tests/acceptance/uc17-performance-results.md` for UC-17 / UC-17-AS
- [ ] T052 Update final traceability with NFR-001 through NFR-003 evidence links in `specs/001-registration-payment/traceability.md` for UC-17 / UC-17-AS

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Phase 1 and blocks all user stories
- US1 (Phase 3): depends on Phase 2
- US2 (Phase 4): depends on Phase 2 and should build on US1 payment submission baseline
- Polish (Phase 5): depends on completed user stories

### User Story Dependency Graph

```text
US1 (P1) -> US2 (P2)
```

### Parallel Opportunities

- Phase 1: `T004`, `T005`, and `T007` can run in parallel after `T003`
- Phase 2: `T009`, `T010`, and `T012` can run in parallel after `T008`
- US1: `T019`, `T020`, `T021`, and `T022` can run in parallel after validation test scaffolding (`T015`-`T017`)
- US2: `T032`, `T033`, `T034`, and `T035` can run in parallel after validation test scaffolding (`T028`-`T030`)

---

## Implementation Strategy

### MVP First (US1)

1. Finish Phase 1 and Phase 2.
2. Deliver US1 end-to-end (`T015`-`T027`).
3. Verify approved payment confirmation and coverage evidence.
4. Demo/release MVP before retry-policy enhancements.

### Incremental Delivery

1. Add US2 decline/retry/pending/cooldown behavior.
2. Re-run UC-17 acceptance scenarios after each story completion.
3. Complete polish tasks and final traceability/coverage gates.

### Parallel Team Strategy

1. One engineer handles model + policy tasks (`T019`, `T032`, `T033`).
2. One engineer handles view/UX tasks (`T020`, `T021`, `T022`, `T034`, `T035`).
3. One engineer handles controllers/contracts/tests (`T023`, `T024`, `T036`-`T040`).
