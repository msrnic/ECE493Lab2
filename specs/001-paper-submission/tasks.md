---
description: "Task list for Author Paper Submission implementation"
---

# Tasks: Author Paper Submission

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation tasks are included for `Acceptance Tests/UC-04-AS.md`. Coverage tasks are included and must target 100% line coverage for in-scope project-owned JavaScript, with a hard floor of 95%.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize project scaffolding and baseline execution tooling.

- [ ] T001 [UC-04] [UC-04-AS] Initialize Node.js project scripts for app, acceptance tests, and coverage in `/home/m_srnic/ece493/lab2/ECE493Lab2/package.json`
- [ ] T002 [UC-04] [UC-04-AS] Create Express bootstrap and HTTP entrypoint in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/app.js` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/server.js`
- [ ] T003 [P] [UC-04] [UC-04-AS] Create MVC/test directory scaffolding with placeholder files in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/.gitkeep`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/.gitkeep`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/.gitkeep`, `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/.gitkeep`, and `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/.gitkeep`
- [ ] T004 [P] [UC-04] [UC-04-AS] Add base static asset entry files in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/submit-paper.css` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/submit-paper-page.js`
- [ ] T005 [P] [UC-04] [UC-04-AS] Add base submission view shell files in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper.html` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper-view.js`
- [ ] T006 [UC-04] [UC-04-AS] Create acceptance and coverage evidence stubs in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-evidence.md` and `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-04-coverage.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared architecture and policy components required by all user stories.

**⚠️ CRITICAL**: No user story work should begin until this phase is complete.

- [ ] T007 [UC-04] [UC-04-AS] Implement shared submission constants and policy configuration in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/config/submission-config.js`
- [ ] T008 [P] [UC-04] [UC-04-AS] Implement storage adapter abstraction and default implementation in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/services/storage-service.js`
- [ ] T009 [P] [UC-04] [UC-04-AS] Implement malware/security scan adapter abstraction and default implementation in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/services/scan-service.js`
- [ ] T010 [P] [UC-04] [UC-04-AS] Implement submission persistence repository in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/repositories/submission-repository.js`
- [ ] T011 [P] [UC-04] [UC-04-AS] Implement file persistence repository in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/repositories/file-repository.js`
- [ ] T012 [UC-04] [UC-04-AS] Implement session retry-state repository in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/repositories/session-state-repository.js`
- [ ] T013 [UC-04] [UC-04-AS] Configure test runner, coverage thresholds (100% target / 95% floor), and reporting in `/home/m_srnic/ece493/lab2/ECE493Lab2/package.json` and `/home/m_srnic/ece493/lab2/ECE493Lab2/.nycrc.json`

**Checkpoint**: Foundation complete; user story phases can begin.

---

## Phase 3: User Story 1 - Submit New Paper (Priority: P1) 🎯 MVP

**Goal**: Allow a logged-in author to submit required metadata and files, persist a submitted paper, and receive confirmation.

**Acceptance Suite**: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-04-AS.md`

**Independent Test**: With a logged-in author, submit complete metadata and files, verify the paper is stored as submitted, and verify confirmation is displayed.

### Validation and Test Tasks

- [ ] T014 [P] [UC-04] [UC-04-AS] [US1] Translate UC-04-AS successful-submission scenarios into executable acceptance checks in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-submission.spec.js`
- [ ] T015 [P] [UC-04] [UC-04-AS] [US1] Add PaperSubmission happy-path unit tests for draft-to-submitted transition in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/submission-model.spec.js`
- [ ] T016 [P] [UC-04] [UC-04-AS] [US1] Add submission controller success-path unit tests for create/finalize/status handlers in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/submission-controller.spec.js`

### Implementation Tasks

- [ ] T017 [UC-04] [UC-04-AS] [US1] Implement PaperSubmission domain model, statuses, and submitted transition rules in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/submission-model.js`
- [ ] T018 [P] [UC-04] [UC-04-AS] [US1] Implement SubmissionFile domain model for required file category handling in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/file-model.js`
- [ ] T019 [P] [UC-04] [UC-04-AS] [US1] Implement submission view model for metadata capture and confirmation rendering in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper-view.js`
- [ ] T020 [UC-04] [UC-04-AS] [US1] Implement `POST /api/v1/submissions` and `POST /api/v1/submissions/{submissionId}/submit` handlers in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/submission-controller.js`
- [ ] T021 [P] [UC-04] [UC-04-AS] [US1] Implement `GET /api/v1/submissions/{submissionId}` handler for submission state retrieval in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/status-controller.js`
- [ ] T022 [UC-04] [UC-04-AS] [US1] Implement submission page structure and confirmation state styles in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper.html` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/submit-paper.css`
- [ ] T023 [UC-04] [UC-04-AS] [US1] Wire browser submission flow with Fetch + FormData contract calls in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/submit-paper-page.js`
- [ ] T024 [UC-04] [UC-04-AS] [US1] Execute UC-04-AS happy-path checks and capture acceptance/coverage evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-evidence.md` and `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-04-coverage.md`

