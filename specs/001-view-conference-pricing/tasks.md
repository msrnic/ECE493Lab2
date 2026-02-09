# Tasks: View Conference Pricing

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/pricing-api.openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation tasks for `Acceptance Tests/UC-16-AS.md` and coverage evidence tasks are included because they are explicitly required by the feature specification and plan.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create baseline project and verification scaffolding for UC-16.

- [ ] T001 [UC-16] [UC-16-AS] Create MVC and test directory scaffolding in `src/models/`, `src/views/`, `src/views/styles/`, `src/controllers/`, `src/assets/js/`, `tests/unit/`, and `tests/acceptance/`
- [ ] T002 [UC-16] [UC-16-AS] Create UC-16 to UC-16-AS traceability checklist in `specs/001-view-conference-pricing/checklists/traceability.md`
- [ ] T003 [P] [UC-16] [UC-16-AS] Initialize Node tooling scripts and dependencies for lint, Vitest, Playwright, c8, and axe-core in `package.json`
- [ ] T004 [P] [UC-16] [UC-16-AS] Configure Vitest unit test environment for DOM-based view/controller tests in `vitest.config.js`
- [ ] T005 [P] [UC-16] [UC-16-AS] Configure Playwright acceptance test runner for pricing-page workflows in `playwright.config.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared architecture and contracts before story work.

**Critical**: No user-story implementation starts before this phase completes.

- [ ] T006 [UC-16] [UC-16-AS] Define shared pricing outcome enums and normalization helpers in `src/models/pricing-model.js`
- [ ] T007 [P] [UC-16] [UC-16-AS] Implement base `/pricing` page semantic shell and ARIA live regions in `src/views/pricing-view.html`
- [ ] T008 [P] [UC-16] [UC-16-AS] Implement baseline WCAG 2.1 AA typography, spacing, and contrast tokens in `src/views/styles/pricing.css`
- [ ] T009 [UC-16] [UC-16-AS] Implement view state-rendering interface (loading/displayed/missing/unavailable) in `src/views/pricing-view.js`
- [ ] T010 [UC-16] [UC-16-AS] Implement controller bootstrap and dependency wiring for model/view composition in `src/controllers/pricing-controller.js`
- [ ] T011 [P] [UC-16] [UC-16-AS] Wire page entrypoint to initialize pricing controller on page load in `src/assets/js/pricing-page.js`
- [ ] T012 [UC-16] [UC-16-AS] Configure c8 coverage thresholds and reporting scripts for in-scope JavaScript in `package.json`

**Checkpoint**: Foundation complete, user stories can begin.

---

## Phase 3: User Story 1 - View Available Pricing (Priority: P1) 🎯 MVP

**Goal**: Public users see configured pricing details, including precomputed discounts, in the configured conference currency.

**Acceptance Suite**: `Acceptance Tests/UC-16-AS.md`

**Independent Test Criteria**: Open `/pricing` with configured pricing data and verify `pricing-displayed` output includes all complete configured items, precomputed discount values, and one configured currency.

### Validation Tasks

- [ ] T013 [P] [US1] [UC-16] [UC-16-AS] Implement UC-16-AS configured-pricing acceptance checks in `tests/acceptance/uc16-pricing.spec.js`
- [ ] T014 [P] [US1] [UC-16] [UC-16-AS] Add model unit tests for successful `GET /api/public/pricing` parsing and incomplete-item filtering in `tests/unit/pricing-model.test.js`
- [ ] T015 [P] [US1] [UC-16] [UC-16-AS] Add view unit tests for pricing rows, discount rows, and currency display rendering in `tests/unit/pricing-view.test.js`

### Implementation Tasks

- [ ] T016 [US1] [UC-16] [UC-16-AS] Implement `pricing-displayed` fetch and normalization flow for `GET /api/public/pricing` in `src/models/pricing-model.js`
- [ ] T017 [US1] [UC-16] [UC-16-AS] Implement rendering for pricing items and precomputed discounts in `src/views/pricing-view.js`
- [ ] T018 [US1] [UC-16] [UC-16-AS] Add pricing list and currency output containers for displayed state in `src/views/pricing-view.html`
- [ ] T019 [US1] [UC-16] [UC-16-AS] Implement initial-load controller flow for configured-pricing outcome in `src/controllers/pricing-controller.js`
- [ ] T020 [US1] [UC-16] [UC-16-AS] Implement `Intl.NumberFormat` currency formatting helper for configured conference currency in `src/views/pricing-view.js`
- [ ] T021 [US1] [UC-16] [UC-16-AS] Record configured-pricing acceptance evidence for UC-16-AS in `specs/001-view-conference-pricing/checklists/us1-acceptance.md`
- [ ] T022 [P] [US1] [UC-16] [UC-16-AS] Add Playwright timing measurement and SC-002 threshold assertion in `tests/acceptance/uc16-pricing.spec.js`
- [ ] T023 [US1] [UC-16] [UC-16-AS] Record SC-002 timing evidence and percentile calculation in `specs/001-view-conference-pricing/checklists/performance.md`
- [ ] T024 [P] [US1] [UC-16] [UC-16-AS] Add acceptance coverage for direct URL access to `/pricing` without login in `tests/acceptance/uc16-pricing.spec.js`
- [ ] T025 [P] [US1] [UC-16] [UC-16-AS] Add zero-dollar pricing-item rendering tests in `tests/unit/pricing-view.test.js`

**Checkpoint**: US1 delivers MVP pricing display and is independently testable.

---

## Phase 4: User Story 2 - Handle Missing Pricing and Temporary Failures (Priority: P2)

**Goal**: Public users see clear, distinct outcomes for missing pricing and temporary retrieval failures, including a user-initiated retry action.

**Acceptance Suite**: `Acceptance Tests/UC-16-AS.md`

**Independent Test Criteria**: Open `/pricing` with missing configuration and with simulated temporary retrieval failures; verify distinct messages and that `Try Again` re-requests `/api/public/pricing` without automatic retries.

### Validation Tasks

- [ ] T026 [P] [US2] [UC-16] [UC-16-AS] Extend UC-16-AS acceptance coverage for `pricing-missing` and `pricing-temporarily-unavailable` outcomes in `tests/acceptance/uc16-pricing.spec.js`
- [ ] T027 [P] [US2] [UC-16] [UC-16-AS] Add model unit tests for missing-pricing vs temporary-failure outcome mapping in `tests/unit/pricing-model.test.js`
- [ ] T028 [P] [US2] [UC-16] [UC-16-AS] Add view unit tests for distinct messages, live-region announcements, and retry button visibility in `tests/unit/pricing-view.test.js`

### Implementation Tasks

- [ ] T029 [US2] [UC-16] [UC-16-AS] Implement `pricing-missing` and `pricing-temporarily-unavailable` parsing logic for `GET /api/public/pricing` in `src/models/pricing-model.js`
- [ ] T030 [US2] [UC-16] [UC-16-AS] Implement distinct missing/unavailable messaging and retry-action rendering in `src/views/pricing-view.js`
- [ ] T031 [US2] [UC-16] [UC-16-AS] Add informational-message and retry-button markup with ARIA attributes in `src/views/pricing-view.html`
- [ ] T032 [US2] [UC-16] [UC-16-AS] Implement user-initiated `Try Again` controller flow with no automatic retries in `src/controllers/pricing-controller.js`
- [ ] T033 [US2] [UC-16] [UC-16-AS] Add style rules for informational states, retry focus visibility, and contrast compliance in `src/views/styles/pricing.css`
- [ ] T034 [US2] [UC-16] [UC-16-AS] Record missing/unavailable and retry acceptance evidence for UC-16-AS in `specs/001-view-conference-pricing/checklists/us2-acceptance.md`
- [ ] T035 [US2] [UC-16] [UC-16-AS] Create scripted usability protocol for SC-004 in `specs/001-view-conference-pricing/checklists/usability-script.md`
- [ ] T036 [US2] [UC-16] [UC-16-AS] Execute SC-004 usability protocol and capture results in `specs/001-view-conference-pricing/checklists/usability-results.md`
- [ ] T037 [US2] [UC-16] [UC-16-AS] Execute and record NVDA/VoiceOver announcement checks in `specs/001-view-conference-pricing/checklists/screen-reader-validation.md`

**Checkpoint**: US2 is independently verifiable for missing and temporary-failure flows.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, accessibility, regression, and documentation updates across stories.

- [ ] T038 [P] [UC-16] [UC-16-AS] Add/validate axe-core accessibility assertions for pricing and informational outcomes in `tests/acceptance/uc16-pricing.spec.js`
- [ ] T039 [UC-16] [UC-16-AS] Run UC-16 acceptance regression and summarize results in `specs/001-view-conference-pricing/checklists/final-verification.md`
- [ ] T040 [UC-16] [UC-16-AS] Enforce and record c8 line-coverage results for in-scope JS modules in `specs/001-view-conference-pricing/checklists/coverage.md`
- [ ] T041 [UC-16] [UC-16-AS] Update final requirement-to-test traceability status in `specs/001-view-conference-pricing/checklists/traceability.md`
- [ ] T042 [P] [UC-16] [UC-16-AS] Add final controller/model/view integration regression tests in `tests/unit/pricing-controller.test.js`
- [ ] T043 [UC-16] [UC-16-AS] Document final MVC boundaries, retry policy, and currency/discount constraints in `specs/001-view-conference-pricing/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies.
- Foundational (Phase 2): Depends on Setup; blocks all user stories.
- User Story Phases (Phase 3-4): Depend on Foundational completion.
- Polish (Phase 5): Depends on completion of all user stories.

