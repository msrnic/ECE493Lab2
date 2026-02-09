# Tasks: View Final Schedule

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-unpublished-schedule-notice/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/final-schedule.openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation (`Acceptance Tests/UC-15-AS.md`) and 100% line-coverage evidence for in-scope JavaScript are required by feature docs.  
**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Phase 1: Setup (Project Initialization)

**Purpose**: Create baseline project and tooling structure for MVC schedule delivery

- [ ] T001 Create MVC/source/test folder structure in `src/models/`, `src/views/`, `src/controllers/`, `src/services/`, `src/assets/css/`, `src/assets/js/`, `tests/acceptance/`, and `tests/unit/` (UC-15, UC-15-AS)
- [ ] T002 Initialize project scripts and dev dependencies for test/lint/coverage workflows in `package.json` (UC-15, UC-15-AS)
- [ ] T003 [P] Configure Vitest with `jsdom` test environment in `vitest.config.js` (UC-15, UC-15-AS)
- [ ] T004 [P] Configure c8 line-coverage threshold at 100% in `.c8rc.json` (UC-15, UC-15-AS)
- [ ] T005 [P] Create schedule page HTML shell and mount container in `src/index.html` (UC-15, UC-15-AS)
- [ ] T006 [P] Create base schedule stylesheet and layout scaffolding in `src/assets/css/final-schedule.css` (UC-15, UC-15-AS)
- [ ] T007 Create application bootstrap entry for schedule controller startup in `src/assets/js/app.js` (UC-15, UC-15-AS)
- [ ] T008 Create feature evidence/tracking sections for UC-15 in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared infrastructure required before either story

**⚠️ CRITICAL**: Complete this phase before starting any user story phase

- [ ] T009 Implement `GET /api/final-schedule` client and API error handling in `src/services/final-schedule-api.js` (UC-15, UC-15-AS)
- [ ] T010 [P] Implement viewer-context validation helpers from data model rules in `src/models/viewer-context-model.js` (UC-15, UC-15-AS)
- [ ] T011 [P] Implement shared final-schedule payload normalization utilities in `src/models/final-schedule-model.js` (UC-15, UC-15-AS)
- [ ] T012 [P] Implement reusable loading/error rendering helpers in `src/views/final-schedule-view.js` (UC-15, UC-15-AS)
- [ ] T013 Implement base controller orchestration (fetch -> model -> view) in `src/controllers/final-schedule-controller.js` (UC-15, UC-15-AS)
- [ ] T014 [P] Create shared published/unpublished test fixtures in `tests/unit/fixtures/final-schedule-fixtures.js` (UC-15, UC-15-AS)
- [ ] T015 [P] Create acceptance harness with mocked fetch setup in `tests/acceptance/uc-15-final-schedule.acceptance.test.js` (UC-15, UC-15-AS)
- [ ] T016 Configure `npm test`, `npm run lint`, and `npm run coverage` commands in `package.json` (UC-15, UC-15-AS)

**Checkpoint**: Shared contract, model, controller, and testing foundation is ready for independent story work

---

## Phase 3: User Story 1 - View Published Final Schedule (Priority: P1) 🎯 MVP

**Goal**: Show full published schedule to any viewer, highlight authenticated author sessions, and display conference/local times  
**Independent Test**: Open published schedule while unauthenticated to verify full schedule visibility, then open as authenticated author to verify highlight and dual-time display

### Tests and Validation (Required)

- [ ] T017 [US1] Add acceptance checks for published schedule visibility to any viewer in `tests/acceptance/uc-15-final-schedule.acceptance.test.js` (UC-15, UC-15-AS)
- [ ] T018 [P] [US1] Add model unit tests for published-state time-zone label derivation and author-session flagging in `tests/unit/final-schedule-model.test.js` (UC-15, UC-15-AS)
- [ ] T019 [P] [US1] Add view unit tests for published schedule rendering and highlight hooks in `tests/unit/final-schedule-view.test.js` (UC-15, UC-15-AS)
- [ ] T020 [P] [US1] Add controller unit tests for published-state fetch/render flow in `tests/unit/final-schedule-controller.test.js` (UC-15, UC-15-AS)
- [ ] T021 [US1] Add acceptance assertion for "within 2 actions after login" in `tests/acceptance/uc-15-final-schedule.acceptance.test.js` (UC-15, UC-15-AS)
- [ ] T022 [P] [US1] Add controller unit test for post-login action-count path in `tests/unit/final-schedule-controller.test.js` (UC-15, UC-15-AS)

### Implementation

- [ ] T023 [US1] Implement published-state validation and conference/local time formatting in `src/models/final-schedule-model.js` (UC-15, UC-15-AS)
- [ ] T024 [P] [US1] Implement full published schedule rendering with author highlight markers in `src/views/final-schedule-view.js` (UC-15, UC-15-AS)
- [ ] T025 [P] [US1] Implement published schedule styles for highlight and dual-time labels in `src/assets/css/final-schedule.css` (UC-15, UC-15-AS)
- [ ] T026 [US1] Implement controller logic for published responses and viewer personalization in `src/controllers/final-schedule-controller.js` (UC-15, UC-15-AS)
- [ ] T027 [US1] Wire page bootstrap to initialize final-schedule controller on load in `src/assets/js/app.js` (UC-15, UC-15-AS)
- [ ] T028 [US1] Record published-story acceptance and unit run evidence in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)
- [ ] T029 [US1] Record published-story c8 coverage evidence in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)

