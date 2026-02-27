# Tasks: Author Decision Notifications

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-notification-delivery-retry/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

## Phase 1: Setup (Project Initialization)

**Purpose**: Establish project scaffolding, traceability, and baseline test harnesses.

- [ ] T001 [UC-12] [UC-12-AS] Create UC-12 traceability baseline mapping FR-001..FR-013 in `specs/001-notification-delivery-retry/traceability.md`
- [ ] T002 [UC-12] [UC-12-AS] Scaffold feature MVC directories and placeholder files in `src/models/.gitkeep`
- [ ] T003 [P] [UC-12] [UC-12-AS] Scaffold controller/service/route directories for notification flow in `src/controllers/.gitkeep`
- [ ] T004 [P] [UC-12] [UC-12-AS] Scaffold public asset directories for admin failure UI in `public/css/.gitkeep`
- [ ] T005 [P] [UC-12] [UC-12-AS] Scaffold acceptance/unit/integration test folders for UC-12 in `tests/acceptance/.gitkeep`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared infrastructure required by all user stories.

**Critical**: Complete this phase before any user-story implementation.

- [ ] T006 [UC-12] [UC-12-AS] Implement shared notification status and transition constants in `src/models/notification-status.js`
- [ ] T007 [P] [UC-12] [UC-12-AS] Implement SMTP adapter abstraction with normalized send result contract in `src/services/email-delivery-service.js`
- [ ] T008 [P] [UC-12] [UC-12-AS] Implement internal service key middleware for `/api/internal/*` endpoints in `src/middleware/internal-service-auth.js`
- [ ] T009 [P] [UC-12] [UC-12-AS] Implement administrator authorization middleware for `/api/admin/*` endpoints in `src/middleware/admin-role-auth.js`
- [ ] T010 [UC-12] [UC-12-AS] Configure acceptance evidence template and naming convention for UC-12 in `tests/acceptance/README.md`
- [ ] T011 [UC-12] [UC-12-AS] Configure JavaScript line coverage reporting and threshold gates in `package.json`

**Checkpoint**: Foundational components are ready; user story work can begin.

---

## Phase 3: User Story 1 - Deliver Final Decision Message (Priority: P1) 🎯 MVP

**Goal**: Generate and send one decision email when a decision is finalized.

**Independent Test Criteria**: Finalize a decision, trigger notification once, and verify one author email delivery outcome is recorded.

### Validation Tasks

- [ ] T012 [P] [US1] [UC-12] [UC-12-AS] Translate UC-12-AS happy-path scenario into executable acceptance checks in `tests/acceptance/uc12-delivery.acceptance.test.js`
- [ ] T013 [US1] [UC-12] [UC-12-AS] Execute happy-path acceptance run and capture evidence for UC-12-AS in `tests/acceptance/UC-12-happy-path.log`
- [ ] T014 [US1] [UC-12] [UC-12-AS] Record US1 line coverage for trigger/generation/send modules in `tests/coverage/uc12-us1-coverage.md`

### Implementation Tasks

- [ ] T015 [P] [US1] [UC-12] [UC-12-AS] Implement finalized decision validation and mapping rules in `src/models/finalized-decision-model.js`
- [ ] T016 [P] [US1] [UC-12] [UC-12-AS] Implement notification creation, email-channel enforcement, and dedupe key generation in `src/models/decision-notification-model.js`
- [ ] T017 [P] [US1] [UC-12] [UC-12-AS] Implement initial delivery attempt persistence (`attemptNumber=1`) in `src/models/delivery-attempt-model.js`
- [ ] T018 [P] [US1] [UC-12] [UC-12-AS] Implement POST `/api/internal/decisions/{decisionId}/notifications` orchestration in `src/controllers/notification-controller.js`
- [ ] T019 [P] [US1] [UC-12] [UC-12-AS] Register decision-notification trigger route and middleware chain in `src/routes/notification-routes.js`
- [ ] T020 [US1] [UC-12] [UC-12-AS] Implement decision email subject/body template rendering in `src/views/notification-email-template.html`
- [ ] T021 [US1] [UC-12] [UC-12-AS] Integrate email adapter send result into delivered status transition in `src/services/email-delivery-service.js`
- [ ] T022 [US1] [UC-12] [UC-12-AS] Enforce idempotent duplicate-send prevention on repeated decision triggers in `src/controllers/notification-controller.js`
- [ ] T023 [US1] [UC-12] [UC-12-AS] Re-run UC-12-AS happy path and update acceptance evidence notes in `tests/acceptance/UC-12-happy-path.log`

**Checkpoint**: US1 is independently testable and satisfies primary delivery behavior.