### User Story Dependency Graph

- `US1 (P1) -> US2 (P2)` for recommended incremental delivery.
- US2 can start after Phase 2 if ownership of shared files (`src/models/pricing-model.js`, `src/views/pricing-view.js`, `src/controllers/pricing-controller.js`) is coordinated.

### Contract-to-Story Mapping

- `GET /pricing` (page shell) maps to foundational structure and US1 rendering tasks (`T007`, `T018`).
- `GET /api/public/pricing` displayed outcome maps primarily to US1 tasks (`T014`, `T016`, `T019`).
- `GET /api/public/pricing` missing and temporary-unavailable outcomes map to US2 tasks (`T026`, `T027`, `T029`, `T032`).

---

## Parallel Execution Examples

### US1 Parallel Example

- Run `T013`, `T014`, and `T015` together (acceptance/unit tests touch separate files).
- Run `T016` and `T018` together once foundational view/model contracts are stable.

### US2 Parallel Example

- Run `T026`, `T027`, and `T028` together (acceptance + unit tests in separate files).
- Run `T029` and `T033` together (model logic and CSS styling are independent files).

---

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Complete US1 tasks (`T013`-`T025`) and verify configured-pricing behavior.
3. Demonstrate MVP by passing UC-16-AS configured-pricing scenarios.

### Incremental Delivery

1. Add US2 tasks (`T026`-`T037`) for missing/unavailable/retry states.
2. Re-run and preserve US1 acceptance behavior while adding US2.
3. Finish with Phase 5 regression, accessibility, and coverage evidence tasks.

### Completeness Check

- Every user story has validation + implementation + evidence tasks.
- Each story has explicit independent test criteria.
- Contract endpoints and data-model outcomes are mapped to story tasks.
- Coverage and accessibility verification are explicitly captured before sign-off.
