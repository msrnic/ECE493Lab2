# Tasks: Reviewer Paper Access

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance and coverage tasks are included because `spec.md` requires `UC-08-AS` validation and 100% line-coverage evidence for in-scope JavaScript.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish MVC project scaffolding, tooling, and traceability artifacts.

- [ ] T001 [UC-08] [UC-08-AS] Create MVC and test directory skeleton in `src/models/`, `src/views/`, `src/controllers/`, `src/services/`, `src/assets/css/`, `src/assets/js/`, `tests/acceptance/`, `tests/unit/models/`, `tests/unit/controllers/`, and `tests/unit/views/`
- [ ] T002 [UC-08] [UC-08-AS] Initialize Node project scripts for lint, test, and coverage in `package.json`
- [ ] T003 [P] [UC-08] [UC-08-AS] Configure JavaScript linting rules in `.eslintrc.cjs` and ignore patterns in `.eslintignore`
- [ ] T004 [P] [UC-08] [UC-08-AS] Scaffold feature entry files in `src/index.html`, `src/assets/css/reviewer-paper-access.css`, and `src/assets/js/app.js`
- [ ] T005 [P] [UC-08] [UC-08-AS] Create acceptance and unit test bootstrap files in `tests/acceptance/uc-08-as.test.js`, `tests/unit/models/.gitkeep`, `tests/unit/controllers/.gitkeep`, and `tests/unit/views/.gitkeep`
- [ ] T006 [UC-08] [UC-08-AS] Create UC-to-test traceability baseline in `specs/001-reviewer-paper-access/traceability.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared architecture that all user stories depend on.

**Critical**: Complete this phase before starting story phases.

- [ ] T007 [UC-08] [UC-08-AS] Implement shared API client, auth header handling, and response normalization in `src/services/paper-access-api.service.js`
- [ ] T008 [P] [UC-08] [UC-08-AS] Implement reusable model validation helpers in `src/models/model-validation.js`
- [ ] T009 [P] [UC-08] [UC-08-AS] Implement base reviewer-paper workspace layout helpers in `src/views/reviewer-paper-access.view.js`
- [ ] T010 [P] [UC-08] [UC-08-AS] Implement controller event routing shell and request ID correlation helpers in `src/controllers/reviewer-paper-access.controller.js`
- [ ] T011 [UC-08] [UC-08-AS] Implement append-only access-attempt domain model with outcome/reason validation in `src/models/paper-access-attempt.model.js`
- [ ] T012 [UC-08] [UC-08-AS] Configure coverage runner and reports for feature JavaScript in `package.json` and `c8.config.json`
- [ ] T013 [UC-08] [UC-08-AS] Define acceptance evidence and coverage log templates in `tests/acceptance/uc-08-evidence.md` and `tests/acceptance/coverage-uc-08.md`

**Checkpoint**: Shared infrastructure is ready for independent story delivery.

---

## Phase 3: User Story 1 - Open Assigned Paper Files (Priority: P1) 🎯 MVP

**Goal**: Let an authenticated assigned reviewer select a paper and view its files, including temporary-outage retry behavior and session-expiry handling.  
**Independent Test**: Log in as an assigned reviewer, select a paper, verify files render, validate temporary-outage immediate retry plus 1-per-5-second throttling, and verify session-expiry requires re-authentication.

### Tests

- [ ] T014 [P] [US1] [UC-08] [UC-08-AS] Add UC-08-AS happy-path and temporary-outage acceptance scenarios in `tests/acceptance/uc-08-as.test.js`
- [ ] T015 [P] [US1] [UC-08] [UC-08-AS] Add model unit tests for paper bundle validity and outage retry-window transitions in `tests/unit/models/paper-file-bundle.model.test.js` and `tests/unit/models/outage-retry-window.model.test.js`
- [ ] T016 [P] [US1] [UC-08] [UC-08-AS] Add controller/service unit tests for assigned-paper listing and file request outcomes in `tests/unit/controllers/reviewer-paper-access.controller.test.js` and `tests/unit/controllers/paper-file-request.controller.test.js`

### Implementation

- [ ] T017 [P] [US1] [UC-08] [UC-08-AS] Implement reviewer entitlement state and transition validation in `src/models/reviewer-access-entitlement.model.js`
- [ ] T018 [P] [US1] [UC-08] [UC-08-AS] Implement paper-file bundle model and temporary-unavailable state handling in `src/models/paper-file-bundle.model.js`
- [ ] T019 [P] [US1] [UC-08] [UC-08-AS] Implement outage retry-window logic (immediate retry then 5-second throttle) in `src/models/outage-retry-window.model.js`
- [ ] T020 [US1] [UC-08] [UC-08-AS] Implement contract methods for `GET /reviewer/papers`, `GET /reviewer/papers/{paperId}/files`, and `GET /reviewer/papers/{paperId}/files/{fileId}` in `src/services/paper-access-api.service.js`
- [ ] T021 [P] [US1] [UC-08] [UC-08-AS] Implement assigned-paper selection and file-list rendering in `src/views/reviewer-paper-access.view.js` and `src/assets/css/reviewer-paper-access.css`
- [ ] T022 [US1] [UC-08] [UC-08-AS] Implement per-request entitlement revalidation and temporary-outage control flow in `src/controllers/reviewer-paper-access.controller.js` and `src/controllers/paper-file-request.controller.js`
- [ ] T023 [US1] [UC-08] [UC-08-AS] Implement temporary-unavailable messaging and retry UI in `src/views/temporary-unavailable.view.js`
- [ ] T024 [US1] [UC-08] [UC-08-AS] Wire reviewer paper-access bootstrap and event binding in `src/assets/js/app.js` and `src/index.html`
- [ ] T025 [US1] [UC-08] [UC-08-AS] Execute UC-08-AS scenarios for successful and temporary-outage flows via `tests/acceptance/uc-08-as.test.js` and record evidence in `tests/acceptance/uc-08-evidence.md`
- [ ] T026 [US1] [UC-08] [UC-08-AS] Run coverage for US1 modules and document uncovered lines/remediation in `tests/acceptance/coverage-uc-08.md`
- [ ] T027 [P] [US1] [UC-08] [UC-08-AS] Add session-expiry acceptance scenario in `tests/acceptance/uc-08-as.test.js`
- [ ] T028 [P] [US1] [UC-08] [UC-08-AS] Add unit tests for expired-session handling in `tests/unit/controllers/paper-file-request.controller.test.js` and `tests/unit/controllers/reviewer-paper-access.controller.test.js`
- [ ] T029 [P] [US1] [UC-08] [UC-08-AS] Add outage retry controller unit tests in `tests/unit/controllers/outage-retry.controller.test.js`
- [ ] T030 [US1] [UC-08] [UC-08-AS] Implement expired-session handling for paper-file requests in `src/services/paper-access-api.service.js` and `src/controllers/paper-file-request.controller.js`
- [ ] T031 [US1] [UC-08] [UC-08-AS] Implement outage retry policy controller in `src/controllers/outage-retry.controller.js`
- [ ] T032 [US1] [UC-08] [UC-08-AS] Integrate outage retry controller into request flow in `src/controllers/reviewer-paper-access.controller.js` and `src/controllers/paper-file-request.controller.js`
- [ ] T033 [US1] [UC-08] [UC-08-AS] Add selection-to-render timing instrumentation for SC-002 in `src/controllers/reviewer-paper-access.controller.js` and `src/views/reviewer-paper-access.view.js`
- [ ] T034 [US1] [UC-08] [UC-08-AS] Add SC-002 performance acceptance and evidence capture in `tests/acceptance/uc-08-performance.test.js` and `tests/acceptance/uc-08-performance.md`

**Checkpoint**: US1 is independently testable and demo-ready.

---

## Phase 4: User Story 2 - Deny Revoked Access (Priority: P2)

**Goal**: Deny all new paper-file requests immediately after revocation while keeping already displayed content visible.  
**Independent Test**: Revoke access before and during viewing sessions, then verify next file request is denied with clear revoked messaging.

### Tests

- [ ] T035 [P] [US2] [UC-08] [UC-08-AS] Extend UC-08-AS acceptance scenarios for revoked-access denial and mid-session revocation in `tests/acceptance/uc-08-as.test.js`
- [ ] T036 [P] [US2] [UC-08] [UC-08-AS] Add unit tests for immediate post-revocation denial behavior in `tests/unit/models/reviewer-access-entitlement.model.test.js` and `tests/unit/controllers/paper-file-request.controller.test.js`
- [ ] T037 [P] [US2] [UC-08] [UC-08-AS] Add denial-message rendering tests in `tests/unit/views/access-denied.view.test.js`

### Implementation

- [ ] T038 [US2] [UC-08] [UC-08-AS] Implement revoked-entitlement decision branches and reason-code mapping for file metadata/download requests in `src/controllers/paper-file-request.controller.js` and `src/services/paper-access-api.service.js`
- [ ] T039 [US2] [UC-08] [UC-08-AS] Implement clear revoked/not-assigned denial messaging in `src/views/access-denied.view.js`
- [ ] T040 [US2] [UC-08] [UC-08-AS] Update reviewer flow to preserve already rendered content while denying all new requests after revocation in `src/controllers/reviewer-paper-access.controller.js` and `src/views/reviewer-paper-access.view.js`
- [ ] T041 [US2] [UC-08] [UC-08-AS] Record revoked denial outcomes with request context in `src/models/paper-access-attempt.model.js` and `src/controllers/paper-file-request.controller.js`
- [ ] T042 [US2] [UC-08] [UC-08-AS] Re-run revoked-access UC-08-AS scenarios and append results in `tests/acceptance/uc-08-evidence.md`
- [ ] T043 [US2] [UC-08] [UC-08-AS] Re-run coverage for revocation logic and update remediation notes in `tests/acceptance/coverage-uc-08.md`

**Checkpoint**: US2 is independently testable and prevents unauthorized post-revocation access.

---

## Phase 5: User Story 3 - Record Access Outcomes (Priority: P3)

**Goal**: Allow editors/support/admin to review access outcomes while denying unauthorized viewers.  
**Independent Test**: Generate granted and denied attempts, then confirm authorized roles can view records and non-authorized roles receive denial.

### Tests

- [ ] T044 [P] [US3] [UC-08] [UC-08-AS] Add UC-08-AS acceptance scenarios for access-record visibility, role restrictions, and expired-session handling in `tests/acceptance/uc-08-as.test.js`
- [ ] T045 [P] [US3] [UC-08] [UC-08-AS] Add unit tests for access-attempt filtering, role authorization, and expired-session denial in `tests/unit/controllers/access-records.controller.test.js` and `tests/unit/models/paper-access-attempt.model.test.js`
- [ ] T046 [P] [US3] [UC-08] [UC-08-AS] Add access-records view rendering tests in `tests/unit/views/access-records.view.test.js`

### Implementation

- [ ] T047 [US3] [UC-08] [UC-08-AS] Implement `GET /papers/{paperId}/access-attempts` service method with outcome/limit query support in `src/services/paper-access-api.service.js`
- [ ] T048 [US3] [UC-08] [UC-08-AS] Implement editor/support/admin authorization checks and expired-session handling for access-record retrieval in `src/controllers/access-records.controller.js`
- [ ] T049 [US3] [UC-08] [UC-08-AS] Implement access-record list/filter UI in `src/views/access-records.view.js` and `src/assets/css/reviewer-paper-access.css`
- [ ] T050 [US3] [UC-08] [UC-08-AS] Integrate access-records navigation and page state flow in `src/controllers/reviewer-paper-access.controller.js` and `src/index.html`
- [ ] T051 [US3] [UC-08] [UC-08-AS] Execute UC-08-AS access-record scenarios and record outcomes in `tests/acceptance/uc-08-evidence.md`
- [ ] T052 [US3] [UC-08] [UC-08-AS] Re-run coverage for access-record modules and update remediation notes in `tests/acceptance/coverage-uc-08.md`

**Checkpoint**: US3 is independently testable with role-restricted audit visibility.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, regression proof, and documentation updates across stories.

- [ ] T053 [P] [UC-08] [UC-08-AS] Update FR-001 through FR-012 traceability to code and tests in `specs/001-reviewer-paper-access/traceability.md`
- [ ] T054 [UC-08] [UC-08-AS] Run full acceptance and regression verification for `tests/acceptance/uc-08-as.test.js`, `tests/acceptance/uc-08-performance.test.js`, and baseline suites matching `tests/acceptance/uc-*-as.test.js`; capture results in `tests/acceptance/regression-report.md`
- [ ] T055 [UC-08] [UC-08-AS] Enforce final coverage gate and document any approved exceptions in `tests/acceptance/coverage-uc-08.md`
- [ ] T056 [P] [UC-08] [UC-08-AS] Perform final lint/test command verification and update runbook guidance in `specs/001-reviewer-paper-access/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) must complete before Foundational (Phase 2).
- Foundational (Phase 2) blocks all user story phases.
- User story phases must complete before Polish (Phase 6).

