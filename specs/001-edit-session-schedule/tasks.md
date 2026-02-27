# Tasks: Edit Conference Schedule

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation tasks are included for `UC-14-AS`; unit, contract, performance, regression, and coverage tasks are included because the feature specification, plan, and constitution require them.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

**Task Labeling Rule**: Every task MUST include `[UC-14] [UC-14-AS]`; user-story implementation tasks also include `[US1]` or `[US2]`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create project scaffolding and traceability baseline

- [ ] T001 [UC-14] [UC-14-AS] Create MVC and asset directories in `src/models/`, `src/views/`, `src/controllers/`, `src/assets/css/`, and `src/assets/js/`
- [ ] T002 [UC-14] [UC-14-AS] Create backend directories and route/service scaffolding in `backend/routes/` and `backend/services/`
- [ ] T003 [UC-14] [UC-14-AS] Create test directory structure in `tests/unit/`, `tests/contract/`, `tests/acceptance/`, `tests/fixtures/`, and `tests/setup/`
- [ ] T004 [P] [UC-14] [UC-14-AS] Create the edit schedule page shell in `src/index.html`
- [ ] T005 [P] [UC-14] [UC-14-AS] Create stylesheet scaffold for schedule editing UI in `src/assets/css/edit-schedule.css`
- [ ] T006 [P] [UC-14] [UC-14-AS] Configure test and coverage scripts for Jest + c8 in `package.json`
- [ ] T007 [UC-14] [UC-14-AS] Create FR/SC-to-acceptance traceability baseline in `specs/001-edit-session-schedule/traceability.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared runtime and testing foundations required by all user stories

**Critical**: No user story work should be completed before this phase is done

- [ ] T008 [UC-14] [UC-14-AS] Implement shared fetch wrappers for schedule, save-attempt, override-save, and publish-attempt APIs in `src/assets/js/schedule-api-client.js`
- [ ] T009 [UC-14] [UC-14-AS] Implement canonical schedule state container with version and unsaved-edit tracking in `src/models/schedule-model.js`
- [ ] T010 [P] [UC-14] [UC-14-AS] Implement shared conflict normalization and serialization helpers in `src/models/conflict-model.js`
- [ ] T011 [P] [UC-14] [UC-14-AS] Implement override reason and affected-conflict validation helpers in `src/models/override-audit-model.js`
- [ ] T012 [P] [UC-14] [UC-14-AS] Implement reusable schedule editor layout/status rendering helpers in `src/views/edit-schedule-view.js`
- [ ] T013 [UC-14] [UC-14-AS] Create API fixture payloads for success, warning, stale, override, and publish responses in `tests/fixtures/schedule-api.json`
- [ ] T014 [UC-14] [UC-14-AS] Configure Jest project mapping for unit/contract/acceptance suites in `jest.config.js`
- [ ] T015 [UC-14] [UC-14-AS] Add shared DOM and fetch test bootstrap setup in `tests/setup/jest.setup.js`
- [ ] T016 [UC-14] [UC-14-AS] Implement Express app bootstrap and middleware wiring in `backend/app.js`
- [ ] T017 [UC-14] [UC-14-AS] Implement route registration shell for schedules/saves/publish endpoints in `backend/routes/index.js`
- [ ] T018 [UC-14] [UC-14-AS] Create shared schedule service interface and repository stubs in `backend/services/schedule-service.js`

**Checkpoint**: Shared architecture and test foundations are ready

---

## Phase 3: User Story 1 - Update a Session Schedule (Priority: P1) 🎯 MVP

**Goal**: Allow an editor to select a session, edit scheduling details, save successfully, and recover from stale-state save blocking with unsaved edits retained.

**Independent Test Criteria**: Edit one existing session, save it, verify persisted changes and success feedback, then simulate stale version save and verify save is blocked while unsaved edits remain available for reapplication.

### Validation & Test Tasks

- [ ] T019 [P] [UC-14] [UC-14-AS] [US1] Author unit tests for session edit application, version checks, and unsaved-change retention in `tests/unit/schedule-model.test.js`
- [ ] T020 [P] [UC-14] [UC-14-AS] [US1] Author contract tests for `GET /api/schedules/{scheduleId}` and success/stale responses of `POST /api/schedules/{scheduleId}/save-attempts` in `tests/contract/save-attempt.contract.test.js`
- [ ] T021 [UC-14] [UC-14-AS] [US1] Translate UC-14 main-success and stale-state scenarios into executable acceptance checks in `tests/acceptance/UC-14-AS-us1.test.js`

### Implementation Tasks

- [ ] T022 [UC-14] [UC-14-AS] [US1] Implement session selection and draft edit mutation APIs in `src/models/schedule-model.js`
- [ ] T023 [P] [UC-14] [UC-14-AS] [US1] Implement schedule edit form rendering with success and stale-state message regions in `src/views/edit-schedule-view.js`
- [ ] T024 [UC-14] [UC-14-AS] [US1] Implement load/edit/save flow with 412 stale handling in `src/controllers/save-attempt-controller.js`
- [ ] T025 [UC-14] [UC-14-AS] [US1] Implement event orchestration for select, edit, save, reload, and reapply actions in `src/controllers/edit-schedule-controller.js`
- [ ] T026 [UC-14] [UC-14-AS] [US1] Add session selection and edit form markup hooks in `src/index.html`
- [ ] T027 [UC-14] [UC-14-AS] [US1] Add styles for editable rows, success confirmation, and stale warning states in `src/assets/css/edit-schedule.css`
- [ ] T028 [UC-14] [UC-14-AS] [US1] Implement `GET /api/schedules/{scheduleId}` endpoint handler in `backend/routes/schedules.js`
- [ ] T029 [UC-14] [UC-14-AS] [US1] Implement `POST /api/schedules/{scheduleId}/save-attempts` endpoint handler in `backend/routes/saves.js`
- [ ] T030 [UC-14] [UC-14-AS] [US1] Implement schedule fetch, stale guard, and save-attempt service logic in `backend/services/schedule-service.js`
- [ ] T031 [UC-14] [UC-14-AS] [US1] Execute `Acceptance Tests/UC-14-AS.md` scenarios mapped to US1 and capture evidence in `tests/acceptance/UC-14-AS-us1-results.md`
- [ ] T032 [UC-14] [UC-14-AS] [US1] Run c8 coverage for US1-scoped modules and document uncovered lines in `tests/acceptance/coverage-us1.md`

**Checkpoint**: US1 is complete and independently verifiable

---

## Phase 4: User Story 2 - Warn When Conflicts Remain (Priority: P2)

**Goal**: Warn editors about unresolved conflicts, support explicit override saves with required audit reason, and block publish/finalization while unresolved conflicts exist.

**Independent Test Criteria**: Trigger unresolved conflicts on save, verify warning and cancel path, verify override save with required reason and audit metadata, then verify publish attempt is blocked until conflicts are resolved.

### Validation & Test Tasks

- [ ] T033 [P] [UC-14] [UC-14-AS] [US2] Author unit tests for unresolved-conflict state transitions and override reason validation in `tests/unit/conflict-and-override-model.test.js`
- [ ] T034 [P] [UC-14] [UC-14-AS] [US2] Author contract tests for warning `409`, override save `200`, and publish-block `409` responses in `tests/contract/override-and-publish.contract.test.js`
- [ ] T035 [UC-14] [UC-14-AS] [US2] Translate conflict warning, cancel, override, and publish-block scenarios into executable acceptance checks in `tests/acceptance/UC-14-AS-us2.test.js`

### Implementation Tasks

- [ ] T036 [UC-14] [UC-14-AS] [US2] Implement unresolved-conflict persistence and visible flagging rules in `src/models/conflict-model.js`
- [ ] T037 [UC-14] [UC-14-AS] [US2] Implement override audit payload builder with required reason, actor, timestamp, and affected conflicts in `src/models/override-audit-model.js`
- [ ] T038 [P] [UC-14] [UC-14-AS] [US2] Implement conflict warning modal, decision token handling, and override reason input rendering in `src/views/conflict-warning-view.js`
- [ ] T039 [UC-14] [UC-14-AS] [US2] Implement warning decision flow and override save submission in `src/controllers/save-attempt-controller.js`
- [ ] T040 [UC-14] [UC-14-AS] [US2] Implement publish/finalization guard controller flow and block messaging in `src/controllers/publish-guard-controller.js`
- [ ] T041 [UC-14] [UC-14-AS] [US2] Integrate unresolved-conflict and publish-action UI hooks in `src/index.html`
- [ ] T042 [UC-14] [UC-14-AS] [US2] Add styles for conflict badges, warning modal states, and publish-block alerts in `src/assets/css/edit-schedule.css`
- [ ] T043 [UC-14] [UC-14-AS] [US2] Implement `POST /api/schedules/{scheduleId}/override-saves` endpoint handler in `backend/routes/saves.js`
- [ ] T044 [UC-14] [UC-14-AS] [US2] Implement `POST /api/schedules/{scheduleId}/publish-attempts` endpoint handler in `backend/routes/publish.js`
- [ ] T045 [UC-14] [UC-14-AS] [US2] Implement override-audit persistence and publish-block service logic in `backend/services/schedule-service.js`
- [ ] T046 [UC-14] [UC-14-AS] [US2] Execute `Acceptance Tests/UC-14-AS.md` scenarios mapped to US2 and capture evidence in `tests/acceptance/UC-14-AS-us2-results.md`
- [ ] T047 [UC-14] [UC-14-AS] [US2] Run c8 coverage for US2-scoped modules and document uncovered lines in `tests/acceptance/coverage-us2.md`

**Checkpoint**: US2 is complete and independently verifiable

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final integration hardening, regression evidence, measurable outcomes, and documentation updates

- [ ] T048 [P] [UC-14] [UC-14-AS] Update full FR/SC-to-task and endpoint traceability matrix in `specs/001-edit-session-schedule/traceability.md`
- [ ] T049 [UC-14] [UC-14-AS] Define previously passing acceptance suite baseline in `tests/acceptance/baseline-suites.md`
- [ ] T050 [UC-14] [UC-14-AS] Execute baseline suites plus `Acceptance Tests/UC-14-AS.md` and archive consolidated evidence in `tests/acceptance/regression-full.md`
- [ ] T051 [UC-14] [UC-14-AS] Measure save-validation response performance (<=2s p95) and record results in `tests/acceptance/perf-save-attempt.md`
- [ ] T052 [UC-14] [UC-14-AS] Measure conflict-warning render performance (<=200ms p95) and record results in `tests/acceptance/perf-conflict-warning.md`
- [ ] T053 [UC-14] [UC-14-AS] Measure publish/finalization guard response performance (<=1s p95) and record results in `tests/acceptance/perf-publish-guard.md`
- [ ] T054 [UC-14] [UC-14-AS] Run SC-001 timed edit-save study (>=20 trials, >=95% under 2 minutes) and capture evidence in `tests/acceptance/sc-001-results.md`
- [ ] T055 [UC-14] [UC-14-AS] Run SC-004 immediate-refresh consistency study (>=100 trials, >=98% success) and capture evidence in `tests/acceptance/sc-004-results.md`
- [ ] T056 [UC-14] [UC-14-AS] Run SC-005 warning-clarity survey (>=20 participants, >=85% score >=4/5) and capture evidence in `tests/acceptance/sc-005-results.md`
- [ ] T057 [UC-14] [UC-14-AS] Enforce final 100% in-scope JavaScript line coverage gate and log report in `tests/acceptance/coverage-final.md`
- [ ] T058 [P] [UC-14] [UC-14-AS] Update final implementation/run commands and verification notes in `specs/001-edit-session-schedule/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all story phases.
- US1 (Phase 3) depends on Foundational completion.
- US2 (Phase 4) depends on Foundational completion and should be completed after US1 for priority-first delivery.
- Polish (Phase 5) depends on both stories being complete.

### User Story Dependency Graph

```text
Phase 1 Setup
  -> Phase 2 Foundational
    -> Phase 3 US1 (P1)
      -> Phase 4 US2 (P2)
        -> Phase 5 Polish
```

### Story-Level Parallel Execution Examples

- **US1 Parallel Example**: Run T019 and T020 together, then run T022 and T023 together, then finish controller/API integration tasks.
- **US2 Parallel Example**: Run T033 and T034 together, then run T036 and T038 together, then finish controller/API integration tasks.

### Global Parallel Opportunities

- Setup tasks marked `[P]` (T004-T006) can run concurrently after T001-T003.
- Foundational tasks marked `[P]` (T010-T012) can run concurrently after T008-T009.
- Polish tasks marked `[P]` (T048 and T058) can run concurrently after regression/performance plans are fixed.

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Complete US1 tasks T019-T032.
3. Demonstrate `UC-14-AS` acceptance and coverage evidence for US1 before starting US2.

### Incremental Delivery

1. Deliver US1 as the first shippable increment.
2. Add US2 warning/override/publish-guard capabilities in a second increment.
3. Finish with Phase 5 regression, performance, SC metric evidence, traceability, and coverage closure.
