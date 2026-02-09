# Tasks: Reviewer Invitation Delivery

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Include acceptance validation for `Acceptance Tests/UC-07-AS.md`, plus unit/integration tests and coverage evidence required by the feature specification.

## Phase 1: Setup (Project Initialization)

**Purpose**: Establish runnable project scaffolding and quality tooling

- [ ] T001 [UC-07] [UC-07-AS] Create MVC/test directory scaffold in `src/models/`, `src/controllers/`, `src/services/`, `src/views/invitation-status/`, `src/views/failure-log/`, `tests/unit/`, `tests/integration/`, and `tests/acceptance/`
- [ ] T002 [UC-07] [UC-07-AS] Initialize project scripts (`dev`, `test`, `lint`, `coverage`) in `package.json`
- [ ] T003 [P] [UC-07] [UC-07-AS] Configure JavaScript/CSS linting in `.eslintrc.cjs` and `.stylelintrc.json`
- [ ] T004 [P] [UC-07] [UC-07-AS] Configure test and coverage runners in `vitest.config.js` and `c8.config.json`
- [ ] T005 [P] [UC-07] [UC-07-AS] Create UC-07 acceptance evidence template in `tests/acceptance/UC-07-evidence-template.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared infrastructure required before user-story implementation

**⚠️ CRITICAL**: No user-story phase starts before this phase is complete

- [ ] T006 [UC-07] [UC-07-AS] Implement HTTP app/router bootstrap and endpoint registration shell in `src/controllers/http-app.js`
- [ ] T007 [P] [UC-07] [UC-07-AS] Implement active-invitation uniqueness persistence helper in `src/models/review-invitation.repository.js`
- [ ] T008 [P] [UC-07] [UC-07-AS] Implement delivery-attempt persistence helper in `src/models/delivery-attempt.repository.js`
- [ ] T009 [P] [UC-07] [UC-07-AS] Implement failure-log persistence helper in `src/models/failure-log-entry.repository.js`
- [ ] T010 [UC-07] [UC-07-AS] Implement notification-provider abstraction and stub adapter in `src/services/notification-provider.js`
- [ ] T011 [UC-07] [UC-07-AS] Implement editor/support/admin authorization policy helper in `src/controllers/authorization.policy.js`
- [ ] T012 [UC-07] [UC-07-AS] Implement OpenAPI contract smoke test scaffold against `contracts/openapi.yaml` in `tests/integration/contracts/reviewer-invitation.openapi.test.js`

**Checkpoint**: Foundation complete; user stories can proceed

---

## Phase 3: User Story 1 - Receive Review Invitation (Priority: P1) 🎯 MVP

**Goal**: A reviewer receives an invitation immediately after assignment and sees delivered status.

**Independent Test**: Assign a reviewer to a paper, trigger invitation delivery, and verify invitation receipt plus delivered status without manual follow-up.

### Tests

- [ ] T013 [P] [UC-07] [UC-07-AS] [US1] Add unit tests for invitation creation and `pending -> delivered` transition in `tests/unit/models/review-invitation.model.test.js`
- [ ] T014 [P] [UC-07] [UC-07-AS] [US1] Add integration tests for `POST /api/reviewer-assignments/{assignmentId}/invitations` and `GET /api/review-invitations/{invitationId}` in `tests/integration/invitation-lifecycle.us1.test.js`
- [ ] T015 [UC-07] [UC-07-AS] [US1] Execute main-success scenario from `Acceptance Tests/UC-07-AS.md` and record results in `tests/acceptance/UC-07-US1.md`

### Implementation

- [ ] T016 [P] [UC-07] [UC-07-AS] [US1] Implement `ReviewInvitation` entity state rules (`pending`, `delivered`, timestamps) in `src/models/review-invitation.model.js`
- [ ] T017 [P] [UC-07] [UC-07-AS] [US1] Implement initial `DeliveryAttempt` entity rules (`attemptNumber=0`) in `src/models/delivery-attempt.model.js`
- [ ] T018 [UC-07] [UC-07-AS] [US1] Implement invitation create/reuse and status retrieval flows in `src/controllers/invitation.controller.js`
- [ ] T019 [UC-07] [UC-07-AS] [US1] Implement invitation status page structure and styling in `src/views/invitation-status/invitation-status.html` and `src/views/invitation-status/invitation-status.css`
- [ ] T020 [UC-07] [UC-07-AS] [US1] Implement invitation status page behavior in `src/views/invitation-status/invitation-status.js`
- [ ] T021 [UC-07] [UC-07-AS] [US1] Implement delivery-event callback handling for `delivered` outcomes in `src/controllers/invitation.controller.js`
- [ ] T022 [UC-07] [UC-07-AS] [US1] Re-run US1 unit/integration checks and save command output in `tests/acceptance/UC-07-US1-test-run.txt`

**Checkpoint**: US1 is independently testable and demonstrates MVP value

---

## Phase 4: User Story 2 - Retry Failed Invitation Delivery (Priority: P2)

**Goal**: Failed deliveries retry every 5 minutes (max 3), stop on success, and cancel immediately on assignment removal.

**Independent Test**: Force initial delivery failure, verify automatic retries and stop conditions, and verify cancellation when assignment is removed.

### Tests

- [ ] T023 [P] [UC-07] [UC-07-AS] [US2] Add unit tests for retry cadence, retry-limit, and cancellation transitions in `tests/unit/models/review-invitation.retry.test.js`
- [ ] T024 [P] [UC-07] [UC-07-AS] [US2] Add integration tests for retry worker and assignment-removal cancellation endpoint in `tests/integration/invitation-retry.us2.test.js`
- [ ] T025 [UC-07] [UC-07-AS] [US2] Execute retry/failure scenario from `Acceptance Tests/UC-07-AS.md` and record results in `tests/acceptance/UC-07-US2.md`

### Implementation

- [ ] T026 [P] [UC-07] [UC-07-AS] [US2] Extend invitation state logic for `retryCount`, `nextRetryAt`, `failed`, `canceled`, and `followUpRequired` in `src/models/review-invitation.model.js`
- [ ] T027 [P] [UC-07] [UC-07-AS] [US2] Extend delivery-attempt validation for sequential retry attempts (`1..3`) in `src/models/delivery-attempt.model.js`
- [ ] T028 [P] [UC-07] [UC-07-AS] [US2] Implement failure-log entry creation rules for failed and terminal outcomes in `src/models/failure-log-entry.model.js`
- [ ] T029 [UC-07] [UC-07-AS] [US2] Implement retry scheduling/processing worker for due invitations in `src/services/invitation-retry.worker.js`
- [ ] T030 [UC-07] [UC-07-AS] [US2] Implement `POST /api/internal/review-invitations/retry-due` processing flow in `src/controllers/invitation.controller.js`
- [ ] T031 [UC-07] [UC-07-AS] [US2] Implement `POST /api/reviewer-assignments/{assignmentId}/invitations/cancel` cancellation flow in `src/controllers/invitation.controller.js`
- [ ] T032 [UC-07] [UC-07-AS] [US2] Extend delivery-event handling for retry stop-on-success and late-callback ignore behavior in `src/controllers/invitation.controller.js`
- [ ] T033 [UC-07] [UC-07-AS] [US2] Re-run US2 unit/integration checks and save command output in `tests/acceptance/UC-07-US2-test-run.txt`

**Checkpoint**: US2 retry reliability and cancellation behavior are independently verifiable

---

## Phase 5: User Story 3 - Capture Failure Evidence (Priority: P3)

**Goal**: Editors and support/admin users can view invitation failure evidence while unauthorized users are denied.

**Independent Test**: Cause delivery failures, then verify authorized access to failure logs and 403 denial for unauthorized authenticated users.

### Tests

- [ ] T034 [P] [UC-07] [UC-07-AS] [US3] Add unit tests for failure-log authorization policy allow/deny decisions in `tests/unit/controllers/failure-log.authorization.test.js`
- [ ] T035 [P] [UC-07] [UC-07-AS] [US3] Add integration tests for `GET /api/papers/{paperId}/invitation-failure-logs` including pagination and 403 responses in `tests/integration/failure-log.us3.test.js`
- [ ] T036 [UC-07] [UC-07-AS] [US3] Execute failure-evidence access scenario and record results in `tests/acceptance/UC-07-US3.md`

### Implementation

- [ ] T037 [P] [UC-07] [UC-07-AS] [US3] Implement failure-log query helpers with paper filter and pagination in `src/models/failure-log-entry.model.js`
- [ ] T038 [UC-07] [UC-07-AS] [US3] Implement failure-log endpoint and RBAC checks in `src/controllers/failure-log.controller.js`
- [ ] T039 [UC-07] [UC-07-AS] [US3] Implement failure-log page structure and styling in `src/views/failure-log/failure-log.html` and `src/views/failure-log/failure-log.css`
- [ ] T040 [UC-07] [UC-07-AS] [US3] Implement failure-log page behavior for authenticated fetch/render in `src/views/failure-log/failure-log.js`
- [ ] T041 [UC-07] [UC-07-AS] [US3] Register failure-log routes and middleware wiring in `src/controllers/http-app.js`
- [ ] T042 [UC-07] [UC-07-AS] [US3] Re-run US3 unit/integration checks and save command output in `tests/acceptance/UC-07-US3-test-run.txt`

**Checkpoint**: US3 failure visibility and access control are independently verifiable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final regression, coverage, documentation, and traceability updates

- [ ] T043 [P] [UC-07] [UC-07-AS] Execute full `Acceptance Tests/UC-07-AS.md` regression and record evidence in `tests/acceptance/UC-07-regression.md`
- [ ] T044 [UC-07] [UC-07-AS] Execute full unit/integration suite and record summary in `tests/acceptance/UC-07-test-summary.md`
- [ ] T045 [UC-07] [UC-07-AS] Enforce c8 line-coverage target and store report in `tests/acceptance/UC-07-coverage.txt`
- [ ] T046 [P] [UC-07] [UC-07-AS] Update FR-to-code traceability matrix in `specs/001-receive-review-invitation/traceability.md`
- [ ] T047 [P] [UC-07] [UC-07-AS] Update final runbook commands/endpoints in `specs/001-receive-review-invitation/quickstart.md`
- [ ] T048 [UC-07] [UC-07-AS] Document final MVC boundary compliance and non-regression notes in `specs/001-receive-review-invitation/implementation-notes.md`
- [ ] T049 [UC-07] [UC-07-AS] Capture baseline list of previously passing acceptance suites in `tests/acceptance/pre-uc07-passing-suites.txt`
- [ ] T050 [UC-07] [UC-07-AS] Execute all suites listed in `tests/acceptance/pre-uc07-passing-suites.txt` and record results in `tests/acceptance/full-regression-post-uc07.md`
- [ ] T051 [P] [UC-07] [UC-07-AS] Add latency measurement integration test for SC-002 in `tests/integration/performance/invitation-latency.sc002.test.js`
- [ ] T052 [UC-07] [UC-07-AS] Record SC-002 measurement report and threshold results in `tests/acceptance/UC-07-SC002-latency.md`
- [ ] T053 [P] [UC-07] [UC-07-AS] Add retry scheduler drift test for NFR-002 in `tests/integration/retry-scheduler-drift.nfr.test.js`
- [ ] T054 [UC-07] [UC-07-AS] Document retry scheduler drift evidence in `tests/acceptance/UC-07-retry-drift.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies
- Foundational (Phase 2): Depends on Setup; blocks all user stories
- User Stories (Phases 3-5): Depend on Foundational completion
- Polish (Phase 6): Depends on all implemented user stories