**Checkpoint**: US1 is complete and independently verifiable.

---

## Phase 4: User Story 2 - Recover From File Upload Failure (Priority: P2)

**Goal**: Allow upload retry after failure without losing valid progress during the active session.

**Acceptance Suite**: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-04-AS.md`

**Independent Test**: Trigger file upload failure, verify retry prompt appears, retry with a valid upload, and verify submission completes.

### Validation and Test Tasks

- [ ] T025 [P] [UC-04] [UC-04-AS] [US2] Translate UC-04-AS upload-failure extension scenarios into executable acceptance checks in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-submission.spec.js`
- [ ] T026 [P] [UC-04] [UC-04-AS] [US2] Add upload-controller unit tests for retry_required responses and unlimited retry behavior in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/upload-controller.spec.js`
- [ ] T027 [P] [UC-04] [UC-04-AS] [US2] Add session-state unit tests for metadata/file preservation across retries in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/session-state-model.spec.js`

### Implementation Tasks

- [ ] T028 [UC-04] [UC-04-AS] [US2] Implement session-scoped retry preservation model for metadata and valid files in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/session-state-model.js`
- [ ] T029 [P] [UC-04] [UC-04-AS] [US2] Implement action-sequence deduplication and idempotency guard rules in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/deduplication-model.js`
- [ ] T030 [UC-04] [UC-04-AS] [US2] Implement `POST /api/v1/submissions/{submissionId}/files` upload handler with retry_required outcomes in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/upload-controller.js`
- [ ] T031 [P] [UC-04] [UC-04-AS] [US2] Implement upload/save failure transitions and retry-to-draft recovery rules in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/submission-model.js`
- [ ] T032 [P] [UC-04] [UC-04-AS] [US2] Implement retry prompt and preserved-state hydration in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper-view.js` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/submit-paper-page.js`
- [ ] T033 [UC-04] [UC-04-AS] [US2] Implement retry-state retrieval shaping for `GET /api/v1/submissions/{submissionId}` in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/status-controller.js`
- [ ] T034 [UC-04] [UC-04-AS] [US2] Execute UC-04-AS retry-path checks and update acceptance/coverage evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-evidence.md` and `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-04-coverage.md`

**Checkpoint**: US2 is complete and independently verifiable.

---

## Phase 5: User Story 3 - Block Incomplete or Invalid Submission (Priority: P3)

**Goal**: Block incomplete/invalid submissions and provide actionable validation feedback before finalization.

**Acceptance Suite**: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-04-AS.md`

**Independent Test**: Submit missing metadata or invalid file attributes, verify submission is blocked, and verify corrective feedback is displayed.

### Validation and Test Tasks

- [ ] T035 [P] [UC-04] [UC-04-AS] [US3] Translate invalid-input and blocked-submit scenarios into executable acceptance checks in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-submission.spec.js`
- [ ] T036 [P] [UC-04] [UC-04-AS] [US3] Add unit tests for metadata validation and validation_failed status behavior in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/submission-model.spec.js`
- [ ] T037 [P] [UC-04] [UC-04-AS] [US3] Add unit tests for file type/size and scan-failure blocking rules in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/file-model.spec.js`

### Implementation Tasks

- [ ] T038 [UC-04] [UC-04-AS] [US3] Implement required metadata validation and validation error payload construction in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/submission-model.js`
- [ ] T039 [P] [UC-04] [UC-04-AS] [US3] Implement file policy (type/size) and scan-status enforcement in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/file-model.js`
- [ ] T040 [UC-04] [UC-04-AS] [US3] Implement `POST /api/v1/submissions/{submissionId}/validate` handler returning contract-compliant validation results in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/submission-controller.js`
- [ ] T041 [P] [UC-04] [UC-04-AS] [US3] Implement field-level validation and scan-failure feedback rendering in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper-view.js` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/submit-paper.css`
- [ ] T042 [UC-04] [UC-04-AS] [US3] Enforce submit blocking with 422 responses when validation or scan fails in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/submission-controller.js`
- [ ] T043 [UC-04] [UC-04-AS] [US3] Ensure failed attempts remain non-submitted and retry-eligible in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/session-state-model.js`
- [ ] T044 [UC-04] [UC-04-AS] [US3] Execute UC-04-AS invalid-submission checks and refresh acceptance/coverage evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-evidence.md` and `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-04-coverage.md`

