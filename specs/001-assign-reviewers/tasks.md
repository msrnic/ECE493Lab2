# Tasks: Reviewer Assignment Workflow

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-assign-reviewers/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation for `Acceptance Tests/UC-06-AS.md` and `Acceptance Tests/UC-07-AS.md` is required by the feature spec and constitution. Coverage evidence is required with a 100% target for in-scope project-owned JavaScript.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish project skeleton, tooling baseline, and traceability scaffolding

- [ ] T001 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Create traceability scaffold for FR-001..FR-013 in `specs/001-assign-reviewers/traceability.md`
- [ ] T002 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Create MVC/application directories in `src/models/`, `src/views/`, `src/controllers/`, `src/assets/css/`, `src/assets/js/`, `tests/acceptance/`, and `tests/unit/`
- [ ] T003 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Create base app shell with mount points in `src/index.html`
- [ ] T004 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Create page bootstrap entry module in `src/assets/js/assign-reviewers-page.js`
- [ ] T005 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Initialize Node project scripts for lint/test/coverage in `package.json`
- [ ] T006 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Add test/lint baseline configuration in `eslint.config.js` and `jest.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build shared modules required by all user stories

**CRITICAL**: Complete this phase before starting user stories

- [ ] T007 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Implement shared JSON API client with HTTP error normalization in `src/models/ApiClient.js`
- [ ] T008 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Implement shared reviewer-selection validation helpers (availability, COI, uniqueness) in `src/models/AssignmentValidation.js`
- [ ] T009 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Implement shared view state renderer for loading/error/success banners in `src/views/ViewStateRenderer.js`
- [ ] T010 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Implement top-level controller bootstrap and event bus wiring in `src/controllers/AppController.js`
- [ ] T011 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Define acceptance evidence template and storage convention in `tests/acceptance/results/README.md`
- [ ] T012 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Configure coverage thresholds and reports for in-scope JS in `package.json`
- [ ] T013 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Document enforced MVC boundaries and dependency rules in `docs/mvc-boundaries.md`

**Checkpoint**: Foundation is ready; user-story development can begin.

---

## Phase 3: User Story 1 - Assign Reviewers to a Paper (Priority: P1) MVP

**Goal**: Allow editors to assign available, non-conflicted reviewers to a submitted paper and confirm assignment outcome.

**Mapped Use Case / Acceptance Suite**: `UC-06` / `UC-06-AS`

**Independent Test**: Select a submitted paper, choose available reviewers, confirm assignment, and verify assigned reviewers plus invitation initiation are shown.

### Validation Tasks

- [ ] T014 [P] [US1] [UC-06] [UC-06-AS] Implement UC-06 happy-path acceptance checks from `Acceptance Tests/UC-06-AS.md` in `tests/acceptance/uc06-assign-reviewers.acceptance.test.js`
- [ ] T015 [US1] [UC-06] [UC-06-AS] Create UC-06 happy-path evidence template in `tests/acceptance/results/uc06-happy-path.md` (populate during T025).
- [ ] T016 [US1] [UC-06] [UC-06-AS] Add controller unit tests for first-confirmation-wins behavior from `UC-06-AS` in `tests/unit/controllers/ReviewerAssignmentController.test.js`

### Implementation Tasks

- [ ] T017 [P] [US1] [UC-06] [UC-06-AS] Implement submitted-paper loading model via `GET /papers?state=submitted` from `UC-06-AS` in `src/models/PaperSubmissionModel.js`
- [ ] T018 [P] [US1] [UC-06] [UC-06-AS] Implement reviewer-candidate loading model via `GET /papers/{paperId}/reviewer-candidates` from `UC-06-AS` in `src/models/ReviewerModel.js`
- [ ] T019 [P] [US1] [UC-06] [UC-06-AS] Implement assignment-attempt creation/confirmation model via `POST /papers/{paperId}/assignment-attempts` and `/confirm` from `UC-06-AS` in `src/models/ReviewerAssignmentModel.js`
- [ ] T020 [P] [US1] [UC-06] [UC-06-AS] Implement paper/reviewer selection view from `UC-06-AS` in `src/views/AssignReviewersView.js`
- [ ] T021 [US1] [UC-06] [UC-06-AS] Implement assignment orchestration (validate, confirm, stale 409 handling) from `UC-06-AS` in `src/controllers/ReviewerAssignmentController.js`
- [ ] T022 [US1] [UC-06] [UC-06-AS] Implement assignment outcome view for assigned reviewers and notification initiation from `UC-06-AS` in `src/views/AssignmentOutcomeView.js`
- [ ] T023 [US1] [UC-06] [UC-06-AS] Wire US1 controller/view initialization and events from `UC-06-AS` in `src/assets/js/assign-reviewers-page.js`
- [ ] T024 [US1] [UC-06] [UC-06-AS] Add assignment workflow styles for form, validation states, and outcome panel from `UC-06-AS` in `src/assets/css/assign-reviewers.css`
- [ ] T025 [US1] [UC-06] [UC-06-AS] Re-run `UC-06-AS` checks and record US1 coverage evidence in `tests/acceptance/results/uc06-coverage.md`

**Checkpoint**: US1 is complete and independently testable.

---

## Phase 4: User Story 2 - Replace Unavailable Reviewer (Priority: P2)

**Goal**: Block assignment when a reviewer is unavailable or conflicted, then allow alternate replacement without restarting.

**Mapped Use Case / Acceptance Suite**: `UC-06` / `UC-06-AS`

**Independent Test**: Start assignment with an unavailable or conflicted reviewer, replace each blocked slot with an eligible alternate, and confirm assignment completes.

### Validation Tasks

- [ ] T026 [P] [US2] [UC-06] [UC-06-AS] Extend `UC-06-AS` acceptance checks for unavailable/COI replacement flows in `tests/acceptance/uc06-assign-reviewers.acceptance.test.js`
- [ ] T027 [US2] [UC-06] [UC-06-AS] Create replacement-flow evidence template in `tests/acceptance/results/uc06-replacement-flow.md` (populate during T034).
- [ ] T028 [US2] [UC-06] [UC-06-AS] Add model unit tests for replacement-state transitions and completion blocking from `UC-06-AS` in `tests/unit/models/ReviewerAssignmentModel.test.js`

### Implementation Tasks

- [ ] T029 [P] [US2] [UC-06] [UC-06-AS] Implement selection replacement state transitions and duplicate reviewer guards from `UC-06-AS` in `src/models/ReviewerAssignmentModel.js`
- [ ] T030 [P] [US2] [UC-06] [UC-06-AS] Implement unavailable/COI prompt UI and alternate reviewer picker from `UC-06-AS` in `src/views/AssignReviewersView.js`
- [ ] T031 [US2] [UC-06] [UC-06-AS] Integrate replacement endpoint `PATCH /papers/{paperId}/assignment-attempts/{attemptId}/selections/{selectionId}` from `UC-06-AS` in `src/controllers/ReviewerAssignmentController.js`
- [ ] T032 [US2] [UC-06] [UC-06-AS] Implement completion blocking until all unresolved slots are replaced from `UC-06-AS` in `src/controllers/ReviewerAssignmentController.js`
- [ ] T033 [US2] [UC-06] [UC-06-AS] Update assignment outcome rendering with replacement traceability from `UC-06-AS` in `src/views/AssignmentOutcomeView.js`
- [ ] T034 [US2] [UC-06] [UC-06-AS] Re-run replacement scenarios in `UC-06-AS` and record coverage evidence in `tests/acceptance/results/uc06-replacement-coverage.md`

**Checkpoint**: US2 is complete and independently testable.

---

## Phase 5: User Story 3 - Deliver Reviewer Invitations (Priority: P3)

**Goal**: Send reviewer invitations after assignment, retry failed delivery every 5 minutes (max 3), and flag terminal failures for follow-up while keeping assignments active.

**Mapped Use Case / Acceptance Suite**: `UC-07` / `UC-07-AS`

**Independent Test**: Assign reviewer(s), verify invitation dispatch, simulate delivery failures, verify retry cadence/logging, and verify terminal failure follow-up flag with active assignment retained.

### Validation Tasks

- [ ] T035 [P] [US3] [UC-07] [UC-07-AS] Implement `UC-07-AS` acceptance checks for invitation send/retry/failure logging in `tests/acceptance/uc07-review-invitation.acceptance.test.js`
- [ ] T036 [US3] [UC-07] [UC-07-AS] Create invitation-flow evidence template in `tests/acceptance/results/uc07-invitation-flow.md` (populate during T043).
- [ ] T037 [US3] [UC-07] [UC-07-AS] Add controller unit tests for retry cadence (5 minutes), retry cap (3), and terminal failure behavior from `UC-07-AS` in `tests/unit/controllers/InvitationController.test.js`

### Implementation Tasks

- [ ] T038 [P] [US3] [UC-07] [UC-07-AS] Implement invitation dispatch/retry/status API model for `/invitations/{invitationId}` endpoints from `UC-07-AS` in `src/models/ReviewInvitationModel.js`
- [ ] T039 [P] [US3] [UC-07] [UC-07-AS] Implement invitation-status rendering states (`pending`, `sent`, `retry_scheduled`, `failed_terminal`) from `UC-07-AS` in `src/views/AssignmentOutcomeView.js`
- [ ] T040 [US3] [UC-07] [UC-07-AS] Implement invitation dispatch and retry orchestration from `UC-07-AS` in `src/controllers/InvitationController.js`
- [ ] T041 [US3] [UC-07] [UC-07-AS] Integrate assignment confirmation handoff to invitation controller from `UC-07-AS` in `src/controllers/ReviewerAssignmentController.js`
- [ ] T042 [US3] [UC-07] [UC-07-AS] Add follow-up-required UI indicators while retaining active assignment visibility from `UC-07-AS` in `src/views/AssignmentOutcomeView.js`
- [ ] T043 [US3] [UC-07] [UC-07-AS] Re-run `UC-07-AS` plus impacted `UC-06-AS` checks and record coverage evidence in `tests/acceptance/results/uc07-coverage.md`

**Checkpoint**: US3 is complete and independently testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, regression safety, and delivery documentation

- [ ] T044 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Update final FR-to-code and UC/AS traceability links in `specs/001-assign-reviewers/traceability.md`
- [ ] T045 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Run full regression for `UC-06-AS` and `UC-07-AS` and document outcomes in `tests/acceptance/results/regression-summary.md`
- [ ] T046 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Enforce and document final coverage status (target 100%; exceptions if needed) in `tests/acceptance/results/coverage-summary.md`
- [ ] T047 [UC-06] [UC-06-AS] Implement assignment timing harness for SC-002 in `tests/performance/uc06-assignment-duration.test.js`
- [ ] T048 [UC-06] [UC-06-AS] Execute SC-002 performance run and record p95/total duration evidence in `tests/acceptance/results/sc-002-performance.md`
- [ ] T049 [P] [UC-06,UC-07] [UC-06-AS,UC-07-AS] Add cross-story integration/unit test refinements in `tests/unit/controllers/ReviewerAssignmentController.test.js` and `tests/unit/controllers/InvitationController.test.js`
- [ ] T050 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Update execution steps and command references in `specs/001-assign-reviewers/quickstart.md`
- [ ] T051 [UC-06,UC-07] [UC-06-AS,UC-07-AS] Perform final MVC boundary cleanup with no behavior change in `src/controllers/ReviewerAssignmentController.js` and `src/models/ReviewerAssignmentModel.js`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies
- Foundational (Phase 2): Depends on Phase 1; blocks all user stories
- User Stories (Phase 3-5): Depend on Phase 2 completion
- Polish (Phase 6): Depends on completion of selected user stories

### User Story Dependency Graph

- `US1` -> `US2`
- `US1` -> `US3`
- `US2` and `US3` can proceed in parallel after `US1` if team capacity allows

### Within-Story Execution Rules

- Complete validation task scaffolding before story sign-off
- Implement model contracts before controller orchestration when introducing new state rules
- Re-run mapped acceptance suite(s) and capture coverage evidence before marking story complete

---

## Parallel Execution Examples

### US1

- Run T017, T018, and T020 in parallel after T014-T016 complete.
- Run T019 in parallel with T024, then integrate via T021-T023.

### US2

- Run T026 and T028 in parallel.
- Run T029 and T030 in parallel, then complete controller integration in T031-T032.

### US3

- Run T035 and T037 in parallel.
- Run T038 and T039 in parallel, then integrate through T040-T042.

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phase 1 and Phase 2.
2. Deliver US1 end-to-end (Phase 3).
3. Validate with `UC-06-AS` evidence and coverage.
4. Demo/ship MVP.

### Incremental Delivery

1. Add US2 (replacement flow) and keep US1 passing.
2. Add US3 (invitation retry/failure flow) and keep US1/US2 passing.
3. Complete Phase 6 regression and coverage documentation before merge.

### Team Parallelization

1. One developer handles shared foundation (Phase 1-2).
2. After US1 baseline is stable, split US2 and US3 across developers.
3. Merge only with updated traceability, acceptance evidence, and coverage summaries.