### User Story Dependency Graph

- `US1 -> US2 -> US3`
- US2 depends on US1 invitation lifecycle endpoints and models
- US3 depends on US2 failure-log production and retry outcomes

### Within Each User Story

- Write tests first for the story (`tests/unit/`, `tests/integration/`, acceptance evidence file)
- Implement models before controller orchestration
- Implement controllers before view wiring and final story test rerun

## Parallel Execution Examples

### US1

- Run `T013` and `T014` in parallel (unit and integration files are independent)
- Run `T016` and `T017` in parallel (different model files)

### US2

- Run `T023` and `T024` in parallel (unit and integration files are independent)
- Run `T026`, `T027`, and `T028` in parallel (separate model files)

### US3

- Run `T034` and `T035` in parallel (unit and integration files are independent)
- Run `T039` and `T040` in parallel (view markup/style vs view behavior)

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2
2. Complete US1 end-to-end (Phase 3)
3. Validate US1 independent test and acceptance evidence
4. Demo/shipping candidate for invitation delivery baseline

### Incremental Delivery

1. Add US2 retry/cancellation after US1 is stable
2. Add US3 failure-evidence access controls and UI
3. Finish with Phase 6 regression, coverage, and traceability artifacts

### Parallel Team Strategy

1. One developer owns foundational/router/repository tasks (`T006`-`T012`)
2. One developer implements US2 models/worker while another prepares US2 tests
3. One developer implements US3 controller/RBAC while another builds US3 view assets
