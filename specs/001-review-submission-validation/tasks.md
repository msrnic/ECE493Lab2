# Tasks: Review Submission Validation

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/review-submission.openapi.yaml`, `quickstart.md`

**Tests**: Tests are required for this feature because `spec.md` and `plan.md` explicitly require UC-09 acceptance validation, API/unit verification, and coverage reporting.

**Organization**: Tasks are grouped by user story (`US1`, `US2`, `US3`) so each story can be implemented and tested independently.

## Phase 1: Setup (Project Initialization)

**Purpose**: Establish Node/Express MVC scaffolding and traceability baseline.

- [ ] T001 Initialize project scripts and metadata for lint/test/coverage in `package.json` (UC-09 / UC-09-AS)
- [ ] T002 Install and lock runtime/test dependencies (Express, Ajv, Vitest, Supertest, c8) in `package-lock.json` (UC-09 / UC-09-AS)
- [ ] T003 [P] Create MVC and API directory structure in `src/models/`, `src/views/`, `src/controllers/`, `src/api/`, `src/assets/css/`, `src/assets/js/` (UC-09 / UC-09-AS)
- [ ] T004 [P] Create base application entry files in `src/app.js`, `src/server.js`, and `src/index.html` (UC-09 / UC-09-AS)
- [ ] T005 [P] Create testing scaffolding and baseline config in `vitest.config.js`, `tests/unit/`, `tests/integration/`, and `tests/acceptance/` (UC-09 / UC-09-AS)
- [ ] T006 Create UC-09 traceability baseline for FR-001..FR-009 and NFR-001..NFR-003 in `specs/001-review-submission-validation/traceability.md` (UC-09 / UC-09-AS)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared architecture required before story implementation.

**⚠️ CRITICAL**: No user story work should start until this phase is complete.

- [ ] T007 Implement shared request-schema validation and normalization with Ajv in `src/models/review-submission-model.js` (UC-09 / UC-09-AS)
- [ ] T008 [P] Implement persistent review record repository with one-time completion guard in `src/models/review-record-model.js` (UC-09 / UC-09-AS)
- [ ] T009 [P] Implement transient validation feedback factory (`missingFields`, `messages`) in `src/models/validation-feedback-model.js` (UC-09 / UC-09-AS)
- [ ] T010 [P] Implement reviewer-paper assignment access adapter (`ACTIVE`/`REVOKED`) in `src/models/reviewer-paper-assignment-model.js` (UC-09 / UC-09-AS)
- [ ] T011 Implement Express route mounting and middleware bootstrap in `src/app.js` (UC-09 / UC-09-AS)
- [ ] T012 Implement OpenAPI route skeleton for status and submit endpoints in `src/api/review-submission-routes.js` (UC-09 / UC-09-AS)
- [ ] T013 Create shared test fixtures for assignments and review payloads in `tests/fixtures/review-submission-fixtures.js` (UC-09 / UC-09-AS)
- [ ] T014 Configure 100% line-coverage target for in-scope JavaScript in `vitest.config.js` and `package.json` (UC-09 / UC-09-AS)

**Checkpoint**: Foundation ready for independent user-story delivery.

---

## Phase 3: User Story 1 - Submit a Complete Review (Priority: P1) 🎯 MVP

**Goal**: Allow an authorized reviewer to submit a fully completed review and persist a `COMPLETED` review record.

**Independent Test**: Submit a form with all required fields completed, verify `POST /api/reviewer-assignments/{assignmentId}/review-submissions` returns `201`, then verify `GET /api/reviewer-assignments/{assignmentId}/review-status` returns `COMPLETED`.

### Tests

- [ ] T015 [P] [US1] Add unit tests for valid payload acceptance and record creation in `tests/unit/models/review-submission-model.test.js` and `tests/unit/models/review-record-model.test.js` (UC-09 / UC-09-AS)
- [ ] T016 [P] [US1] Add integration tests for successful submit/status flow in `tests/integration/review-submission-api.integration.test.js` (UC-09 / UC-09-AS)
- [ ] T017 [US1] Add UC-09 happy-path acceptance scenario coverage in `tests/acceptance/uc-09-submit-review.acceptance.test.js` (UC-09 / UC-09-AS)

### Implementation

- [ ] T018 [P] [US1] Implement required review form HTML fields in `src/views/templates/review-form.html` (UC-09 / UC-09-AS)
- [ ] T019 [P] [US1] Implement form rendering and payload extraction in `src/views/review-form-view.js` (UC-09 / UC-09-AS)
- [ ] T020 [US1] Implement happy-path submit orchestration in `src/controllers/review-submission-controller.js` (UC-09 / UC-09-AS)
- [ ] T021 [US1] Implement successful `201 COMPLETED` API behavior in `src/api/review-submission-routes.js` (UC-09 / UC-09-AS)
- [ ] T022 [US1] Wire page bootstrap and submit handler registration in `src/assets/js/review-form-page.js` (UC-09 / UC-09-AS)
- [ ] T023 [US1] Re-run US1 unit/integration/acceptance tests and record evidence in `tests/acceptance/uc-09-submit-review.acceptance.test.js` (UC-09 / UC-09-AS)

**Checkpoint**: US1 is complete and independently verifiable.

---

## Phase 4: User Story 2 - Correct Missing Fields (Priority: P2)

**Goal**: Block incomplete submissions, show field-level completion guidance, and preserve entered values in the active session without persisting drafts.

**Independent Test**: Submit with at least one required field missing or whitespace-only, verify `400 VALIDATION_FAILED` with `missingFields`, verify no review record write, complete missing fields, and resubmit successfully.

### Tests

- [ ] T024 [P] [US2] Add unit tests for missing/whitespace required-field detection in `tests/unit/models/review-submission-model.test.js` and `tests/unit/models/validation-feedback-model.test.js` (UC-09 / UC-09-AS)
- [ ] T025 [P] [US2] Add integration tests for `400` validation responses and no-persistence behavior in `tests/integration/review-submission-api.integration.test.js` (UC-09 / UC-09-AS)
- [ ] T026 [US2] Add acceptance coverage for completion-request behavior from `UC-09-AS` in `tests/acceptance/uc-09-submit-review.acceptance.test.js` (UC-09 / UC-09-AS)

### Implementation

- [ ] T027 [P] [US2] Implement canonical `missingFields` and field message generation in `src/models/validation-feedback-model.js` (UC-09 / UC-09-AS)
- [ ] T028 [P] [US2] Implement controller-managed in-session value preservation after failed validation in `src/controllers/review-submission-controller.js` (UC-09 / UC-09-AS)
- [ ] T029 [US2] Implement missing-field error rendering and value rehydration in `src/views/review-form-view.js` (UC-09 / UC-09-AS)
- [ ] T030 [US2] Implement API `400 VALIDATION_FAILED` path with persistence blocking in `src/api/review-submission-routes.js` (UC-09 / UC-09-AS)
- [ ] T031 [US2] Add validation feedback and error-state styling in `src/assets/css/review-form.css` (UC-09 / UC-09-AS)
- [ ] T032 [US2] Re-run US2 tests plus US1 regression and record evidence in `tests/acceptance/uc-09-submit-review.acceptance.test.js` (UC-09 / UC-09-AS)

**Checkpoint**: US2 is complete and independently verifiable.

---

## Phase 5: User Story 3 - Preserve Submission Integrity (Priority: P3)

**Goal**: Reject unauthorized, duplicate, and concurrent invalid submission attempts while preserving the first completed review record.

**Independent Test**: Verify `403` for revoked access, `409 REVIEW_ALREADY_COMPLETED` for resubmission after completion, and in concurrent valid submits verify exactly one `201` and remaining `409 CONCURRENT_SUBMISSION_REJECTED`.

### Tests

- [ ] T033 [P] [US3] Add unit tests for access, completion-conflict, and duplicate decision branches in `tests/unit/controllers/review-submission-controller.test.js` (UC-09 / UC-09-AS)
- [ ] T034 [P] [US3] Add integration tests for `403`/`409` and concurrent submission races in `tests/integration/review-submission-api.integration.test.js` (UC-09 / UC-09-AS)
- [ ] T035 [US3] Add acceptance/regression integrity checks for unauthorized and duplicate submits in `tests/acceptance/uc-09-submit-review.acceptance.test.js` (UC-09 / UC-09-AS)

### Implementation

- [ ] T036 [P] [US3] Implement assignment access-state enforcement for submit/status actions in `src/controllers/review-submission-controller.js` (UC-09 / UC-09-AS)
- [ ] T037 [P] [US3] Implement conflict response mapping (`REVIEW_ALREADY_COMPLETED`, `CONCURRENT_SUBMISSION_REJECTED`) in `src/api/review-submission-routes.js` (UC-09 / UC-09-AS)
- [ ] T038 [US3] Implement atomic first-successful-submit protection in `src/models/review-record-model.js` (UC-09 / UC-09-AS)
- [ ] T039 [US3] Implement rapid repeat-submit duplicate suppression using assignment completion state in `src/controllers/review-submission-controller.js` (UC-09 / UC-09-AS)
- [ ] T040 [US3] Re-run US3 tests plus US1/US2 regressions and record evidence in `tests/acceptance/uc-09-submit-review.acceptance.test.js` (UC-09 / UC-09-AS)

**Checkpoint**: US3 is complete and independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening across all stories.

- [ ] T041 [P] Run full UC-09 acceptance execution and capture final run output in `tests/acceptance/uc-09-final-regression.log` (UC-09 / UC-09-AS)
- [ ] T042 Enforce/report final coverage metrics with c8 output in `coverage/coverage-summary.json` (UC-09 / UC-09-AS)
- [ ] T043 [P] Add final unit/integration edge-case refinements in `tests/unit/` and `tests/integration/` (UC-09 / UC-09-AS)
- [ ] T044 Update implementation and verification notes for UC-09 in `specs/001-review-submission-validation/quickstart.md` (UC-09 / UC-09-AS)
- [ ] T045 [P] Add p95 latency performance tests for validation feedback and submit response in `tests/performance/review-submission.perf.test.js` (UC-09 / UC-09-AS)
- [ ] T046 Configure performance verification command and thresholds (<100ms feedback, <500ms submit p95) in `package.json` and `vitest.config.js` (UC-09 / UC-09-AS)
- [ ] T047 Capture UC-09 performance evidence report from perf runs in `tests/acceptance/uc-09-performance-report.md` (UC-09 / UC-09-AS)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): depends on Setup and blocks all story phases.
- User Story phases (Phase 3-5): depend on Foundational completion.
- Polish (Phase 6): depends on completion of all selected stories.

### User Story Dependency Graph

- `US1 -> US2 -> US3`
- `US1` delivers the MVP submission path and completed-state baseline used by later stories.
- `US2` extends `US1` flow with validation feedback and session-preserved correction.
- `US3` hardens the same flow with authorization, conflict, and concurrency protections.

### Parallel Execution Examples Per User Story

- US1 example: run `T015` and `T016` together, then run `T018` and `T019` together.
- US2 example: run `T024` and `T025` together, then run `T027` and `T028` together.
- US3 example: run `T033` and `T034` together, then run `T036` and `T037` together.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver US1 end-to-end (Phase 3).
3. Validate success via US1 independent test and acceptance evidence.
4. Demo or ship MVP before taking US2/US3.

### Incremental Delivery

1. Add US2 (validation feedback and no-draft persistence).
2. Add US3 (authorization/conflict/concurrency integrity).
3. Run regression and coverage gates after each increment.

### Team Parallelization Strategy

1. One developer completes shared foundation (Phase 1-2).
2. One developer drives API/controller-heavy tasks while another drives view/CSS tasks marked `[P]` within each story.
3. Merge only after story-specific independent tests and regression checks pass.
