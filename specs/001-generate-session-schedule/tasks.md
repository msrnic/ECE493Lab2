# Tasks: Conference Schedule Generation

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-generate-session-schedule/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/schedule-generation.openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation from `Acceptance Tests/UC-13-AS.md` and coverage evidence are required for each user story because FR-009 mandates acceptance and 100% line coverage evidence for in-scope JavaScript.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish project skeleton and baseline automation for UC-13 delivery.

- [ ] T001 Create MVC and test directory scaffold in `src/models/`, `src/controllers/`, `src/views/admin/`, `src/views/editor/`, `src/assets/css/`, `src/assets/js/`, `tests/acceptance/`, `tests/integration/`, `tests/unit/`, `tests/coverage/`, and `data/` (UC-13 / UC-13-AS)
- [ ] T002 Initialize Node.js project scripts and dependencies for Express/testing in `package.json` (UC-13 / UC-13-AS)
- [ ] T003 [P] Create server bootstrap and route mounting shell in `src/app.js` and `src/server.js` (UC-13 / UC-13-AS)
- [ ] T004 [P] Create shared schedule persistence seed document in `data/schedules.json` (UC-13 / UC-13-AS)
- [ ] T005 [P] Define UC-13 traceability baseline linking FR IDs to `Acceptance Tests/UC-13-AS.md` in `tests/acceptance/traceability-uc13.md` (UC-13 / UC-13-AS)
- [ ] T006 [P] Configure linting, test, and coverage tooling in `eslint.config.js`, `jest.config.js`, and `package.json` (UC-13 / UC-13-AS)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared architecture required before any user story work.

**CRITICAL**: No user story implementation starts until this phase is complete.

- [ ] T007 Implement JSON repository read/write abstraction for schedule entities in `src/models/repositories/ScheduleRepository.js` (UC-13 / UC-13-AS)
- [ ] T008 [P] Implement request and entity validation schemas for schedule APIs in `src/models/validation/scheduleSchemas.js` (UC-13 / UC-13-AS)
- [ ] T009 [P] Implement role authorization middleware for admin/editor access in `src/controllers/middleware/authorizeRole.js` (UC-13 / UC-13-AS)
- [ ] T010 Implement shared API success/error response helpers in `src/controllers/http/responses.js` (UC-13 / UC-13-AS)
- [ ] T011 [P] Implement deterministic scheduling engine shell (assignment pass plus validation pass hooks) in `src/models/services/ScheduleGenerationEngine.js` (UC-13 / UC-13-AS)
- [ ] T012 [P] Create reusable test fixtures for accepted papers, session slots, and conflict scenarios in `tests/fixtures/schedule-fixtures.json` (UC-13 / UC-13-AS)
- [ ] T013 Configure integration test app bootstrap and teardown helpers in `tests/integration/setup/testServer.js` (UC-13 / UC-13-AS)
- [ ] T014 Define acceptance evidence and coverage record templates in `tests/acceptance/templates/uc13-evidence-template.md` and `tests/coverage/templates/coverage-template.md` (UC-13 / UC-13-AS)

**Checkpoint**: Shared foundation is complete and user story development can begin.

---

## Phase 3: User Story 1 - Generate Draft Conference Schedule (Priority: P1) MVP

**Goal**: Allow an administrator to start schedule generation, produce session assignments, and retrieve generated schedule versions.

**Independent Test**: Start generation as admin with accepted papers/session slots and verify successful run creation, schedule retrieval, and rejection of a second concurrent request using `Acceptance Tests/UC-13-AS.md`.

### Tests and Validation (UC-13 / UC-13-AS)

- [ ] T015 [P] [US1] Translate UC-13-AS generation and in-progress rejection scenarios into executable checks in `tests/acceptance/uc13-us1-checks.md` (UC-13 / UC-13-AS)
- [ ] T016 [P] [US1] Add integration tests for `POST /api/schedule-runs`, `GET /api/schedule-runs/:runId`, and `GET /api/schedules/:scheduleId` in `tests/integration/api/schedule-runs.us1.test.js` (UC-13 / UC-13-AS)
- [ ] T017 [P] [US1] Add unit tests for run-lock behavior, assignment invariants, and active schedule switching in `tests/unit/models/schedule-generation.us1.test.js` (UC-13 / UC-13-AS)

### Implementation

