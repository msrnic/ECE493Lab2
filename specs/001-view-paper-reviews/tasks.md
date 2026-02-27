# Tasks: Editor Review Visibility

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-paper-reviews/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/review-visibility.openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation for `Acceptance Tests/UC-10-AS.md`, SC-002 performance validation, SC-005 usability validation, and c8 coverage evidence are required for this feature.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the project skeleton and quality gates needed for all stories.

- [ ] T001 [UC-10] [UC-10-AS] Initialize Node.js project metadata and scripts in `package.json`
- [ ] T002 [UC-10] [UC-10-AS] Create MVC directories and baseline files in `src/models/`, `src/controllers/`, `src/views/`, `src/assets/css/`, and `src/assets/js/`
- [ ] T003 [P] [UC-10] [UC-10-AS] Configure Jest execution settings in `jest.config.js`
- [ ] T004 [P] [UC-10] [UC-10-AS] Configure c8 coverage thresholds (100% lines/functions/branches/statements) in `.c8rc.json`
- [ ] T005 [UC-10] [UC-10-AS] Create UC-10 request-outcome traceability schema in `specs/001-view-paper-reviews/traceability.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared model/controller foundations that block user-story work until complete.

**⚠️ CRITICAL**: No user story starts before this phase is complete.

- [ ] T006 [UC-10] [UC-10-AS] Implement paper lookup helpers in `src/models/paper-model.js`
- [ ] T007 [P] [UC-10] [UC-10-AS] Implement review repository helpers and status constants in `src/models/review-model.js`
- [ ] T008 [P] [UC-10] [UC-10-AS] Implement paper/track editor-assignment lookup helpers in `src/models/editor-assignment-model.js`
- [ ] T009 [P] [UC-10] [UC-10-AS] Implement review-access audit persistence and retention purge helper in `src/models/review-access-audit-model.js`
- [ ] T010 [UC-10] [UC-10-AS] Implement review page/API route wiring in `src/controllers/review-page-controller.js` and `src/controllers/review-api-controller.js`
- [ ] T011 [UC-10] [UC-10-AS] Create shared fixtures for papers, reviews, assignments, and audit events in `tests/fixtures/review-visibility-fixtures.js`

**Checkpoint**: Foundation complete; user-story implementation can begin.

---

## Phase 3: User Story 1 - View Completed Reviews (Priority: P1) 🎯 MVP

**Goal**: Authorized assigned editors can view all completed reviews (with reviewer identities), unauthorized requests receive only the generic unavailable response, and successful views are audited.

**Independent Test Criteria**: Request a paper containing both submitted and non-submitted reviews as an assigned editor; verify only submitted reviews are shown with reviewer identity, unauthorized request returns `Paper reviews unavailable`, and a successful request creates an audit entry.

### Validation Tasks

- [ ] T012 [P] [US1] [UC-10] [UC-10-AS] Encode UC-10-AS completed-review scenario checks in `tests/acceptance/uc-10-view-reviews.acceptance.test.js`
- [ ] T013 [P] [US1] [UC-10] [UC-10-AS] Add integration tests for authorized available and unauthorized unavailable responses on `GET /api/papers/:paperId/reviews` in `tests/integration/review-api-controller.test.js`
- [ ] T014 [P] [US1] [UC-10] [UC-10-AS] Add unit tests for submitted-only filtering and reviewer identity projection in `tests/unit/review-model.test.js`
- [ ] T015 [P] [US1] [UC-10] [UC-10-AS] Add unit tests for audit entry creation and one-year retention metadata in `tests/unit/review-access-audit-model.test.js`

### Implementation Tasks

- [ ] T016 [US1] [UC-10] [UC-10-AS] Implement submitted-review filtering and review summary projection in `src/models/review-model.js`
- [ ] T017 [US1] [UC-10] [UC-10-AS] Implement assigned-editor authorization checks (paper and track scope) in `src/models/editor-assignment-model.js`
- [ ] T018 [US1] [UC-10] [UC-10-AS] Implement available/unavailable API branches, successful-access audit trigger, and FR-006 outcome traceability emission in `src/controllers/review-api-controller.js`
- [ ] T019 [US1] [UC-10] [UC-10-AS] Implement available-review page flow in `src/controllers/review-page-controller.js`, `src/assets/js/editor-reviews.js`, and `src/views/editor-reviews.html`
- [ ] T020 [US1] [UC-10] [UC-10-AS] Add reviewer identity styling and record UC-10-AS completed-review evidence in `src/assets/css/editor-reviews.css` and `specs/001-view-paper-reviews/acceptance-evidence.md`

**Checkpoint**: US1 delivers MVP behavior and is independently verifiable.

---

## Phase 4: User Story 2 - Show Pending Review Status (Priority: P2)

**Goal**: Authorized editors selecting papers without completed reviews receive a clear pending status rather than empty or ambiguous output.

**Independent Test Criteria**: Request a paper with zero submitted reviews as an assigned editor; verify API returns `status: pending` with an empty `reviews` array and UI displays pending messaging.

### Validation Tasks

- [ ] T021 [P] [US2] [UC-10] [UC-10-AS] Encode UC-10-AS pending-review scenario checks in `tests/acceptance/uc-10-view-reviews.acceptance.test.js`
- [ ] T022 [P] [US2] [UC-10] [UC-10-AS] Add integration test coverage for pending response shape on `GET /api/papers/:paperId/reviews` in `tests/integration/review-api-controller.test.js`
- [ ] T023 [P] [US2] [UC-10] [UC-10-AS] Add unit tests for pending-state response invariants in `tests/unit/review-model.test.js`

### Implementation Tasks

- [ ] T024 [US2] [UC-10] [UC-10-AS] Implement pending-result construction when no submitted reviews exist in `src/models/review-model.js`
- [ ] T025 [US2] [UC-10] [UC-10-AS] Implement pending API response branch (`200`, `status=pending`, empty `reviews`) in `src/controllers/review-api-controller.js`
- [ ] T026 [US2] [UC-10] [UC-10-AS] Implement pending-state rendering logic in `src/assets/js/editor-reviews.js` and `src/views/editor-reviews.html`
- [ ] T027 [US2] [UC-10] [UC-10-AS] Add pending-status visual treatment and copy in `src/assets/css/editor-reviews.css`
- [ ] T028 [US2] [UC-10] [UC-10-AS] Execute full `Acceptance Tests/UC-10-AS.md` and record pending-scenario evidence in `specs/001-view-paper-reviews/acceptance-evidence.md`

**Checkpoint**: US2 is independently verifiable and preserves US1 behavior.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, regression safety, and documentation updates across stories.

- [ ] T029 [P] [UC-10] [UC-10-AS] Update FR-001 to FR-011 traceability and evidence links in `specs/001-view-paper-reviews/traceability.md`
- [ ] T030 [P] [UC-10] [UC-10-AS] Add edge-case unit tests (mixed states, unavailable transitions) in `tests/unit/review-model.test.js` and `tests/unit/editor-assignment-model.test.js`
- [ ] T031 [P] [UC-10] [UC-10-AS] Refactor duplicated review-response orchestration while preserving MVC boundaries in `src/controllers/review-api-controller.js` and `src/assets/js/editor-reviews.js`
- [ ] T032 [P] [UC-10] [UC-10-AS] Add latency/performance integration test for `GET /api/papers/:paperId/reviews` in `tests/integration/review-api-performance.test.js`
- [ ] T033 [UC-10] [UC-10-AS] Record SC-002 benchmark evidence in `specs/001-view-paper-reviews/performance-report.md`
- [ ] T034 [P] [UC-10] [UC-10-AS] Define scripted usability protocol for SC-005 in `specs/001-view-paper-reviews/usability-protocol.md`
- [ ] T035 [UC-10] [UC-10-AS] Record SC-005 usability results in `specs/001-view-paper-reviews/usability-results.md`
- [ ] T036 [UC-10] [UC-10-AS] Run full acceptance regression and store results in `specs/001-view-paper-reviews/regression-report.md`
- [ ] T037 [UC-10] [UC-10-AS] Enforce c8 100% thresholds and capture final coverage summary in `specs/001-view-paper-reviews/coverage-report.md`
- [ ] T038 [UC-10] [UC-10-AS] Update manual validation and curl examples in `specs/001-view-paper-reviews/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all story phases.
- US1 (Phase 3) depends on Foundational completion.
- US2 (Phase 4) depends on Foundational and builds on US1 API/UI baseline.
- Polish (Phase 5) depends on completion of US1 and US2.

### User Story Dependency Graph

`Phase 1 Setup -> Phase 2 Foundational -> Phase 3 US1 (P1) -> Phase 4 US2 (P2) -> Phase 5 Polish`

---

## Parallel Execution Examples

### US1 Parallel Work

- Run `T012`, `T013`, `T014`, and `T015` in parallel once Phase 2 is complete.
- Run `T016` and `T017` in parallel before merging into `T018`.

### US2 Parallel Work

- Run `T021`, `T022`, and `T023` in parallel once US1 is stable.
- Run `T026` and `T027` in parallel after `T025` defines pending response semantics.

---

## Implementation Strategy

### MVP First (Suggested Scope)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) end-to-end.
3. Validate UC-10 completed-review scenario and required coverage gates.
4. Demo/ship MVP with completed review visibility, authorization-safe unavailable response, and audit logging.

### Incremental Delivery

1. Add Phase 4 (US2) pending-status behavior.
2. Re-run `Acceptance Tests/UC-10-AS.md` and regression checks.
3. Complete Phase 5 polish tasks and finalize documentation artifacts.
