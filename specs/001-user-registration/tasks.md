# Tasks: Public User Registration

**Input**: Design documents from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/`  
**Prerequisites**: `plan.md` (required), `spec.md` (required), `research.md`, `data-model.md`, `contracts/openapi.yaml`, `quickstart.md`

**Tests**: Acceptance validation for `UC-01-AS` and coverage evidence are required by the feature spec/plan. Unit and integration tests are included for deterministic validation of registration rules.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently.

## Format: `[ID] [P?] [US?] [UC] [AS] Description`

- `[P]`: Can run in parallel (different files, no dependency on incomplete tasks)
- `[US?]`: User story label (required on story-phase tasks)
- `[UC]`: Governing use case label (required on every task)
- `[AS]`: Governing acceptance suite label (required on every task)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish initial project scaffolding and traceability baseline.

- [ ] T001 [UC-01] [UC-01-AS] Create MVC and test directory scaffolding in `src/models/`, `src/views/`, `src/controllers/`, `src/assets/css/`, `src/assets/js/`, `tests/acceptance/`, `tests/unit/`, and `tests/integration/`
- [ ] T002 [UC-01] [UC-01-AS] Initialize project scripts and dependencies for app/test/lint execution in `package.json`
- [ ] T003 [P] [UC-01] [UC-01-AS] Create HTTP bootstrap and app shell in `src/server.js` and `src/app.js`
- [ ] T004 [P] [UC-01] [UC-01-AS] Create base HTML page and static asset references in `src/index.html`
- [ ] T005 [P] [UC-01] [UC-01-AS] Add JavaScript test and coverage configuration in `vitest.config.js`
- [ ] T006 [UC-01] [UC-01-AS] Add UC-to-acceptance traceability baseline in `specs/001-user-registration/checklists/requirements.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Build core shared components required before user-story implementation.

**CRITICAL**: Complete this phase before starting user-story tasks.

- [ ] T007 [UC-01] [UC-01-AS] Implement shared repository/persistence gateway for registration entities in `src/models/repository.js`
- [ ] T008 [P] [UC-01] [UC-01-AS] Implement registration field and password-policy validators in `src/models/registration-validation.js`
- [ ] T009 [P] [UC-01] [UC-01-AS] Implement normalized-email and duplicate-email lookup helpers in `src/models/email-normalization.js`
- [ ] T010 [UC-01] [UC-01-AS] Implement registration-attempt tracking and 5-per-10-minute throttle logic in `src/models/registration-attempt-model.js`
- [ ] T011 [P] [UC-01] [UC-01-AS] Implement confirmation-token creation/verification helpers in `src/models/confirmation-token-service.js`
- [ ] T012 [P] [UC-01] [UC-01-AS] Implement email delivery adapter with queued-retry backoff logic in `src/controllers/email-delivery-service.js`
- [ ] T013 [UC-01] [UC-01-AS] Configure coverage gates (100% target, block below 95%) in `package.json` and `vitest.config.js`

**Checkpoint**: Foundation complete; user-story implementation can begin.

---

## Phase 3: User Story 1 - Register New Account (Priority: P1) 🎯 MVP

**Goal**: Public users can register with validated input, receive pending-account creation, and confirm via email.

**Mapped Use Case**: `Use Cases/UC-01.md`  
**Mapped Acceptance Suite**: `Acceptance Tests/UC-01-AS.md`

**Independent Test**: Execute `tests/acceptance/uc-01-registration.acceptance.test.js` to validate valid registration success (pending account + confirmation flow), invalid input failure (validation errors + no account creation), duplicate-email handling, throttling behavior, and confirmation activation.

### Tests & Validation (Required)

- [ ] T014 [P] [US1] [UC-01] [UC-01-AS] Translate `Acceptance Tests/UC-01-AS.md` scenarios into executable acceptance checks in `tests/acceptance/uc-01-registration.acceptance.test.js`
- [ ] T015 [P] [US1] [UC-01] [UC-01-AS] Add OpenAPI contract test for `GET /register` from `specs/001-user-registration/contracts/openapi.yaml` in `tests/integration/register-page.contract.test.js`
- [ ] T016 [P] [US1] [UC-01] [UC-01-AS] Add OpenAPI contract test for `POST /api/registrations` response matrix (`201/409/422/429`) in `tests/integration/create-registration.contract.test.js`
- [ ] T017 [P] [US1] [UC-01] [UC-01-AS] Add OpenAPI contract test for `GET /api/registrations/confirm` response matrix (`200/400/410`) in `tests/integration/confirm-registration.contract.test.js`

### Implementation