- [ ] T018 [P] [US1] Implement run lifecycle state transitions and single active run lock in `src/models/GenerationRunModel.js` (UC-13 / UC-13-AS)
- [ ] T019 [P] [US1] Implement schedule version creation and single-active-version switching in `src/models/GeneratedScheduleModel.js` (UC-13 / UC-13-AS)
- [ ] T020 [P] [US1] Implement session assignment creation and uniqueness validation in `src/models/SessionAssignmentModel.js` (UC-13 / UC-13-AS)
- [ ] T021 [US1] Implement admin generation start flow for `POST /api/schedule-runs` (202 and 409 responses) in `src/controllers/ScheduleGenerationController.js` (UC-13 / UC-13-AS)
- [ ] T022 [US1] Implement generation status polling endpoint `GET /api/schedule-runs/:runId` in `src/controllers/ScheduleRunController.js` (UC-13 / UC-13-AS)
- [ ] T023 [US1] Implement schedule version list/detail endpoints `GET /api/schedules` and `GET /api/schedules/:scheduleId` in `src/controllers/ScheduleReviewController.js` (UC-13 / UC-13-AS)
- [ ] T024 [P] [US1] Implement admin generation page markup/styles in `src/views/admin/schedule-generation.html` and `src/assets/css/schedule-generation.css` (UC-13 / UC-13-AS)
- [ ] T025 [US1] Implement admin generation UI behavior (submit, poll, render schedule output) in `src/assets/js/admin-schedule-generation.js` (UC-13 / UC-13-AS)
- [ ] T026 [US1] Execute UC-13-AS US1 scenarios and capture evidence in `tests/acceptance/uc13-us1-results.md` (UC-13 / UC-13-AS)
- [ ] T027 [US1] Record US1 line coverage evidence for in-scope modules in `tests/coverage/uc13-us1-coverage.md` (UC-13 / UC-13-AS)
- [ ] T028 [P] [US1] Add integration test for non-admin `POST /api/schedule-runs` rejection (403) in `tests/integration/api/schedule-auth.us1.test.js` (UC-13 / UC-13-AS)
- [ ] T029 [US1] Add acceptance evidence for non-admin authorization scenario in `tests/acceptance/uc13-us1-results.md` (UC-13 / UC-13-AS)

**Checkpoint**: US1 is independently testable and demo-ready as MVP.

---

## Phase 4: User Story 2 - Flag Scheduling Conflicts (Priority: P2)

**Goal**: Detect rule violations during generation, deduplicate them, and expose conflict details to administrators and editors.

**Independent Test**: Run generation with known rule violations and verify conflict flags are produced once per unique condition and retrievable by admin/editor via `GET /api/schedules/:scheduleId/conflicts`.

### Tests and Validation (UC-13 / UC-13-AS)

- [ ] T030 [P] [US2] Translate conflict detection and editor visibility scenarios into checks in `tests/acceptance/uc13-us2-checks.md` (UC-13 / UC-13-AS)
- [ ] T031 [P] [US2] Add unit tests for conflict dedup key computation and duplicate prevention in `tests/unit/models/conflict-flag.us2.test.js` (UC-13 / UC-13-AS)
- [ ] T032 [P] [US2] Add integration tests for `GET /api/schedules/:scheduleId/conflicts` authorization and payload shape in `tests/integration/api/schedule-conflicts.us2.test.js` (UC-13 / UC-13-AS)

### Implementation

- [ ] T033 [US2] Implement conflict flag entity rules and `(runId, dedupKey)` uniqueness handling in `src/models/ConflictFlagModel.js` (UC-13 / UC-13-AS)
- [ ] T034 [US2] Implement validation-pass violation detection and conflict materialization in `src/models/services/ScheduleGenerationEngine.js` (UC-13 / UC-13-AS)
- [ ] T035 [US2] Persist generated conflict flags while completing schedule runs in `src/controllers/ScheduleGenerationController.js` (UC-13 / UC-13-AS)
- [ ] T036 [US2] Implement conflicts endpoint `GET /api/schedules/:scheduleId/conflicts` with admin/editor authorization in `src/controllers/ScheduleReviewController.js` (UC-13 / UC-13-AS)
- [ ] T037 [P] [US2] Implement editor conflict review page markup/styles in `src/views/editor/schedule-conflicts.html` and `src/assets/css/schedule-conflicts.css` (UC-13 / UC-13-AS)
- [ ] T038 [US2] Implement editor conflict page data loading and rendering in `src/assets/js/editor-schedule-conflicts.js` (UC-13 / UC-13-AS)
- [ ] T039 [US2] Execute UC-13-AS conflict scenarios and capture evidence in `tests/acceptance/uc13-us2-results.md` (UC-13 / UC-13-AS)
- [ ] T040 [US2] Record US2 line coverage evidence for conflict modules in `tests/coverage/uc13-us2-coverage.md` (UC-13 / UC-13-AS)

**Checkpoint**: US2 conflict detection and visibility are independently verifiable.

---

## Phase 5: User Story 3 - Track Generation Failures Early (Priority: P3)

**Goal**: Return clear failure reasons when generation prerequisites are missing and support successful retry after correction.

**Independent Test**: Trigger generation without accepted papers or required metadata to verify clear failure messages, then restore prerequisites and verify successful rerun.

### Tests and Validation (UC-13 / UC-13-AS)

- [ ] T041 [P] [US3] Translate failure and retry scenarios into acceptance checks in `tests/acceptance/uc13-us3-checks.md` (UC-13 / UC-13-AS)
- [ ] T042 [P] [US3] Add integration tests for `POST /api/schedule-runs` 422 failure and retry success paths in `tests/integration/api/schedule-failures.us3.test.js` (UC-13 / UC-13-AS)
- [ ] T043 [P] [US3] Add unit tests for prerequisite validation and failure reason mapping in `tests/unit/models/generation-failures.us3.test.js` (UC-13 / UC-13-AS)

