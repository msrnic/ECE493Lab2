# Tasks: Save Paper Draft

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/`  
**Prerequisites**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/plan.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/spec.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/research.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/data-model.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`

**Tests**: Acceptance validation for `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` and coverage reporting are explicitly required by the feature specification (`FR-007`) and implementation plan.

**Organization**: Tasks are grouped by user story (`US1`, `US2`, `US3`) so each story can be implemented and verified independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create project scaffolding and traceability artifacts required by all stories.

- [ ] T001 (UC-05 / UC-05-AS) Create MVC and test directory scaffolding at `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/`, `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/integration/`, and `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/`
- [ ] T002 (UC-05 / UC-05-AS) Initialize page shell and stylesheet entry points in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/index.html` and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/draft.css`
- [ ] T003 [P] (UC-05 / UC-05-AS) Initialize browser bootstrapping entry point in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/draft-page.js`
- [ ] T004 [P] (UC-05 / UC-05-AS) Create acceptance test harness skeleton mapped to `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-05-draft-save.acceptance.test.js`
- [ ] T005 [P] (UC-05 / UC-05-AS) Create FR-to-US-to-UC traceability baseline in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/traceability.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared architecture required before user-story work starts.

**⚠️ CRITICAL**: Complete this phase before starting any user-story phase.

- [ ] T006 (UC-05 / UC-05-AS) Implement shared draft REST contract client for save/load/version/restore/prune operations in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-api-client.js`
- [ ] T007 [P] (UC-05 / UC-05-AS) Implement shared save error/outcome mapper for `DRAFT_SAVE_FAILED`, `DRAFT_STALE`, and auth failures in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-error-mapper.js`
- [ ] T008 [P] (UC-05 / UC-05-AS) Implement `DraftSubmission` core revision and state invariants in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-submission-model.js`
- [ ] T009 [P] (UC-05 / UC-05-AS) Implement `DraftVersion` and file descriptor schema validators in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-version-model.js`
- [ ] T010 (UC-05 / UC-05-AS) Implement shared notification/status rendering helpers for editor and history views in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/draft-ui-shared.js`
- [ ] T011 (UC-05 / UC-05-AS) Configure test and coverage scripts targeting `/home/m_srnic/ece493/lab2/ECE493Lab2/src/**/*.js` in `/home/m_srnic/ece493/lab2/ECE493Lab2/package.json`
- [ ] T012 (UC-05 / UC-05-AS) Define coverage evidence template and threshold checklist in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-05-coverage-template.md`

**Checkpoint**: Shared foundations are ready for independently testable story delivery.

---

## Phase 3: User Story 1 - Save In-Progress Draft (Priority: P1) 🎯 MVP

**Goal**: Allow authors to save partial submission data (metadata + files), preserve version history on repeated saves, and show clear success confirmation.

**Independent Test**: Start an in-progress submission, enter partial data and files, save twice, and verify latest revision updates while prior revision remains available.

### Tests & Validation

- [ ] T013 [P] [US1] (UC-05 / UC-05-AS) Convert success-path scenarios from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` into executable checks in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-05-draft-save.acceptance.test.js`
- [ ] T014 [P] [US1] (UC-05 / UC-05-AS) Add model unit tests for successful save revision increments and state updates in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/draft-submission-model.test.js`
- [ ] T015 [P] [US1] (UC-05 / UC-05-AS) Add model unit tests for immutable version snapshots of metadata and file references in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/draft-version-model.test.js`
- [ ] T016 [P] [US1] (UC-05 / UC-05-AS) Add controller unit tests for `PUT /api/submissions/{submissionId}/draft` success handling in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/draft-controller.save-success.test.js`

### Implementation