- [ ] T018 [US1] [UC-01] [UC-01-AS] Implement `UserAccount` model with pending-to-active lifecycle rules in `src/models/user-account-model.js`
- [ ] T019 [US1] [UC-01] [UC-01-AS] Implement `EmailConfirmationToken` model with expiry and consume-once semantics in `src/models/email-confirmation-token-model.js`
- [ ] T020 [P] [US1] [UC-01] [UC-01-AS] Implement `EmailDeliveryJob` retry state transitions in `src/models/email-delivery-job-model.js`
- [ ] T021 [P] [US1] [UC-01] [UC-01-AS] Implement `RegistrationSubmission` parsing and `ValidationError` mapping in `src/models/registration-submission-model.js`
- [ ] T022 [US1] [UC-01] [UC-01-AS] Implement registration-form rendering and field/global error presentation in `src/views/registration-view.js`
- [ ] T023 [P] [US1] [UC-01] [UC-01-AS] Implement registration status view for sent-vs-queued retry outcomes in `src/views/registration-status-view.js`
- [ ] T024 [P] [US1] [UC-01] [UC-01-AS] Implement browser-side validation and submit flow with Fetch API in `src/assets/js/registration-form.js`
- [ ] T025 [US1] [UC-01] [UC-01-AS] Implement `GET /register` route/controller wiring in `src/controllers/registration-page-controller.js` and `src/app.js`
- [ ] T026 [US1] [UC-01] [UC-01-AS] Implement `POST /api/registrations` controller flow (validation, duplicate checks, throttling, pending account creation, email send/retry) in `src/controllers/registration-controller.js`
- [ ] T027 [US1] [UC-01] [UC-01-AS] Implement `GET /api/registrations/confirm` activation flow in `src/controllers/confirmation-controller.js`
- [ ] T028 [US1] [UC-01] [UC-01-AS] Add unit coverage for validation, duplicate-email handling, throttling, retry scheduling, and activation in `tests/unit/registration-controller.test.js`, `tests/unit/user-account-model.test.js`, `tests/unit/registration-attempt-model.test.js`, and `tests/unit/email-delivery-job-model.test.js`
- [ ] T029 [US1] [UC-01] [UC-01-AS] Execute `Acceptance Tests/UC-01-AS.md`, run coverage, and record evidence in `specs/001-user-registration/checklists/registration.md`

**Checkpoint**: US1 is complete and independently verifiable.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening, regression safety, and documentation updates.

- [ ] T030 [P] [UC-01] [UC-01-AS] Update endpoint verification and quickstart examples in `specs/001-user-registration/quickstart.md`
- [ ] T031 [UC-01] [UC-01-AS] Run full regression command (`npm test && npm run lint`) and record results in `specs/001-user-registration/checklists/registration.md`
- [ ] T032 [UC-01] [UC-01-AS] Enforce/document final coverage outcome and uncovered-line remediation notes in `specs/001-user-registration/checklists/requirements.md`
- [ ] T033 [P] [UC-01] [UC-01-AS] Standardize user-facing error wording across registration flows in `src/controllers/registration-controller.js` and `src/views/registration-view.js`
- [ ] T034 [P] [UC-01] [UC-01-AS] Document final MVC boundaries and module ownership in `README.md`
- [ ] T035 [P] [UC-01] [UC-01-AS] Add benchmark coverage for `POST /api/registrations` p95 latency in `tests/integration/registration-latency.test.js`
- [ ] T036 [P] [UC-01] [UC-01-AS] Add client-side validation timing instrumentation and assertions in `src/assets/js/registration-form.js` and `tests/integration/registration-latency.test.js`
- [ ] T037 [UC-01] [UC-01-AS] Define first-time-user usability protocol and sample-size rule in `specs/001-user-registration/quickstart.md`
- [ ] T038 [UC-01] [UC-01-AS] Execute usability verification and record SC-004 evidence in `specs/001-user-registration/checklists/registration.md`
- [ ] T039 [UC-01] [UC-01-AS] Record SC-005 completion-time and NFR latency evidence in `specs/001-user-registration/checklists/registration.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies.
- Foundational (Phase 2): Depends on Setup; blocks all user stories.
- User Story 1 (Phase 3): Depends on Foundational completion.
- Polish (Phase 4): Depends on User Story 1 completion.

### User Story Dependency Graph

- `US1 (P1)` depends on Phase 2 only and has no dependencies on other user stories.

Graph: `Phase1 -> Phase2 -> US1 -> Phase4`

### Within US1

- Run test-definition/contract tasks (`T014`-`T017`) before API/controller completion sign-off.
- Implement model contracts (`T018`-`T021`) before controller orchestration (`T025`-`T027`).
- Complete acceptance + coverage evidence (`T029`) before final sign-off.

### Final Sign-Off

- Complete performance/usability evidence tasks (`T035`-`T039`) before release approval.

## Parallel Execution Examples

### User Story 1

- Run `T014`, `T015`, `T016`, and `T017` in parallel because they target different test files.
- Run `T020`, `T021`, `T023`, and `T024` in parallel after `T018`/`T019` define core state contracts.
- Run `T022` and `T025` in parallel once route signatures and view interfaces are agreed.

### Polish Phase

- Run `T030`, `T033`, `T034`, `T035`, and `T036` in parallel after core feature behavior is stable.

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1 and Phase 2.
2. Deliver Phase 3 (US1) end-to-end.
3. Validate with `UC-01-AS` acceptance evidence and coverage evidence.
4. Demo MVP registration flow.

### Incremental Delivery

1. Stabilize setup/foundation once.
2. Implement one story increment and lock acceptance coverage evidence.
3. Apply Phase 4 for performance/usability verification and regression safety before merge.
