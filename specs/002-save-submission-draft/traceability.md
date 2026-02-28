# UC-05 Traceability Matrix (Final)

Date: 2026-02-28
Feature: `002-save-submission-draft`

## FR -> Implementation -> Verification

| Requirement | Use Case / Acceptance | Primary Modules | Automated Verification |
|---|---|---|---|
| FR-001 | UC-05 / Scenarios 1, 3 | `src/controllers/draft-controller.js`, `src/assets/js/draft-page.js` | `tests/acceptance/uc-05-draft-save.acceptance.test.js` |
| FR-002 | UC-05 / Scenario 2 | `src/models/draft-version-model.js`, `src/models/draft-file-reference-model.js` | `tests/acceptance/uc-05-draft-save.acceptance.test.js`, `tests/unit/models/draft-file-reference-model.test.js` |
| FR-003 | UC-05 / Scenario 1 | `src/views/draft-editor-view.js`, `src/views/draft-ui-shared.js` | `tests/unit/controllers/draft-page-and-views.test.js` |
| FR-004 | UC-05 / Scenario 4 | `src/controllers/draft-error-mapper.js`, `src/controllers/draft-controller.js` | `tests/integration/draft-api.save-error.integration.test.js`, `tests/acceptance/uc-05-draft-save.acceptance.test.js` |
| FR-005 | UC-05 / Scenarios 4, 5, 6 | `src/models/draft-save-attempt-model.js`, `src/models/draft-submission-model.js` | `tests/unit/models/draft-save-attempt-model.test.js`, `tests/unit/controllers/draft-controller.stale-conflict.test.js` |
| FR-006 | UC-05 / Scenario 7 | `src/controllers/draft-controller.js`, `src/views/draft-editor-view.js` | `tests/acceptance/uc-05-draft-history.acceptance.test.js` |
| FR-007 | UC-05 / All scenarios | `package.json`, `vitest.config.js` | `npm test` coverage report (100% branch/line/function/statement) |
| FR-008 | UC-05 / Scenario 6 | `src/models/draft-submission-model.js`, `src/controllers/draft-controller.js` | `tests/integration/draft-api.save-error.integration.test.js` |
| FR-009 | UC-05 / Scenario 8 | `src/controllers/draft-version-controller.js`, `src/models/draft-version-model.js` | `tests/acceptance/uc-05-draft-history.acceptance.test.js`, `tests/unit/controllers/draft-version-controller.test.js` |
| FR-010 | UC-05 / Scenario 11 | `src/models/draft-retention-policy.js`, `src/controllers/draft-controller.js` | `tests/acceptance/uc-05-draft-history.acceptance.test.js`, `tests/unit/models/draft-version-retention.test.js` |
| FR-011 | UC-05 / Scenarios 9, 10 | `src/models/draft-version-access-policy.js`, `src/controllers/draft-version-controller.js` | `tests/acceptance/uc-05-draft-history.acceptance.test.js`, `tests/unit/models/draft-version-access-policy.test.js` |

## Architecture Boundary Check

- Model-only rules/invariants are implemented under `src/models/`.
- View rendering/formatting is implemented under `src/views/`.
- Request orchestration and error-to-HTTP mapping is implemented under `src/controllers/`.
- Browser-side orchestration exists in `src/assets/js/draft-page.js`.

No MVC boundary violations were identified in the final implementation.