---

## Phase 4: User Story 2 - Recover from Delivery Failure (Priority: P2)

**Goal**: Retry delivery exactly once after an initial failure and avoid duplicate messages.

**Independent Test Criteria**: Force attempt 1 to fail, confirm exactly one retry is executed, and verify delivered-or-failed outcome is recorded without duplicate messages.

### Validation Tasks

- [ ] T024 [P] [US2] [UC-12] [UC-12-AS] Translate UC-12-AS failure-and-retry scenario into executable acceptance checks in `tests/acceptance/uc12-retry.acceptance.test.js`
- [ ] T025 [US2] [UC-12] [UC-12-AS] Execute forced-failure retry acceptance run and capture UC-12-AS evidence in `tests/acceptance/UC-12-retry.log`
- [ ] T026 [US2] [UC-12] [UC-12-AS] Record US2 line coverage for retry scheduler and retry endpoint paths in `tests/coverage/uc12-us2-coverage.md`

### Implementation Tasks

- [ ] T027 [P] [US2] [UC-12] [UC-12-AS] Enforce delivery-attempt guard rails (`attemptNumber <= 2`) and failure reason requirements in `src/models/delivery-attempt-model.js`
- [ ] T028 [P] [US2] [UC-12] [UC-12-AS] Implement single-retry scheduling policy (`attemptNumber=2` only) in `src/services/retry-scheduler-service.js`
- [ ] T029 [US2] [UC-12] [UC-12-AS] Implement POST `/api/internal/notifications/{notificationId}/retry` flow with conflict handling in `src/controllers/notification-controller.js`
- [ ] T030 [P] [US2] [UC-12] [UC-12-AS] Register retry endpoint and internal auth middleware in `src/routes/notification-routes.js`
- [ ] T031 [US2] [UC-12] [UC-12-AS] Implement retry outcome mapping (`delivered` vs `unresolved_failure`) in `src/services/email-delivery-service.js`
- [ ] T032 [US2] [UC-12] [UC-12-AS] Harden dedupe checks across trigger+retry concurrency paths in `src/models/decision-notification-model.js`
- [ ] T033 [US2] [UC-12] [UC-12-AS] Re-run retry acceptance scenario and update evidence notes in `tests/acceptance/UC-12-retry.log`

**Checkpoint**: US2 is independently testable and enforces exactly one automatic retry.

---

## Phase 5: User Story 3 - Record Unresolved Delivery Failures (Priority: P3)

**Goal**: Persist unresolved failures with required fields, retain for 1 year, and expose them to administrators only.

**Independent Test Criteria**: Force initial and retry failures, verify unresolved record fields/retention are stored, and confirm admin-only read access.

### Validation Tasks

- [ ] T034 [P] [US3] [UC-12] [UC-12-AS] Translate unresolved-failure logging and admin-visibility scenarios into acceptance checks in `tests/acceptance/uc12-failure-log.acceptance.test.js`
- [ ] T035 [US3] [UC-12] [UC-12-AS] Execute unresolved-failure acceptance run and record UC-12-AS evidence in `tests/acceptance/UC-12-failure-log.log`
- [ ] T036 [US3] [UC-12] [UC-12-AS] Record US3 line coverage for failure logging, retention, and admin access paths in `tests/coverage/uc12-us3-coverage.md`

### Implementation Tasks

- [ ] T037 [P] [US3] [UC-12] [UC-12-AS] Implement unresolved failure record schema with FR-010 fields and `retainedUntil` calculation in `src/models/unresolved-failure-model.js`
- [ ] T038 [P] [US3] [UC-12] [UC-12-AS] Implement GET `/api/admin/notification-failures` listing with filters and pagination in `src/controllers/admin-failure-log-controller.js`
- [ ] T039 [P] [US3] [UC-12] [UC-12-AS] Implement GET `/api/admin/notification-failures/{failureRecordId}` detail retrieval in `src/controllers/admin-failure-log-controller.js`
- [ ] T040 [P] [US3] [UC-12] [UC-12-AS] Register admin failure routes with admin-role middleware in `src/routes/admin-routes.js`
- [ ] T041 [P] [US3] [UC-12] [UC-12-AS] Implement unresolved-failure list UI markup in `src/views/admin-failure-list.html`
- [ ] T042 [P] [US3] [UC-12] [UC-12-AS] Implement unresolved-failure detail UI markup in `src/views/admin-failure-detail.html`
- [ ] T043 [P] [US3] [UC-12] [UC-12-AS] Implement admin failure list/detail styles in `public/css/admin-failures.css`
- [ ] T044 [P] [US3] [UC-12] [UC-12-AS] Implement admin failure filtering and pagination behavior in `public/js/admin-failures-controller.js`
- [ ] T045 [US3] [UC-12] [UC-12-AS] Implement 1-year retention enforcement/cleanup query constraints in `src/models/unresolved-failure-model.js`
- [ ] T046 [US3] [UC-12] [UC-12-AS] Re-run unresolved-failure acceptance scenarios and update evidence notes in `tests/acceptance/UC-12-failure-log.log`

