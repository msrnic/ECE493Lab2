# Traceability: 001-user-login

## Requirement to Implementation Mapping

| Requirement | Implementation Modules | Verification Tests |
|---|---|---|
| FR-001 Login entry point | `src/app.js`, `src/views/login-view.js`, `src/assets/css/login.css` | `tests/unit/app.test.js`, `tests/unit/views/login-and-dashboard-view.test.js` |
| FR-002 Email/password submission | `src/views/login-view.js`, `src/controllers/login-controller.js`, `src/models/credential-submission-model.js` | `tests/unit/controllers/login-controller.test.js`, `tests/unit/models/credential-submission-model.test.js` |
| FR-003 Credential validation against accounts | `src/controllers/auth-controller.js`, `src/models/user-account-model.js` | `tests/integration/auth-api.integration.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |
| FR-004 Successful authentication and dashboard access | `src/controllers/auth-controller.js`, `src/routes/auth-routes.js`, `src/app.js`, `src/views/dashboard-view.js` | `tests/integration/auth-api.integration.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |
| FR-005 Generic invalid credentials message | `src/controllers/auth-controller.js`, `src/views/login-view.js`, `src/controllers/login-controller.js` | `tests/integration/auth-api.integration.test.js`, `tests/unit/views/login-and-dashboard-view.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |
| FR-006 Logged-out state after invalid attempts | `src/controllers/auth-controller.js`, `src/controllers/session-controller.js` | `tests/integration/auth-api.integration.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |
| FR-007 100% coverage evidence | `vitest.config.js`, `coverage/lcov.info` | `npm test` coverage report |
| FR-008 5-failure lockout for 10 minutes | `src/models/failed-login-tracker-model.js`, `src/controllers/auth-controller.js` | `tests/unit/models/failed-login-tracker-model.test.js`, `tests/integration/auth-api.integration.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |
| FR-009 No additional auth factor | `src/controllers/auth-controller.js` response contract | `tests/integration/auth-api.integration.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |
| FR-010 Reset failed counter after success | `src/models/failed-login-tracker-model.js`, `src/controllers/auth-controller.js` | `tests/integration/auth-api.integration.test.js`, `tests/acceptance/uc-02-login.acceptance.test.js` |

## Use Case Alignment

- Use case: `Use Cases/UC-02.md`
- Acceptance suite: `Acceptance Tests/UC-02-AS.md`
- All UC-02-AS scenarios are represented in `tests/acceptance/uc-02-login.acceptance.test.js`.
