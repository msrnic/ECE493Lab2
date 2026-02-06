---
description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Acceptance validation tasks are MANDATORY for every in-scope `UC-XX` via
`Acceptance Tests/UC-XX-AS.md`. Coverage tasks are also MANDATORY and MUST target 100% line
coverage for in-scope project-owned JavaScript; coverage below 95% requires an approved exception.
Additional tests are optional.

**Organization**: Tasks are grouped by use case so each UC can be implemented and validated
independently.

## Format: `[ID] [P?] [UC] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[UC]**: Governing use case ID (e.g., `UC-01`)
- Include exact file paths in descriptions
- Include mapped acceptance suite ID (`UC-XX-AS`) in each use-case task description

## Path Conventions

- **MVC web app**: `src/models/`, `src/views/`, `src/controllers/`
- **Static assets**: `src/assets/css/`, `src/assets/js/`
- **Acceptance evidence**: `tests/acceptance/`
- **Unit tests**: `tests/unit/`

<!--
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.

  The /speckit.tasks command MUST replace these with actual tasks based on:
  - Scoped use cases and acceptance suites from spec.md
  - Constitution gates from plan.md
  - Data and interaction design from research.md/data-model.md
  - Contracts (if any)

  Every use-case phase MUST include acceptance validation tasks before completion.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish project scaffolding and traceability baseline

- [ ] T001 Create MVC folder structure in `src/models/`, `src/views/`, `src/controllers/`
- [ ] T002 Create traceability table linking scoped `UC-XX` to `UC-XX-AS`
- [ ] T003 [P] Initialize HTML/CSS/JS project skeleton (`src/index.html`, assets directories)
- [ ] T004 [P] Configure linting/formatting for JavaScript and CSS

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core architecture required before any use-case implementation

**⚠️ CRITICAL**: No use-case work can begin until this phase is complete

- [ ] T005 Implement shared model state base in `src/models/`
- [ ] T006 [P] Implement shared view rendering/layout helpers in `src/views/`
- [ ] T007 [P] Implement controller event routing shell in `src/controllers/`
- [ ] T008 Define acceptance result capture format in `tests/acceptance/`
- [ ] T009 Configure coverage instrumentation and reporting for JavaScript
- [ ] T010 Document MVC boundaries and allowed dependencies

**Checkpoint**: Foundation ready - use-case implementation may begin

---

## Phase 3: Use Case UC-XX - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of delivered behavior from `Use Cases/UC-XX.md`]

**Acceptance Suite**: `Acceptance Tests/UC-XX-AS.md`

**Independent Test**: [How to run and verify UC-XX acceptance scenarios]

### Validation Tasks (MANDATORY)

- [ ] T011 [P] [UC-XX] Translate acceptance scenarios from `UC-XX-AS` into executable/manual checks
- [ ] T012 [UC-XX] Execute `Acceptance Tests/UC-XX-AS.md` and record evidence in `tests/acceptance/`
- [ ] T013 [UC-XX] Run coverage report for mapped JavaScript and record coverage percentage

### Implementation Tasks

- [ ] T014 [P] [UC-XX] Implement model updates in `src/models/[feature].js`
- [ ] T015 [P] [UC-XX] Implement view updates in `src/views/[feature].js`
- [ ] T016 [UC-XX] Implement controller flow in `src/controllers/[feature].js`
- [ ] T017 [UC-XX] Update HTML/CSS assets required for the scenario
- [ ] T018 [UC-XX] Re-run `UC-XX-AS`, improve coverage toward 100%, and document any uncovered lines

**Checkpoint**: UC-XX is complete and independently verifiable

---

## Phase 4: Use Case UC-YY - [Title] (Priority: P2)

**Goal**: [Brief description of delivered behavior from `Use Cases/UC-YY.md`]

**Acceptance Suite**: `Acceptance Tests/UC-YY-AS.md`

**Independent Test**: [How to run and verify UC-YY acceptance scenarios]

### Validation Tasks (MANDATORY)

- [ ] T019 [P] [UC-YY] Translate acceptance scenarios from `UC-YY-AS` into executable/manual checks
- [ ] T020 [UC-YY] Execute `Acceptance Tests/UC-YY-AS.md` and record evidence in `tests/acceptance/`
- [ ] T021 [UC-YY] Run coverage report for mapped JavaScript and record coverage percentage

### Implementation Tasks

- [ ] T022 [P] [UC-YY] Implement model updates in `src/models/[feature].js`
- [ ] T023 [P] [UC-YY] Implement view updates in `src/views/[feature].js`
- [ ] T024 [UC-YY] Implement controller flow in `src/controllers/[feature].js`
- [ ] T025 [UC-YY] Integrate with previously completed use cases without regressions
- [ ] T026 [UC-YY] Re-run `UC-YY-AS`, improve coverage toward 100%, and document any uncovered lines

**Checkpoint**: UC-XX and UC-YY pass independently and together

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning multiple use cases

- [ ] TXXX [P] Update traceability matrix for all completed UCs
- [ ] TXXX Perform full regression run across all completed `UC-XX-AS` suites
- [ ] TXXX Enforce coverage threshold and exception documentation for all scoped use cases (95% minimum unless approved exception)
- [ ] TXXX [P] Add or refine unit tests in `tests/unit/`
- [ ] TXXX Improve documentation for MVC boundaries and acceptance execution
- [ ] TXXX Final code cleanup/refactoring with no acceptance regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: Depends on Setup and blocks all use-case phases
- **Use Cases (Phase 3+)**: Depend on Foundational completion
- **Polish (Final Phase)**: Depends on all desired use cases being complete

### Use Case Dependencies

- Each use-case phase MUST reference one `UC-XX` and one `UC-XX-AS`
- A use case can begin after Foundational completion
- Later use cases MAY build on earlier ones but MUST keep prior acceptance suites passing

### Within Each Use Case

- Acceptance validation tasks MUST be completed and passing before sign-off
- Coverage evidence MUST be produced for scoped JavaScript before sign-off
- Models before views/controllers where state contracts are introduced
- Controller integration after model/view changes
- Re-run impacted prior acceptance suites before marking complete

### Parallel Opportunities

- Setup and foundational tasks marked `[P]` can run in parallel
- Distinct model/view tasks within one use case can run in parallel
- Different use cases can run in parallel only when file ownership and dependencies are clear

---

## Implementation Strategy

### MVP First

1. Complete Setup and Foundational phases
2. Complete one P1 use case (`UC-XX`) end-to-end
3. Validate `UC-XX-AS` with recorded evidence
4. Ship/demo MVP

### Incremental Delivery

1. Add one use case at a time in priority order
2. Pass the mapped `UC-XX-AS` suite for each increment
3. Re-run previously passing suites to prevent regressions
4. Ship after each stable increment

### Parallel Team Strategy

1. Team aligns on shared foundational architecture
2. Assign independent UCs to different developers
3. Merge only when each branch shows acceptance evidence and no regression

---

## Notes

- Every task must be traceable to a use case and acceptance suite
- Avoid cross-use-case coupling that prevents independent validation
- Do not mark a use case complete without passing `UC-XX-AS`
- Do not mark a use case complete without recorded coverage evidence and documented uncovered lines
- Preserve strict MVC boundaries while implementing and refactoring
