# UC-09 Traceability Baseline

## Requirement Coverage

| Requirement | Module(s) | Primary Tests |
|---|---|---|
| FR-001 | `src/models/reviewer-paper-assignment-model.js`, `src/controllers/review-submission-controller.js` | `tests/integration/review-submission-api.integration.test.js` |
| FR-002 | `src/models/review-submission-model.js` | `tests/unit/models/review-submission-model.test.js` |
| FR-003 | `src/models/review-submission-model.js`, `src/models/validation-feedback-model.js` | `tests/unit/models/review-submission-model.test.js`, `tests/unit/models/validation-feedback-model.test.js` |
| FR-004 | `src/models/validation-feedback-model.js`, `src/controllers/review-submission-controller.js`, `src/views/review-form-view.js` | `tests/unit/controllers/review-submission-controller.test.js`, `tests/unit/views/review-form-view.test.js` |
| FR-005 | `src/models/review-record-model.js`, `src/controllers/review-submission-controller.js` | `tests/integration/review-submission-api.integration.test.js`, `tests/acceptance/uc-09-submit-review.acceptance.test.js` |
| FR-006 | `src/controllers/review-submission-controller.js`, `src/views/review-form-view.js` | `tests/unit/controllers/review-submission-controller.test.js`, `tests/unit/assets/review-form-page.test.js` |
| FR-007 | `src/models/review-record-model.js`, `src/controllers/review-submission-controller.js` | `tests/unit/models/review-record-model.test.js`, `tests/integration/review-submission-api.integration.test.js` |
| FR-008 | `src/controllers/review-submission-controller.js`, `src/models/review-record-model.js` | `tests/integration/review-submission-api.integration.test.js` |
| FR-009 | `src/models/review-record-model.js`, `src/controllers/review-submission-controller.js` | `tests/unit/models/review-record-model.test.js`, `tests/integration/review-submission-api.integration.test.js` |
| NFR-001 | `src/views/review-form-view.js`, `src/assets/js/review-form-page.js` | `tests/unit/views/review-form-view.test.js`, `tests/unit/assets/review-form-page.test.js` |
| NFR-002 | `src/controllers/review-submission-controller.js`, `src/api/review-submission-routes.js` | `tests/integration/review-submission-api.integration.test.js`, `tests/unit/api/review-submission-routes.test.js` |
| NFR-003 | All UC-09 modules under `src/` | `npm run test:coverage:c8` |
