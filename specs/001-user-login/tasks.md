# Tasks: User Login Access

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/`
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance and coverage tasks are included because `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md` and `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/plan.md` explicitly require UC-02-AS evidence and 100% in-scope JavaScript line coverage.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Phase 1: Setup (Project Initialization)

**Purpose**: Create initial project scaffolding and baseline files for the login feature.

- [ ] T001 Create directory skeleton in `src/views/`, `src/controllers/`, `src/models/`, `src/assets/css/`, `src/assets/js/`, `server/routes/`, `server/controllers/`, `server/models/`, `tests/acceptance/`, `tests/integration/`, `tests/unit/models/`, and `tests/unit/controllers/` for `UC-02` / `UC-02-AS`
- [ ] T002 Initialize Node project scripts and dependencies in `package.json` for `UC-02` / `UC-02-AS`
- [ ] T003 [P] Create HTML entry point shell for login UI in `src/index.html` for `UC-02` / `UC-02-AS`
- [ ] T004 [P] Create base login page stylesheet in `src/assets/css/login.css` for `UC-02` / `UC-02-AS`
- [ ] T005 [P] Create front-end bootstrap script for app startup in `src/assets/js/app.js` for `UC-02` / `UC-02-AS`
- [ ] T006 Create login traceability seed document linking FR-001..FR-010 to UC-02/UC-02-AS in `specs/001-user-login/traceability.md` for `UC-02` / `UC-02-AS`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implement shared architecture required before user story delivery.

**⚠️ CRITICAL**: Complete this phase before starting any user story tasks.

- [ ] T007 Configure test and coverage tooling (`jest`, `supertest`, `c8`) in `package.json`, `jest.config.js`, and `.c8rc.json` for `UC-02` / `UC-02-AS`
- [ ] T008 [P] Create Express server bootstrap with JSON parsing and session middleware in `server/app.js` for `UC-02` / `UC-02-AS`
- [ ] T009 [P] Define authentication route module for `POST /api/auth/login` and `GET /api/auth/session` in `server/routes/auth-routes.js` for `UC-02` / `UC-02-AS`
- [ ] T010 Implement authentication controller contract stubs matching `contracts/openapi.yaml` in `server/controllers/auth-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T011 [P] Implement registered account lookup and password verification helpers in `server/models/user-account-model.js` for `UC-02` / `UC-02-AS`
- [ ] T012 [P] Implement credential normalization and required-field validation model in `src/models/credential-submission-model.js` for `UC-02` / `UC-02-AS`
- [ ] T013 [P] Implement front-end authentication session state model in `src/models/auth-session-model.js` for `UC-02` / `UC-02-AS`
- [ ] T014 Create acceptance/integration test harness scaffolding in `tests/acceptance/uc-02-login.acceptance.test.js` and `tests/integration/auth-api.integration.test.js` for `UC-02` / `UC-02-AS`

**Checkpoint**: Shared foundations are ready for story-specific implementation.

---

## Phase 3: User Story 1 - Successful Login to Dashboard (Priority: P1) 🎯 MVP

**Goal**: Registered users can log in with valid credentials and reach dashboard access.

**Independent Test Criteria**: With a seeded registered account, submitting valid credentials authenticates the session and results in dashboard access while authenticated navigation remains valid.

### Tests (Requested)

- [ ] T015 [P] [US1] Add unit tests for successful credential normalization and authenticated session state transitions in `tests/unit/models/credential-submission-model.test.js` and `tests/unit/models/auth-session-model.test.js` for `UC-02` / `UC-02-AS`
- [ ] T016 [P] [US1] Add integration tests for `POST /api/auth/login` success and authenticated `GET /api/auth/session` responses in `tests/integration/auth-api.integration.test.js` for `UC-02` / `UC-02-AS`
- [ ] T017 [US1] Add acceptance test coverage for the valid-credential UC-02-AS scenario in `tests/acceptance/uc-02-login.acceptance.test.js` for `UC-02` / `UC-02-AS`

### Implementation