- [ ] T017 [US1] (UC-05 / UC-05-AS) Implement successful `saveDraft` state transition and `latestRevision` updates in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-submission-model.js`
- [ ] T018 [US1] (UC-05 / UC-05-AS) Implement immutable version creation with snapshot payload shaping in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-version-model.js`
- [ ] T019 [P] [US1] (UC-05 / UC-05-AS) Implement file-reference normalization and validation for saved snapshots in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-file-reference-model.js`
- [ ] T020 [US1] (UC-05 / UC-05-AS) Implement save controller orchestration for multipart requests and success responses in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-controller.js`
- [ ] T021 [P] [US1] (UC-05 / UC-05-AS) Implement save action UI states and success confirmation rendering in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/draft-editor-view.js`
- [ ] T022 [US1] (UC-05 / UC-05-AS) Wire editor save events and payload serialization in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/draft-page.js`
- [ ] T023 [US1] (UC-05 / UC-05-AS) Execute US1 acceptance scenarios from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` and record evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-us1-evidence.md`
- [ ] T024 [US1] (UC-05 / UC-05-AS) Run US1 coverage report and record line-coverage results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-05-us1-coverage.md`

**Checkpoint**: US1 is complete and independently verifiable.

---

## Phase 4: User Story 2 - Protect Data During Save Errors (Priority: P2)

**Goal**: Prevent silent data loss by rejecting stale/system-failed saves, preserving prior successful drafts, and showing explicit retry guidance.

**Independent Test**: Force a save failure and a stale save conflict, then verify no new version is committed and clear failure/reload messaging is shown.

### Tests & Validation

- [ ] T025 [P] [US2] (UC-05 / UC-05-AS) Add failure-path acceptance checks (system error, stale save) from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-05-draft-save.acceptance.test.js`
- [ ] T026 [P] [US2] (UC-05 / UC-05-AS) Add model unit tests asserting non-success outcomes do not mutate `latestVersionId`, `latestRevision`, or prior saved content in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/draft-save-attempt-model.test.js`
- [ ] T027 [P] [US2] (UC-05 / UC-05-AS) Add controller unit tests for `409` stale conflict and `500` system failure handling in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/draft-controller.stale-conflict.test.js`

### Implementation

- [ ] T028 [US2] (UC-05 / UC-05-AS) Implement `DraftSaveAttempt` outcome modeling (`SUCCESS`, `FAILED_SYSTEM`, `FAILED_STALE`, `FAILED_AUTH`) in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-save-attempt-model.js`
- [ ] T029 [US2] (UC-05 / UC-05-AS) Implement stale revision conflict checks and non-mutation guards in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-controller.js`
- [ ] T030 [P] [US2] (UC-05 / UC-05-AS) Implement explicit failure/reload-required messaging in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/draft-editor-view.js`
- [ ] T031 [US2] (UC-05 / UC-05-AS) Implement retry and reload workflow after failed saves in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/draft-page.js`
- [ ] T032 [US2] (UC-05 / UC-05-AS) Add API integration tests for stale and system-failure save responses in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/integration/draft-api.save-error.integration.test.js`
- [ ] T033 [US2] (UC-05 / UC-05-AS) Execute US2 acceptance scenarios from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` and record evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-us2-evidence.md`
- [ ] T034 [US2] (UC-05 / UC-05-AS) Run US2 coverage report and record line-coverage results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-05-us2-coverage.md`

**Checkpoint**: US2 is complete and independently verifiable.

---

## Phase 5: User Story 3 - Resume Work From Saved Draft (Priority: P3)

**Goal**: Load latest drafts, browse and restore previous versions, enforce owner/admin-only access, and apply post-final-submission retention pruning.

**Independent Test**: Save multiple revisions, reopen later to load latest, restore an older version as new latest, verify owner/admin access and unauthorized denial, then validate prune-to-latest behavior after final submission.

### Tests & Validation

