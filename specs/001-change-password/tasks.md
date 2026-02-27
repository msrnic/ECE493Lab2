# Tasks: Change Account Password

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/password-change.openapi.yaml`, `quickstart.md`

**Tests**: Acceptance (`Acceptance Tests/UC-03-AS.md`) and coverage evidence tasks are included because `spec.md` requires them (FR-009, SC-001 through SC-010).

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Project Initialization)

**Purpose**: Create baseline project/test scaffolding and traceability artifacts.

- [ ] T001 Create MVC and test directories in `src/models/`, `src/views/`, `src/controllers/`, `src/assets/css/`, `src/assets/js/`, `tests/acceptance/`, `tests/unit/`, and `tests/contract/` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T002 [P] Create baseline feature shell files `src/index.html`, `src/assets/js/app.js`, and `src/assets/css/password-change.css` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T003 Configure execution scripts for unit, acceptance, contract, and coverage runs in `package.json` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T004 [P] Create feature traceability matrix artifact in `specs/001-change-password/traceability.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T005 [P] Create acceptance evidence log template in `tests/acceptance/uc03-change-password.evidence.md` (Traceability: `UC-03`, `UC-03-AS`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared architecture required before user-story work.

**⚠️ CRITICAL**: No user-story phase should start before this phase is complete.

- [ ] T006 Implement shared password-change API adapter for `/api/v1/account/password-change` in `src/models/password-change-api-client.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T007 [P] Implement password policy validator baseline in `src/models/password-policy-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T008 [P] Implement throttle state primitives and window helpers in `src/models/attempt-throttle-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T009 [P] Implement shared view state and message rendering helpers in `src/views/password-change-view.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T010 Implement controller initialization/event-binding shell in `src/controllers/password-change-controller.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T011 [P] Scaffold contract test harness for password-change endpoint in `tests/contract/password-change.contract.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T012 Configure coverage thresholds/reporting for scoped JavaScript in `package.json` and `.c8rc.json` (Traceability: `UC-03`, `UC-03-AS`)

**Checkpoint**: Foundation complete; user-story implementation can begin.

---

## Phase 3: User Story 1 - Successfully Change Password (Priority: P1) 🎯 MVP

**Goal**: Allow a logged-in user to submit correct current/new credentials and complete a successful password update with required security side effects.

**Independent Test**: With a logged-in fixture user, submit a correct current password plus policy-compliant new password and verify update success, re-login validity, other-session invalidation, notification queueing, and audit creation.

### Validation Tasks

- [ ] T013 [P] [US1] Translate UC-03 success scenarios from `Acceptance Tests/UC-03-AS.md` into executable checks in `tests/acceptance/uc03-change-password.acceptance.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T014 [P] [US1] Add contract assertions for `200`, `400`, and `401` responses from `specs/001-change-password/contracts/password-change.openapi.yaml` in `tests/contract/password-change.contract.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T015 [US1] Execute US1 acceptance and contract checks and record evidence in `tests/acceptance/uc03-change-password.evidence.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T016 [US1] Generate US1 coverage evidence and remediation notes in `specs/001-change-password/coverage/us1-coverage.md` (Traceability: `UC-03`, `UC-03-AS`)

### Implementation Tasks

- [ ] T017 [P] [US1] Implement `PasswordChangeSubmission` and `CredentialRecord` update flow in `src/models/password-change-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T018 [P] [US1] Implement successful-change session invalidation adapter (`keep current, revoke others`) in `src/models/session-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T019 [P] [US1] Implement successful-change notification queue adapter in `src/models/notification-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T020 [P] [US1] Implement successful-attempt audit entry creation in `src/models/audit-log-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T021 [P] [US1] Implement password-change form and success-feedback placeholders in `src/views/password-change-view.html` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T022 [P] [US1] Implement success/validation styling rules in `src/assets/css/password-change.css` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T023 [US1] Integrate success-path orchestration across model and view in `src/controllers/password-change-controller.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T024 [US1] Wire feature bootstrap and asset loading in `src/assets/js/app.js` and `src/index.html` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T025 [US1] Add success-path unit tests in `tests/unit/password-change-model.test.js` and `tests/unit/password-change-controller.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T026 [US1] Re-run UC-03 success scenarios and update evidence/coverage notes in `tests/acceptance/uc03-change-password.evidence.md` and `specs/001-change-password/coverage/us1-coverage.md` (Traceability: `UC-03`, `UC-03-AS`)

**Checkpoint**: US1 delivers MVP behavior and can be verified independently.

---

## Phase 4: User Story 2 - Reject Incorrect Current Password (Priority: P2)

**Goal**: Prevent credential changes when the current password is wrong while allowing safe retry and enforcing temporary blocks after repeated failures.

**Independent Test**: Submit an incorrect current password and verify no credential update, visible error feedback, accurate audit entry, retry support, and temporary block after 5 failures in 10 minutes.

### Validation Tasks

- [ ] T027 [P] [US2] Translate UC-03 incorrect-password/retry scenarios from `Acceptance Tests/UC-03-AS.md` into executable checks in `tests/acceptance/uc03-change-password.acceptance.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T028 [P] [US2] Extend contract assertions for `422`/`429` rejection responses from `specs/001-change-password/contracts/password-change.openapi.yaml` in `tests/contract/password-change.contract.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T029 [US2] Execute US2 acceptance and contract checks and record evidence in `tests/acceptance/uc03-change-password.evidence.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T030 [US2] Generate US2 coverage evidence and remediation notes in `specs/001-change-password/coverage/us2-coverage.md` (Traceability: `UC-03`, `UC-03-AS`)

### Implementation Tasks

- [ ] T031 [P] [US2] Implement rolling-window failure counting and block-state transitions in `src/models/attempt-throttle-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T032 [P] [US2] Implement rejection outcomes (`INCORRECT_CURRENT_PASSWORD`, `TEMPORARILY_BLOCKED`) with no-update guarantees in `src/models/password-change-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T033 [P] [US2] Implement rejected-attempt audit logging plus operational alert hook in `src/models/audit-log-model.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T034 [P] [US2] Implement incorrect-password, retry, and block feedback rendering in `src/views/password-change-view.js` and `src/views/password-change-view.html` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T035 [US2] Integrate rejection/retry/throttle controller branches in `src/controllers/password-change-controller.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T036 [US2] Add rejection/throttle unit tests in `tests/unit/attempt-throttle-model.test.js` and `tests/unit/password-change-controller.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T037 [US2] Re-run full UC-03 scenario set and update evidence/coverage notes in `tests/acceptance/uc03-change-password.evidence.md` and `specs/001-change-password/coverage/us2-coverage.md` (Traceability: `UC-03`, `UC-03-AS`)

**Checkpoint**: US2 behavior is independently testable and regression-safe for US1.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Finalize compliance, documentation, and multi-story quality gates.

- [ ] T038 [P] Update implementation/verification commands and paths in `specs/001-change-password/quickstart.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T039 Run acceptance regression for previously passing suites and record results in `tests/acceptance/regression-summary.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T040 Enforce feature coverage gate and remediation/exception notes in `specs/001-change-password/coverage/final-coverage.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T041 [P] Finalize FR-to-test/code traceability for FR-001 through FR-013 in `specs/001-change-password/traceability.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T042 Document final MVC boundary checks and cleanup notes in `specs/001-change-password/implementation-notes.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T043 [P] Add SC-002 latency harness with submit-to-success timing capture in `tests/acceptance/uc03-change-password.performance.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T044 Record SC-002 latency sample analysis (>=100 valid submissions) in `specs/001-change-password/performance/sc002-results.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T045 [P] Define SC-005 usability test protocol and first-attempt success criteria in `specs/001-change-password/usability/protocol.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T046 Execute SC-005 usability validation and record outcomes in `specs/001-change-password/usability/results.md` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T047 Add acceptance assertions for session invalidation and notification generation in `tests/acceptance/uc03-change-password.acceptance.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T048 Add acceptance assertions for audit-entry creation on successful password change in `tests/acceptance/uc03-change-password.acceptance.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T049 Add acceptance assertions for audit-entry creation on rejected/blocked attempts in `tests/acceptance/uc03-change-password.acceptance.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T050 [P] Implement integration test harness setup in `tests/integration/setup.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T051 [US1] Add success-path controller-model integration tests in `tests/integration/password-change-success.integration.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T052 [US2] Add rejection/throttle controller-model integration tests in `tests/integration/password-change-rejection.integration.test.js` (Traceability: `UC-03`, `UC-03-AS`)
- [ ] T053 Execute integration test suite and capture results in `tests/integration/uc03-integration-results.md` (Traceability: `UC-03`, `UC-03-AS`)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no prerequisites.
- Foundational (Phase 2) depends on Setup and blocks all story phases.
- US1 (Phase 3) depends on Foundational completion.
- US2 (Phase 4) depends on Foundational completion and should follow US1 because both stories modify `src/controllers/password-change-controller.js` and shared acceptance artifacts.
- Polish (Phase 5) depends on completion of US1 and US2.

### User Story Dependency Graph

- `US1 (P1)` -> `US2 (P2)`

### Within-Story Execution Rules

- Run validation task translation before story implementation tasks.
- Implement model/view updates before final controller integration in each story.
- Execute acceptance + contract + coverage evidence tasks before marking a story complete.

---

## Parallel Execution Examples

### US1 Parallel Example

- Run `T017`, `T018`, `T019`, `T020`, `T021`, and `T022` in parallel after `T013` and `T014` are prepared.

### US2 Parallel Example

- Run `T031`, `T032`, `T033`, and `T034` in parallel after `T027` and `T028` are prepared.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete all US1 tasks (`T013` through `T026`).
3. Validate acceptance/contract/coverage evidence for US1 and demo MVP.

### Incremental Delivery

1. Add US2 after US1 is stable.
2. Re-run UC-03 evidence after each increment.
3. Finish Polish phase to lock traceability and compliance artifacts.

### Team Parallelization

1. One engineer owns model adapters (`src/models/`) while another owns view assets (`src/views/`, `src/assets/css/`) during `[P]` tasks.
2. Merge only after controller integration and acceptance evidence tasks pass.