**Checkpoint**: US3 is independently testable and satisfies unresolved-failure observability/security requirements.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, regression, and documentation across all stories.

- [ ] T047 [P] [UC-12] [UC-12-AS] Update completed FR-to-implementation traceability links in `specs/001-notification-delivery-retry/traceability.md`
- [ ] T048 [UC-12] [UC-12-AS] Execute regression pass for previously passing acceptance suites and summarize outcomes in `tests/acceptance/regression-summary.md`
- [ ] T049 [UC-12] [UC-12-AS] Enforce final UC-12 JavaScript line-coverage evidence and remediation notes in `tests/coverage/uc12-final-coverage.md`
- [ ] T050 [P] [UC-12] [UC-12-AS] Add/refine retry/dedupe/authorization unit tests in `tests/unit/notification-workflow.unit.test.js`
- [ ] T051 [P] [UC-12] [UC-12-AS] Add/refine API integration tests for contract response codes and payloads in `tests/integration/notification-delivery.integration.test.js`
- [ ] T052 [UC-12] [UC-12-AS] Document final implementation notes, assumptions, and rollout checks in `specs/001-notification-delivery-retry/implementation-notes.md`
- [ ] T053 [P] [UC-12] [UC-12-AS] Add latency instrumentation for finalize-to-attempt1 and fail1-to-retry timing in `src/services/retry-scheduler-service.js`
- [ ] T054 [UC-12] [UC-12-AS] Add performance integration checks for 30s/60s timing targets in `tests/integration/notification-performance.integration.test.js`
- [ ] T055 [UC-12] [UC-12-AS] Capture p95 admin failure-list query evidence (<300ms) in `tests/acceptance/UC-12-performance.log`
- [ ] T056 [UC-12] [UC-12-AS] Capture SC-002 evidence (>=98% provider-accepted delivery within 5 minutes) in `tests/acceptance/UC-12-performance.log`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies.
- Foundational (Phase 2): Depends on Setup; blocks all story phases.
- User Story phases (Phase 3-5): Depend on Foundational completion.
- Polish (Phase 6): Depends on completion of selected story phases.

### User Story Dependency Graph

- US1 (P1) -> US2 (P2) -> US3 (P3)
- US2 depends on US1 notification generation and attempt-1 persistence.
- US3 depends on US2 unresolved retry outcomes for failure-record creation.

### Within-Story Ordering Rules

- Validation tasks are authored before implementation tasks in each story phase.
- Models precede controllers/routes where state contracts are introduced.
- Acceptance evidence is refreshed after implementation before story sign-off.

## Parallel Execution Examples

### US1 Parallel Example

- Run `T015`, `T016`, and `T017` in parallel (different model files: `src/models/finalized-decision-model.js`, `src/models/decision-notification-model.js`, `src/models/delivery-attempt-model.js`).
- Run `T018` and `T019` in parallel after model contracts stabilize (`src/controllers/notification-controller.js` and `src/routes/notification-routes.js`).

### US2 Parallel Example

- Run `T027` and `T028` in parallel (`src/models/delivery-attempt-model.js` and `src/services/retry-scheduler-service.js`).
- Run `T029` and `T030` in parallel once retry contract is set (`src/controllers/notification-controller.js` and `src/routes/notification-routes.js`).

### US3 Parallel Example

- Run `T038`, `T041`, and `T043` in parallel (`src/controllers/admin-failure-log-controller.js`, `src/views/admin-failure-list.html`, `public/css/admin-failures.css`).
- Run `T039`, `T042`, and `T044` in parallel (`src/controllers/admin-failure-log-controller.js`, `src/views/admin-failure-detail.html`, `public/js/admin-failures-controller.js`).

## Implementation Strategy

### MVP First (Recommended Scope)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) end-to-end.
3. Execute UC-12 happy-path acceptance validation and coverage capture.
4. Demo/ship MVP focused on reliable initial decision delivery.

### Incremental Delivery

1. Add US2 for retry reliability after MVP sign-off.
2. Add US3 for unresolved-failure observability and admin workflows.
3. Complete Phase 6 regression and final coverage/compliance evidence.
