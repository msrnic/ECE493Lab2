# Tasks: Editor Decision Recording

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/`
**Prerequisites**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/plan.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/spec.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/research.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/data-model.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/contracts/editor-decision.openapi.yaml`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/quickstart.md`

**Tests**: Acceptance validation for `Acceptance Tests/UC-11-AS.md` and 100% line coverage evidence for in-scope JavaScript are required by this feature specification and plan.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `- [ ] T### [P] [US#] [UC-11] [UC-11-AS] Description with file path`

- `[P]` marks tasks that can run in parallel (different files, no incomplete dependency).
- `[US#]` is included only in user story phases.
- `[UC-11] [UC-11-AS]` is required on every task for constitution traceability.
- Every task includes at least one exact file path.

## Phase 1: Setup (Project Initialization)

**Purpose**: Create the initial project skeleton and traceability baseline for UC-11 editor decision recording.

- [ ] T001 [UC-11] [UC-11-AS] Create project manifest with lint, test, and coverage scripts in `package.json`
- [ ] T002 [UC-11] [UC-11-AS] Create decision workflow page shell and asset links in `src/index.html`
- [ ] T003 [P] [UC-11] [UC-11-AS] Create base styling scaffold for the decision workflow page in `src/assets/css/editor-decision.css`
- [ ] T004 [P] [UC-11] [UC-11-AS] Create bootstrap script entry for page initialization in `src/assets/js/decision-workflow-page.js`
- [ ] T005 [P] [UC-11] [UC-11-AS] Create MVC module stubs in `src/models/decision-model.js`, `src/models/decision-audit-model.js`, `src/views/editor-decision-view.js`, and `src/controllers/editor-decision-controller.js`
- [ ] T006 [UC-11] [UC-11-AS] Create traceability baseline for FR-001..FR-014 to UC-11/UC-11-AS in `specs/001-editor-decision/traceability.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared contracts, validation utilities, and test/coverage harnesses required before any story delivery.

**CRITICAL**: No user story work starts until this phase is complete.

- [ ] T007 [UC-11] [UC-11-AS] Implement shared decision enums and command validation helpers in `src/models/decision-model.js`
- [ ] T008 [P] [UC-11] [UC-11-AS] Implement audit entry schema validation and timestamp utilities in `src/models/decision-audit-model.js`
- [ ] T009 [P] [UC-11] [UC-11-AS] Implement controller API client wrappers for `GET /papers/{paperId}/decision-workflow` and `POST /papers/{paperId}/decisions` in `src/controllers/editor-decision-controller.js`
- [ ] T010 [P] [UC-11] [UC-11-AS] Define shared view state contract (loading/success/error/read-only) in `src/views/editor-decision-view.js`
- [ ] T011 [UC-11] [UC-11-AS] Add integration contract tests for workflow-load endpoint responses in `tests/integration/decision-api.test.js`
- [ ] T012 [P] [UC-11] [UC-11-AS] Add integration contract tests for save endpoint response codes (`200/403/409/412/422`) in `tests/integration/decision-api.test.js`
- [ ] T013 [UC-11] [UC-11-AS] Configure acceptance test harness for UC-11 suite execution in `tests/acceptance/uc-11-as.test.js`
- [ ] T014 [UC-11] [UC-11-AS] Configure c8 coverage gate targeting 100% line coverage for in-scope JavaScript in `package.json`

**Checkpoint**: Foundational architecture is ready for independent story implementation.

---

## Phase 3: User Story 1 - Record Final Paper Decision (Priority: P1) 🎯 MVP

**Goal**: Let an authorized editor save a final decision (Accept/Reject/Revise), reload it, and enforce immutability/first-write-wins.

**Independent Test Criteria**: With available reviews, save a final decision, reload the same paper to confirm persistence, attempt unauthorized or conflicting changes, and verify denial while the first saved final decision remains unchanged.

### Validation Tasks

- [ ] T015 [P] [US1] [UC-11] [UC-11-AS] Add acceptance tests for final decision save and reload behavior in `tests/acceptance/uc-11-as.test.js`
- [ ] T016 [P] [US1] [UC-11] [UC-11-AS] Add model unit tests for valid final outcomes and immutable final-state rules in `tests/unit/models/decision-model.test.js`
- [ ] T017 [P] [US1] [UC-11] [UC-11-AS] Add integration tests for unassigned-editor denial and version-conflict handling in `tests/integration/decision-api.test.js`

### Implementation Tasks

- [ ] T018 [US1] [UC-11] [UC-11-AS] Implement `FINAL` decision state transition and expected-version conflict checks in `src/models/decision-model.js`
- [ ] T019 [US1] [UC-11] [UC-11-AS] Implement final action audit payload creation (`SUCCESS_FINAL`, `DENIED_IMMUTABLE`, `DENIED_CONFLICT`, `DENIED_UNASSIGNED`) in `src/models/decision-audit-model.js`
- [ ] T020 [US1] [UC-11] [UC-11-AS] Implement controller load/save flow for final decisions with override workflow routing on immutable conflict in `src/controllers/editor-decision-controller.js`
- [ ] T021 [P] [US1] [UC-11] [UC-11-AS] Implement evaluations list rendering, final outcome controls, and read-only final-state view in `src/views/editor-decision-view.js`
- [ ] T022 [P] [US1] [UC-11] [UC-11-AS] Implement submit wiring, idempotency-key header handling, and reload refresh in `src/assets/js/decision-workflow-page.js`
- [ ] T023 [US1] [UC-11] [UC-11-AS] Update final-decision page markup and immutable-state visual feedback in `src/index.html` and `src/assets/css/editor-decision.css`
- [ ] T024 [US1] [UC-11] [UC-11-AS] Execute UC-11 final-decision acceptance scenarios and record evidence in `tests/acceptance/uc-11-as.test.js`
- [ ] T025 [US1] [UC-11] [UC-11-AS] Record US1 coverage evidence for model/controller/view files in `specs/001-editor-decision/quickstart.md`

**Checkpoint**: Final decision recording is independently verifiable and ready for MVP demo.

---

## Phase 4: User Story 2 - Defer a Paper Decision (Priority: P2)

**Goal**: Allow an editor to save defer so the paper stays undecided and can later receive a final decision.

**Independent Test Criteria**: Save a deferred decision, verify paper remains undecided after reload, then save a later final decision successfully.

### Validation Tasks

- [ ] T026 [P] [US2] [UC-11] [UC-11-AS] Add acceptance tests for defer save and undecided-state persistence in `tests/acceptance/uc-11-as.test.js`
- [ ] T027 [P] [US2] [UC-11] [UC-11-AS] Add model unit tests for `DEFER` command rules and state continuity in `tests/unit/models/decision-model.test.js`

### Implementation Tasks

- [ ] T028 [US2] [UC-11] [UC-11-AS] Implement `DEFER` command handling and undecided-state version updates in `src/models/decision-model.js`
- [ ] T029 [US2] [UC-11] [UC-11-AS] Implement defer action audit payload creation (`SUCCESS_DEFER` and denied defer outcomes) in `src/models/decision-audit-model.js`
- [ ] T030 [US2] [UC-11] [UC-11-AS] Extend controller flow to submit defer commands and permit later final saves after defer in `src/controllers/editor-decision-controller.js`
- [ ] T031 [P] [US2] [UC-11] [UC-11-AS] Implement defer option UI and undecided-state status messaging in `src/views/editor-decision-view.js`
- [ ] T032 [P] [US2] [UC-11] [UC-11-AS] Implement defer selection/reset behavior in `src/assets/js/decision-workflow-page.js`
- [ ] T033 [US2] [UC-11] [UC-11-AS] Execute UC-11 defer acceptance scenarios and record evidence in `tests/acceptance/uc-11-as.test.js`
- [ ] T034 [US2] [UC-11] [UC-11-AS] Record US2 defer-path coverage evidence in `specs/001-editor-decision/quickstart.md`

**Checkpoint**: Defer flow is independently verifiable and coexists with US1 final-save behavior.

---

## Phase 5: User Story 3 - Handle Unsuccessful Save Attempts (Priority: P3)

**Goal**: Show clear failure outcomes when save attempts fail and support retry without incorrect success assumptions.

**Independent Test Criteria**: Simulate save failures, verify failure messaging states that no decision was recorded, then retry and confirm successful persistence.

### Validation Tasks

- [ ] T035 [P] [US3] [UC-11] [UC-11-AS] Add acceptance and integration tests for failed save messaging and retry success in `tests/acceptance/uc-11-as.test.js` and `tests/integration/decision-api.test.js`
- [ ] T036 [P] [US3] [UC-11] [UC-11-AS] Add controller unit tests for retry sequencing and duplicate-submit suppression in `tests/unit/controllers/editor-decision-controller.test.js`

### Implementation Tasks

- [ ] T037 [US3] [UC-11] [UC-11-AS] Implement controller error mapping for `400/403/409/412/422` responses with retry-safe state transitions in `src/controllers/editor-decision-controller.js`
- [ ] T038 [US3] [UC-11] [UC-11-AS] Implement view rendering for failure states, retry prompts, and explicit non-success feedback in `src/views/editor-decision-view.js`
- [ ] T039 [US3] [UC-11] [UC-11-AS] Implement bootstrap request lifecycle logic to re-enable save after failure while preserving selected decision in `src/assets/js/decision-workflow-page.js`
- [ ] T040 [US3] [UC-11] [UC-11-AS] Surface denied-action audit context in failure handling paths in `src/models/decision-audit-model.js`
- [ ] T041 [US3] [UC-11] [UC-11-AS] Execute failure-and-retry acceptance scenarios and record evidence in `tests/acceptance/uc-11-as.test.js`
- [ ] T042 [US3] [UC-11] [UC-11-AS] Record US3 failure-path coverage evidence in `specs/001-editor-decision/quickstart.md`

**Checkpoint**: Failure handling and retry path are independently verifiable with no false-success outcomes.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete regression safety, coverage enforcement, and documentation across all stories.

- [ ] T043 [P] [UC-11] [UC-11-AS] Update full FR-to-story-to-test traceability and completion status in `specs/001-editor-decision/traceability.md`
- [ ] T044 [UC-11] [UC-11-AS] Run full UC-11 acceptance regression and store summary in `tests/acceptance/regression-report.md`
- [ ] T045 [UC-11] [UC-11-AS] Enforce combined `npm test && npm run lint` workflow and c8 reporting in `package.json` and `README.md`
- [ ] T046 [P] [UC-11] [UC-11-AS] Add missing edge-case unit tests to close uncovered lines in `tests/unit/models/decision-model.test.js` and `tests/unit/controllers/editor-decision-controller.test.js`
- [ ] T047 [P] [UC-11] [UC-11-AS] Refactor duplicated decision constants/messages across MVC modules in `src/models/decision-model.js`, `src/controllers/editor-decision-controller.js`, and `src/views/editor-decision-view.js`
- [ ] T048 [UC-11] [UC-11-AS] Finalize implementation and verification instructions with evidence links in `specs/001-editor-decision/quickstart.md`
- [ ] T049 [P] [UC-11] [UC-11-AS] Implement workflow duration benchmark for SC-002 in `tests/performance/decision-workflow-duration.test.js`
- [ ] T050 [UC-11] [UC-11-AS] Record SC-002 performance evidence (>=95% under 2 minutes) in `tests/performance/uc-11-duration-report.md`
- [ ] T051 [P] [UC-11] [UC-11-AS] Implement save-to-visible latency verification for SC-003 in `tests/integration/decision-persistence-latency.test.js`
- [ ] T052 [UC-11] [UC-11-AS] Record SC-003 latency evidence (99% within 5 seconds) in `tests/integration/decision-persistence-latency-report.md`
- [ ] T053 [P] [UC-11] [UC-11-AS] Add integration assertions for `SUCCESS_FINAL` and `SUCCESS_DEFER` audit outcomes in `tests/integration/decision-api.test.js`
- [ ] T054 [P] [UC-11] [UC-11-AS] Add integration assertions for denied audit outcomes (`DENIED_UNASSIGNED`, `DENIED_IMMUTABLE`, `DENIED_CONFLICT`, `DENIED_PRECONDITION`, `DENIED_INVALID`) in `tests/integration/decision-api.test.js`
- [ ] T055 [UC-11] [UC-11-AS] Implement audit-write failure handling as not-recorded with retry in `src/controllers/editor-decision-controller.js` and `tests/integration/decision-api.test.js`
- [ ] T056 [UC-11] [UC-11-AS] Add acceptance coverage for audit-write failure non-success and retry path in `tests/acceptance/uc-11-as.test.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all user story phases.
- US1 (Phase 3) depends on Foundational completion.
- US2 (Phase 4) depends on US1 because defer flow must allow later final save behavior already implemented in US1.
- US3 (Phase 5) depends on US1 and can run in parallel with US2 after US1 is stable.
- Polish (Phase 6) depends on all user story phases.

### User Story Dependency Graph

- `US1 -> US2`
- `US1 -> US3`
- `US2 -> Polish`
- `US3 -> Polish`

### Parallel Execution Examples Per Story

- US1: Run `T015`, `T016`, and `T017` in parallel; run `T021` and `T022` in parallel after `T020`.
- US2: Run `T026` and `T027` in parallel; run `T031` and `T032` in parallel after `T030`.
- US3: Run `T035` and `T036` in parallel; run `T038` and `T039` in parallel after `T037`.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver US1 end-to-end (Phase 3).
3. Run UC-11 acceptance checks and coverage evidence tasks for US1.
4. Demo/ship MVP with immutable final decision recording.

### Incremental Delivery

1. Add US2 defer behavior and verify independent criteria.
2. Add US3 failure/retry behavior and verify independent criteria.
3. Run full acceptance regression and finalize polish tasks.

### Team Parallelization

1. One developer completes shared setup/foundational work.
2. After US1 baseline, split US2 and US3 across developers.
3. Merge only with passing acceptance evidence and coverage documentation.