**Checkpoint**: US3 is complete and independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, traceability, regression confidence, and release readiness.

- [ ] T045 [P] [UC-04] [UC-04-AS] Update FR-001..FR-015 implementation-to-test traceability matrix in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/traceability-matrix.md`
- [ ] T046 [UC-04] [UC-04-AS] Run full regression across acceptance suites and capture results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/regression-report.md`
- [ ] T047 [UC-04] [UC-04-AS] Enforce final JavaScript coverage gate and record 100% target / 95% floor evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/final-coverage-summary.md`
- [ ] T048 [P] [UC-04] [UC-04-AS] Add API contract conformance tests for status codes and payload schemas in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/submission-contract.spec.js`
- [ ] T049 [P] [UC-04] [UC-04-AS] Update execution/runbook instructions for submission workflows in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/quickstart.md`
- [ ] T050 [UC-04] [UC-04-AS] Document MVC boundary audit outcomes and allowed dependency directions in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/plan.md`
- [ ] T051 [UC-04] [UC-04-AS] Final cleanup/refactoring without behavioral change in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/submission-controller.js` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/submission-model.js`
- [ ] T052 [P] [UC-04] [UC-04-AS] Create submit-flow performance scenario for SC-002 in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-performance.spec.js`
- [ ] T053 [UC-04] [UC-04-AS] Execute performance run and record p95 completion evidence for SC-002 in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-performance-report.md`
- [ ] T054 [UC-04] [UC-04-AS] Add CI threshold check for SC-002 in `/home/m_srnic/ece493/lab2/ECE493Lab2/package.json`
- [ ] T055 [P] [UC-04] [UC-04-AS] Define first-attempt usability protocol and SC-005 criteria in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-usability-protocol.md`
- [ ] T056 [UC-04] [UC-04-AS] Execute usability sessions and capture first-attempt success rate for SC-005 in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-usability-results.md`
- [ ] T057 [UC-04] [UC-04-AS] Record SC-005 compliance decision and follow-up actions in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-04-evidence.md`
- [ ] T058 [P] [UC-04] [UC-04-AS] Add session-validation middleware for invalid/expired author sessions in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/middleware/session-auth.js`
- [ ] T059 [P] [UC-04] [UC-04-AS] Add invalid-session 401 contract tests for create/upload/validate/submit/status endpoints in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/session-auth.spec.js`
- [ ] T060 [UC-04] [UC-04-AS] Apply session-validation middleware to submission routes in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/app.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies.
- Foundational (Phase 2): depends on Setup and blocks all user story work.
- User Stories (Phases 3-5): each depends on Foundational completion.
- Polish (Phase 6): depends on completion of all user stories.

### User Story Dependency Graph

`US1 (P1) -> US2 (P2) -> US3 (P3)`

Rationale:
- US1 establishes core create/submit/status flow required by the other stories.
- US2 extends US1 with retry and preservation behaviors.
- US3 tightens validation and blocking paths on top of the core flow.

### Within-Story Ordering Rules

- Execute validation/test tasks before implementation sign-off.
- Implement/adjust models before controller integration when state contracts change.
- Re-run mapped acceptance checks and coverage evidence tasks before marking a story complete.

### Parallel Opportunities

- Setup: `T003`, `T004`, and `T005` can run in parallel after `T001` and `T002`.
- Foundational: `T008`, `T009`, `T010`, and `T011` can run in parallel after `T007`.
- US1 parallel example: `T014`, `T015`, and `T016` can run together; then `T018`, `T019`, and `T021` can run together before `T024`.
- US2 parallel example: `T025`, `T026`, and `T027` can run together; then `T029`, `T031`, and `T032` can run together before `T034`.
- US3 parallel example: `T035`, `T036`, and `T037` can run together; then `T039` and `T041` can run together before `T044`.
- Polish parallel example: `T048`, `T052`, `T055`, `T058`, and `T059` can run together before `T046`, `T047`, `T053`, `T056`, and `T060`.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete Phase 3 (US1) end-to-end.
3. Execute `Acceptance Tests/UC-04-AS.md` for US1 scope and record evidence.
4. Ship/demo MVP with core successful submission behavior.

### Incremental Delivery

1. Deliver US1 (core submit).
2. Deliver US2 (retry/recovery) while preserving US1 acceptance pass.
3. Deliver US3 (validation blocking/feedback) while preserving US1-US2 acceptance pass.
4. Complete Phase 6 cross-cutting hardening and release checks.

### Parallel Team Strategy

1. Align on Phase 1 and Phase 2 contracts first.
2. Assign one engineer to controller/model core flow (US1) and one to acceptance/coverage harness tasks in parallel.
3. After US1 merges, split US2 and US3 implementation tasks by file ownership to minimize merge conflicts.
