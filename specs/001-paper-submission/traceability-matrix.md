# UC-04 Traceability Matrix

| Requirement | Implementation | Verification |
|---|---|---|
| FR-001 | `src/app.js`, `src/middleware/session-auth.js` | `tests/unit/controllers/session-auth.test.js`, `tests/unit/controllers/submission-contract.test.js` |
| FR-002 | `src/models/submission-model.js`, `src/models/file-model.js` | `tests/unit/models/submission-model.test.js`, `tests/unit/models/file-model.test.js` |
| FR-003 | `src/controllers/submission-controller.js` (`/validate`) | `tests/unit/controllers/submission-controller.test.js`, `tests/integration/paper-submission.integration.test.js` |
| FR-004 | `src/controllers/submission-controller.js` (`/submit`) | `tests/integration/paper-submission.integration.test.js`, `tests/acceptance/uc-04-submission.acceptance.test.js` |
| FR-005 | `src/models/submission-model.js` outcome/message mapping | `tests/unit/models/submission-model.test.js` |
| FR-006 | `src/controllers/upload-controller.js` retry response | `tests/unit/controllers/upload-controller.test.js`, `tests/acceptance/uc-04-submission.acceptance.test.js` |
| FR-007 | `src/controllers/submission-controller.js` 422 blocking | `tests/unit/controllers/submission-controller.test.js`, `tests/integration/paper-submission.integration.test.js` |
| FR-008 | `src/models/file-model.js` policy checks | `tests/unit/models/file-model.test.js`, `tests/unit/controllers/upload-controller.test.js` |
| FR-009 | `src/models/deduplication-model.js`, `src/controllers/submission-controller.js` | `tests/unit/models/deduplication-model.test.js`, `tests/unit/controllers/submission-controller.test.js` |
| FR-010 | `vitest.config.js` thresholds, evidence docs | `tests/coverage/uc-04-coverage.md`, `tests/coverage/final-coverage-summary.md` |
| FR-011 | `src/controllers/submission-controller.js` save-failed 503 flow | `tests/unit/controllers/submission-controller.test.js` |
| FR-012 | `src/controllers/upload-controller.js` retry-required without retry cap | `tests/unit/controllers/upload-controller.test.js`, `tests/integration/paper-submission.integration.test.js` |
| FR-013 | `src/services/scan-service.js`, `src/models/file-model.js` | `tests/unit/services/scan-service.test.js`, `tests/unit/models/file-model.test.js` |
| FR-014 | `src/models/session-state-model.js`, `src/repositories/session-state-repository.js` | `tests/unit/models/session-state-model.test.js`, `tests/unit/repositories/session-state-repository.test.js` |
| FR-015 | `src/middleware/session-auth.js` + route wiring in `src/app.js` | `tests/unit/controllers/session-auth.test.js`, `tests/unit/controllers/submission-contract.test.js` |