### User Story Dependency Graph

`US1 -> US2 -> US3`

- US1 has no story dependency and delivers the MVP.
- US2 depends on US1 request/display flow to enforce revocation on subsequent requests.
- US3 depends on US1/US2 generating access-attempt outcomes for review workflows.

### Parallel Execution Examples

- US1: After `T014`, run `T015`, `T016`, and `T017` in parallel; after `T020`, run `T021` and `T023` in parallel.
- US2: After `T035`, run `T036`, `T037`, and `T039` in parallel where owners differ; then converge at `T040`.
- US3: After `T044`, run `T045`, `T046`, and `T048` in parallel; then complete integration and evidence tasks `T049` to `T052`.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Finish Phase 1 and Phase 2.
2. Deliver Phase 3 (`US1`) end-to-end.
3. Validate `Acceptance Tests/UC-08-AS.md` scenarios for US1 and capture evidence.
4. Demo reviewer paper access with temporary outage handling.

### Incremental Delivery

1. Add `US2` revocation enforcement and re-run prior acceptance scenarios.
2. Add `US3` access-record visibility and role restrictions.
3. Finish Polish phase with regression and coverage gates.

### Team Parallelization

1. One developer owns shared service/model foundations (`T007` to `T013`).
2. One developer implements US2 denial behavior while another prepares US3 tests/views after US1 stabilizes.
3. Merge only when UC-08-AS evidence and coverage logs are updated.