- [ ] T035 [P] [US3] (UC-05 / UC-05-AS) Add acceptance checks for resume, history list, restore, and authorization outcomes from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-05-draft-history.acceptance.test.js`
- [ ] T036 [P] [US3] (UC-05 / UC-05-AS) Add model unit tests for restore lineage and retention invariants in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models/draft-version-retention.test.js`
- [ ] T037 [P] [US3] (UC-05 / UC-05-AS) Add controller unit tests for load/list/get/restore/prune operations and authorization checks in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/draft-version-controller.test.js`

### Implementation

- [ ] T038 [US3] (UC-05 / UC-05-AS) Implement latest draft load and revision synchronization via `GET /api/submissions/{submissionId}/draft` in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-controller.js`
- [ ] T039 [US3] (UC-05 / UC-05-AS) Implement version list/detail/restore orchestration in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-version-controller.js`
- [ ] T040 [P] [US3] (UC-05 / UC-05-AS) Implement version history timeline and restore controls in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/draft-history-view.js`
- [ ] T041 [US3] (UC-05 / UC-05-AS) Implement owner/admin access policy checks for version view/restore actions in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-version-access-policy.js`
- [ ] T042 [US3] (UC-05 / UC-05-AS) Implement restore-as-new-version lineage (`restoredFromVersionId`) in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-version-model.js`
- [ ] T043 [US3] (UC-05 / UC-05-AS) Implement retention prune integration for `/api/submissions/{submissionId}/draft/retention/prune` in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-retention-policy.js`
- [ ] T044 [US3] (UC-05 / UC-05-AS) Wire draft load/history/restore user flows in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/draft-page.js`
- [ ] T045 [US3] (UC-05 / UC-05-AS) Execute US3 acceptance scenarios from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` and record evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-us3-evidence.md`
- [ ] T046 [US3] (UC-05 / UC-05-AS) Run US3 coverage report and record line-coverage results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-05-us3-coverage.md`

**Checkpoint**: US3 is complete and independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Complete cross-story validation, regression safety, and compliance evidence.

- [ ] T047 [P] (UC-05 / UC-05-AS) Re-run full `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` regression and record consolidated evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-full-regression.md`
- [ ] T048 (UC-05 / UC-05-AS) Re-run full in-scope JavaScript coverage and record final status and remediation notes in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/coverage/uc-05-final-coverage.md`
- [ ] T049 [P] (UC-05 / UC-05-AS) Add cross-story regression tests for save-error-resume integration in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers/draft-integration-regression.test.js`
- [ ] T050 [P] (UC-05 / UC-05-AS) Update execution and verification workflow with final commands/evidence links in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/quickstart.md`
- [ ] T051 (UC-05 / UC-05-AS) Update final FR-to-US-to-UC traceability and MVC boundary compliance notes in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/traceability.md`
- [ ] T052 (UC-05 / UC-05-AS) Build baseline list of previously passing acceptance suites in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/regression-baseline.md`
- [ ] T053 (UC-05 / UC-05-AS) Execute all suites from `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/regression-baseline.md` and record a pass/fail matrix in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/full-regression-matrix.md`
- [ ] T054 (UC-05 / UC-05-AS) Document and resolve any acceptance regressions discovered in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/full-regression-matrix.md`
- [ ] T055 [P] (UC-05 / UC-05-AS) Measure SC-002 save reliability and publish results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-reliability-report.md`
- [ ] T056 [P] (UC-05 / UC-05-AS) Execute SC-005 usability validation protocol and publish results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-usability-report.md`
- [ ] T057 [P] (UC-05 / UC-05-AS) Execute p95 performance validation using server-side request-receipt to response-commit timings (>=200 successful requests per operation) and publish results in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/results/uc-05-performance-report.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Phase 1 (Setup): No dependencies
- Phase 2 (Foundational): Depends on Phase 1 and blocks all story work
- Phase 3 (US1): Depends on Phase 2
- Phase 4 (US2): Depends on Phase 3
- Phase 5 (US3): Depends on Phase 3
- Phase 6 (Polish): Depends on completion of Phases 4 and 5

### User Story Dependency Graph

`US1 -> US2`  
`US1 -> US3`  
`US2 -> Polish`  
`US3 -> Polish`

### Parallel Execution Examples

- US1: Run `T014`, `T015`, and `T016` in parallel after `T013`; run `T019` and `T021` in parallel after `T017` and `T018`.
- US2: Run `T026` and `T027` in parallel after `T025`; run `T030` in parallel with `T029` once `T028` is complete.
- US3: Run `T036` and `T037` in parallel after `T035`; run `T040` in parallel with `T041` after `T039`.

---

## Implementation Strategy

### MVP First (Recommended Scope)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end to end.
3. Validate with `T023` and `T024` before demo/release.

### Incremental Delivery

1. Add US2 (Phase 4) to harden save reliability under failures/conflicts.
2. Add US3 (Phase 5) for resume/history/restore/access/retention behavior.
3. Finish with Phase 6 regression and coverage compliance tasks.

### Completeness Validation

- US1 covers save trigger, immutable version creation, metadata/file preservation, and success confirmation.
- US2 covers explicit failure handling, stale conflict rejection, and prior-draft integrity.
- US3 covers latest draft resume, version history, restore, access control, and final-submission retention pruning.
- Each story includes test tasks, implementation tasks, acceptance evidence, and coverage evidence, enabling independent verification.
