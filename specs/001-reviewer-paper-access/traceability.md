# UC-08 Traceability Matrix

## Requirement to Implementation Mapping

| Requirement | Code Paths | Test Coverage |
|---|---|---|
| FR-001 Authenticated reviewer-only paper-file access | `src/app.js` (`requireReviewerSession`), `src/controllers/paper-file-request.controller.js` | `tests/integration/reviewer-paper-access.integration.test.js`, `tests/acceptance/uc-08-as.test.js`, `tests/unit/controllers/paper-file-request.controller.test.js` |
| FR-002 Assigned paper selection and file display | `src/controllers/reviewer-paper-access.controller.js`, `src/views/reviewer-paper-access.view.js`, `src/services/paper-access-api.service.js` | `tests/acceptance/uc-08-as.test.js`, `tests/unit/controllers/reviewer-paper-access.controller.test.js`, `tests/unit/views/reviewer-paper-access.view.test.js` |
| FR-003 Per-request entitlement validation | `src/models/reviewer-access-entitlement.model.js`, `src/services/paper-access-api.service.js` | `tests/unit/models/reviewer-access-entitlement.model.test.js`, `tests/unit/services/paper-access-api.service.test.js` |
| FR-004 Revoked access denied for new requests | `src/services/paper-access-api.service.js`, `src/controllers/paper-file-request.controller.js` | `tests/acceptance/uc-08-as.test.js`, `tests/integration/reviewer-paper-access.integration.test.js` |
| FR-005 Clear denied messaging | `src/views/access-denied.view.js`, `src/views/reviewer-paper-access.view.js` | `tests/unit/views/access-denied.view.test.js`, `tests/unit/views/reviewer-paper-access.view.test.js` |
| FR-006 Access outcome logging | `src/models/paper-access-attempt.model.js`, `src/services/paper-access-api.service.js` | `tests/unit/models/paper-access-attempt.model.test.js`, `tests/unit/services/paper-access-api.service.test.js` |
| FR-007 Coverage evidence and enforcement | `vitest.config.js`, `scripts/assert-branch-coverage.mjs`, `tests/acceptance/coverage-uc-08.md` | `npm test` coverage gate (100/100/100/100) |
| FR-008 Editor/support/admin access-record visibility restriction | `src/controllers/access-records.controller.js`, `src/services/paper-access-api.service.js`, `src/views/access-records.view.js`, `src/app.js` (`/api/papers/:paperId/access-attempts`) | `tests/acceptance/uc-08-as.test.js`, `tests/integration/reviewer-paper-access.integration.test.js`, `tests/unit/controllers/access-records.controller.test.js`, `tests/unit/views/access-records.view.test.js` |
| FR-009 Temporary-unavailable outcome + immediate retry path | `src/models/outage-retry-window.model.js`, `src/controllers/outage-retry.controller.js`, `src/services/paper-access-api.service.js`, `src/views/temporary-unavailable.view.js` | `tests/acceptance/uc-08-as.test.js`, `tests/unit/models/outage-retry-window.model.test.js`, `tests/unit/controllers/outage-retry.controller.test.js`, `tests/unit/views/temporary-unavailable.view.test.js` |
| FR-010 Preserve already displayed content and deny subsequent requests after revocation | `src/services/paper-access-api.service.js`, `src/views/reviewer-paper-access.view.js` | `tests/acceptance/uc-08-as.test.js`, `tests/integration/reviewer-paper-access.integration.test.js` |
| FR-011 Throttle repeated temporary-outage retries to 1 per 5 seconds | `src/models/outage-retry-window.model.js`, `src/services/paper-access-api.service.js` | `tests/acceptance/uc-08-as.test.js`, `tests/unit/models/outage-retry-window.model.test.js`, `tests/unit/services/paper-access-api.service.test.js` |
| FR-012 Expired/invalid session handling for file and access-record requests | `src/app.js` auth middleware, `src/controllers/paper-file-request.controller.js`, `src/controllers/access-records.controller.js` | `tests/acceptance/uc-08-as.test.js`, `tests/integration/reviewer-paper-access.integration.test.js`, `tests/unit/controllers/paper-file-request.controller.test.js`, `tests/unit/controllers/access-records.controller.test.js` |

## Performance Mapping

| Success Criterion | Implementation | Evidence |
|---|---|---|
| SC-002 p95 selection-to-render <= 3 seconds | `src/controllers/reviewer-paper-access.controller.js` (`markSelectionStarted`, `markSelectionRendered`, `getSelectionLatencySummary`) | `tests/acceptance/uc-08-performance.test.js`, `tests/acceptance/uc-08-performance.md` |