**Checkpoint**: US1 is independently testable and delivers MVP behavior

---

## Phase 4: User Story 2 - Show Unpublished Notice (Priority: P2)

**Goal**: Show a clear unpublished notice to any viewer and suppress schedule entries when status is unpublished  
**Independent Test**: Open schedule while unpublished and unauthenticated, verify notice appears without login and no schedule entries are shown

### Tests and Validation (Required)

- [ ] T030 [US2] Add acceptance checks for unpublished notice and zero-entry visibility in `tests/acceptance/uc-15-final-schedule.acceptance.test.js` (UC-15, UC-15-AS)
- [ ] T031 [P] [US2] Add model unit tests for unpublished payload rules (`notice` required, `sessions` absent) in `tests/unit/final-schedule-model.test.js` (UC-15, UC-15-AS)
- [ ] T032 [P] [US2] Add view unit tests for notice-only rendering and schedule suppression in `tests/unit/final-schedule-view.test.js` (UC-15, UC-15-AS)
- [ ] T033 [P] [US2] Add controller unit tests for published-to-unpublished refresh transition in `tests/unit/final-schedule-controller.test.js` (UC-15, UC-15-AS)

### Implementation

- [ ] T034 [US2] Implement unpublished-state guards preventing session exposure in `src/models/final-schedule-model.js` (UC-15, UC-15-AS)
- [ ] T035 [P] [US2] Implement unpublished notice rendering branch in `src/views/final-schedule-view.js` (UC-15, UC-15-AS)
- [ ] T036 [P] [US2] Implement unpublished notice visual treatment and hidden-schedule CSS rules in `src/assets/css/final-schedule.css` (UC-15, UC-15-AS)
- [ ] T037 [US2] Implement controller unpublished branch for initial load and refresh paths in `src/controllers/final-schedule-controller.js` (UC-15, UC-15-AS)
- [ ] T038 [US2] Record unpublished-story acceptance and unit run evidence in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)
- [ ] T039 [US2] Record unpublished-story c8 coverage evidence in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)

**Checkpoint**: US2 is independently testable and prevents unpublished data exposure

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final traceability, regression, and documentation updates across stories

- [ ] T040 [P] Update FR-to-test traceability and completion status in `specs/001-unpublished-schedule-notice/checklists/requirements.md` (UC-15, UC-15-AS)
- [ ] T041 Run full regression suite and append pass/fail evidence in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)
- [ ] T042 Enforce and document 100% line-coverage evidence from `npx c8 --reporter=text --reporter=lcov npm test` in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)
- [ ] T043 [P] Refine shared fixtures/utilities to remove duplicated test data in `tests/unit/fixtures/final-schedule-fixtures.js` (UC-15, UC-15-AS)
- [ ] T044 [P] Update execution/verification instructions for final workflow in `specs/001-unpublished-schedule-notice/quickstart.md` (UC-15, UC-15-AS)
- [ ] T045 Define stakeholder clarity survey protocol (sample size, prompt, scoring) in `specs/001-unpublished-schedule-notice/quickstart.md` (UC-15, UC-15-AS)
- [ ] T046 Record stakeholder clarity results and >=95% pass/fail evidence in `specs/001-unpublished-schedule-notice/checklists/schedule.md` (UC-15, UC-15-AS)

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): no dependencies
- Foundational (Phase 2): depends on Setup and blocks all story work
- User Story phases (Phase 3-4): depend on Foundational
- Polish (Phase 5): depends on completion of both user stories

### User Story Dependency Graph

```text
Phase 1 (Setup)
   -> Phase 2 (Foundational)
      -> US1 (P1, MVP)
      -> US2 (P2)
US1 + US2
   -> Phase 5 (Polish)
```

- US1 and US2 are functionally independent once foundational tasks are done
- Recommended merge order is US1 first, then US2, because both stories touch shared MVC files

### Within Each User Story

- Write acceptance/unit tests first
- Implement model rules before final controller integration
- Re-run acceptance plus coverage before marking story complete

## Parallel Execution Examples

### US1 Parallel Example

- Run `T018`, `T019`, and `T020` concurrently (different test files)
- Run `T024` and `T025` concurrently after `T023` (view and CSS files)

### US2 Parallel Example

- Run `T031`, `T032`, and `T033` concurrently (different test files)
- Run `T035` and `T036` concurrently after `T034` (view and CSS files)

## Implementation Strategy

### MVP First (Recommended)

1. Complete Phase 1 and Phase 2
2. Complete US1 (Phase 3) end-to-end
3. Validate acceptance + coverage evidence for US1
4. Demo/ship MVP behavior (published schedule flow)

### Incremental Delivery

1. Add US2 after US1 is stable
2. Re-run UC-15 acceptance scenarios for both states
3. Finish Phase 5 traceability, regression, coverage, and stakeholder-clarity documentation