- [ ] T018 [P] [US1] Implement login form rendering and submit controls in `src/index.html` and `src/views/login-view.js` for `UC-02` / `UC-02-AS`
- [ ] T019 [P] [US1] Implement dashboard view module and authenticated handoff to `/dashboard` in `src/views/dashboard-view.js` for `UC-02` / `UC-02-AS`
- [ ] T020 [US1] Implement front-end login submit flow to `POST /api/auth/login` in `src/controllers/login-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T021 [US1] Implement session-check redirect flow using `GET /api/auth/session` in `src/controllers/session-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T022 [US1] Implement successful authentication and session creation logic in `server/controllers/auth-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T023 [US1] Wire auth controllers into routes and middleware in `server/routes/auth-routes.js` and `server/app.js` for `UC-02` / `UC-02-AS`
- [ ] T024 [US1] Execute US1 acceptance/integration/unit test runs and capture coverage output in `tests/acceptance/uc-02-login.acceptance.test.js` and `coverage/lcov.info` for `UC-02` / `UC-02-AS`

**Checkpoint**: US1 is complete and can be validated independently.

---

## Phase 4: User Story 2 - Invalid Credential Handling (Priority: P2)

**Goal**: Invalid login attempts are denied with generic messaging, and account-level throttling is enforced after repeated failures.

**Independent Test Criteria**: Invalid credentials always deny access with `Invalid email or password.`, fifth failure blocks further attempts for 10 minutes with temporary-block response, and successful login after prior failures resets the failed-attempt counter.

### Tests (Requested)

- [ ] T025 [P] [US2] Add unit tests for failed-attempt counter and block-window transitions in `tests/unit/models/failed-login-tracker-model.test.js` for `UC-02` / `UC-02-AS`
- [ ] T026 [P] [US2] Extend integration tests for invalid-credential `401`, temporary-block `429`, and retry metadata in `tests/integration/auth-api.integration.test.js` for `UC-02` / `UC-02-AS`
- [ ] T027 [US2] Add acceptance test coverage for the invalid-credential UC-02-AS scenario in `tests/acceptance/uc-02-login.acceptance.test.js` for `UC-02` / `UC-02-AS`

### Implementation

- [ ] T028 [P] [US2] Implement failed-login tracker state model (`failedCount`, `blockedUntil`, reset behavior) in `server/models/failed-login-tracker-model.js` for `UC-02` / `UC-02-AS`
- [ ] T029 [US2] Integrate failed-login tracker checks into login controller flow in `server/controllers/auth-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T030 [US2] Implement generic invalid-credential error payload (`Invalid email or password.`) in `server/controllers/auth-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T031 [US2] Implement temporary-block response payload (`retryAfterSeconds`, `blockedUntil`) in `server/controllers/auth-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T032 [US2] Implement login error message rendering for invalid and blocked states in `src/views/login-view.js` for `UC-02` / `UC-02-AS`
- [ ] T033 [US2] Implement front-end retry/lockout handling in `src/controllers/login-controller.js` for `UC-02` / `UC-02-AS`
- [ ] T034 [US2] Implement immediate failed-attempt reset on successful login in `server/controllers/auth-controller.js` and `server/models/failed-login-tracker-model.js` for `UC-02` / `UC-02-AS`
- [ ] T035 [US2] Execute US2 acceptance/integration/unit test runs and capture coverage output in `tests/acceptance/uc-02-login.acceptance.test.js` and `coverage/lcov.info` for `UC-02` / `UC-02-AS`

**Checkpoint**: US2 is complete and can be validated independently.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final regression, coverage enforcement, and documentation cleanup across stories.

- [ ] T036 [P] Run full regression for login acceptance and API integration suites in `tests/acceptance/uc-02-login.acceptance.test.js` and `tests/integration/auth-api.integration.test.js` for `UC-02` / `UC-02-AS`
- [ ] T037 Enforce and record 100% in-scope JavaScript line coverage results in `coverage/coverage-summary.json` and `specs/001-user-login/coverage-report.md` for `UC-02` / `UC-02-AS`
- [ ] T038 [P] Refine responsive login/dashboard styling and view presentation details in `src/assets/css/login.css`, `src/views/login-view.js`, and `src/views/dashboard-view.js` for `UC-02` / `UC-02-AS`
- [ ] T039 Update implementation and test execution guidance in `README.md` and `specs/001-user-login/quickstart.md` for `UC-02` / `UC-02-AS`
- [ ] T040 Define SC-002 performance test profile in `specs/001-user-login/performance-plan.md` for `UC-02` / `UC-02-AS`
- [ ] T041 [P] Implement login API performance test in `tests/integration/auth-api.performance.test.js` for `UC-02` / `UC-02-AS`
- [ ] T042 Execute performance run and record p95/10-second evidence in `specs/001-user-login/performance-report.md` for `UC-02` / `UC-02-AS`
- [ ] T043 [P] [US1] Add integration assertion that successful login requires only email/password and returns no MFA/challenge step in `tests/integration/auth-api.integration.test.js` for `UC-02` / `UC-02-AS`
- [ ] T044 [US1] Add acceptance assertion for SC-007 (no additional authentication step) in `tests/acceptance/uc-02-login.acceptance.test.js` for `UC-02` / `UC-02-AS`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1) has no dependencies.
- Foundational (Phase 2) depends on Setup and blocks all user story work.
- User Story phases depend on Foundational completion.
- Polish (Phase 5) depends on completion of both user story phases.

### User Story Dependency Graph

- US1 (P1) -> US2 (P2)

US2 builds on the same login endpoint/controller/view paths delivered in US1 and extends them with invalid-path and throttling behavior.

### Within-Story Execution Rules

- For each story, implement tests before production code where feasible.
- Complete model changes before controller integration when introducing state contracts.
- Keep acceptance and integration suites passing for previously completed stories before marking the current story done.

## Parallel Execution Examples

### US1

- Run `T015` and `T016` in parallel (unit vs integration test files).
- Run `T018` and `T019` in parallel (login view vs dashboard view files).

### US2

- Run `T025` and `T026` in parallel (unit vs integration test files).
- Run `T028` and `T032` in parallel (server tracker model vs front-end view rendering).

## Implementation Strategy

### MVP First (US1)

1. Complete Phase 1 and Phase 2.
2. Deliver US1 end-to-end (Phase 3).
3. Demonstrate valid-login acceptance scenario and authenticated session behavior.

### Incremental Delivery

1. Add US2 after US1 is stable.
2. Re-run US1 acceptance/integration tests while implementing US2 to prevent regressions.
3. Finish with polish tasks and final coverage/documentation evidence.