### Implementation

- [ ] T044 [US3] Implement prerequisite validation for accepted papers and session-slot metadata in `src/models/services/GenerationPreconditionService.js` (UC-13 / UC-13-AS)
- [ ] T045 [US3] Implement failed run transition handling and stored failure reasons in `src/models/GenerationRunModel.js` (UC-13 / UC-13-AS)
- [ ] T046 [US3] Return clear 422 prerequisite failure responses from `POST /api/schedule-runs` in `src/controllers/ScheduleGenerationController.js` (UC-13 / UC-13-AS)
- [ ] T047 [US3] Implement admin UI failure messaging and retry interaction behavior in `src/assets/js/admin-schedule-generation.js` (UC-13 / UC-13-AS)
- [ ] T048 [US3] Execute UC-13-AS failure/retry scenarios and capture evidence in `tests/acceptance/uc13-us3-results.md` (UC-13 / UC-13-AS)
- [ ] T049 [US3] Record US3 line coverage evidence for failure-handling modules in `tests/coverage/uc13-us3-coverage.md` (UC-13 / UC-13-AS)

**Checkpoint**: US3 failure handling is independently testable and complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Stabilize behavior across all stories and finalize compliance evidence.

- [ ] T050 [P] Update final FR-to-implementation traceability for UC-13 in `tests/acceptance/traceability-uc13.md` (UC-13 / UC-13-AS)
- [ ] T051 Execute full UC-13 acceptance regression and store consolidated results in `tests/acceptance/uc13-regression-summary.md` (UC-13 / UC-13-AS)
- [ ] T052 Enforce and document final 100% line coverage status (or remediation plan if below) in `tests/coverage/uc13-final-coverage.md` (UC-13 / UC-13-AS)
- [ ] T053 [P] Add cross-story edge-case integration tests for concurrent run and duplicate conflict races in `tests/integration/api/schedule-edge-cases.polish.test.js` (UC-13 / UC-13-AS)
- [ ] T054 Update implementation and execution documentation in `specs/001-generate-session-schedule/quickstart.md` and `README.md` (UC-13 / UC-13-AS)
- [ ] T055 [P] Build SC-002 load fixture (300 accepted papers, 100 session slots) in `tests/fixtures/sc002-load-fixture.json` (UC-13 / UC-13-AS)
- [ ] T056 Implement generation performance benchmark for SC-002 in `tests/integration/performance/sc002-schedule-generation.perf.test.js` (UC-13 / UC-13-AS)
- [ ] T057 Record SC-002 p95 performance results and pass/fail evidence in `tests/acceptance/uc13-sc002-performance.md` (UC-13 / UC-13-AS)
- [ ] T058 Create prior-suite regression baseline list in `tests/acceptance/regression-baseline.md` (UC-13 / UC-13-AS)
- [ ] T059 Execute previously passing acceptance suites and record outcomes in `tests/acceptance/regression-all-suites.md` (UC-13 / UC-13-AS)
- [ ] T060 [P] Implement in-progress rejection latency benchmark (`409` p95 <= 1 second) in `tests/integration/performance/sc011-rejection-latency.perf.test.js` (UC-13 / UC-13-AS)
- [ ] T061 Record SC-011 rejection-latency evidence in `tests/acceptance/uc13-sc011-rejection-latency.md` (UC-13 / UC-13-AS)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all user stories.
- User Story phases (Phases 3-5) depend on Foundational completion.
- Polish (Phase 6) depends on completion of all targeted user stories.

### User Story Dependency Graph

- US1 (P1) is the MVP and must complete first.
- US2 (P2) depends on US1 generation outputs and schedule retrieval APIs.
- US3 (P3) depends on US1 run initiation flow but can proceed in parallel with late US2 work after US1 is stable.

Graph: `US1 -> US2`, `US1 -> US3`, `US2 + US3 -> Polish`

### Within-Story Ordering Rules

- Validation test authoring before implementation tasks.
- Model and service tasks before controller endpoints.
- Controller endpoints before UI behavior wiring.
- Execute acceptance and coverage evidence tasks before story sign-off.

## Parallel Execution Examples

### User Story 1

- Run T016, T017, and T024 in parallel after T015.
- Run T018, T019, and T020 in parallel before controller integration tasks.

### User Story 2

- Run T031, T032, and T037 in parallel after T030.
- Run T033 and T034 in parallel, then merge through T035 and T036.

### User Story 3

- Run T042 and T043 in parallel after T041.
- Run T045 and T047 in parallel after T044 when model contracts are stable.

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Capture UC-13-AS evidence and coverage for US1.
4. Demo administrator schedule generation as MVP.

### Incremental Delivery

1. Add US2 conflict handling and verify no regressions in US1 evidence.
2. Add US3 failure handling and retry flows.
3. Execute full UC-13 regression and finalize coverage compliance.

### Team Parallelization Strategy

1. One developer completes foundational repository, validation, and auth tasks.
2. After US1 model contracts stabilize, split US2 and US3 across separate developers.
3. Merge only after each story includes acceptance evidence and coverage records.
