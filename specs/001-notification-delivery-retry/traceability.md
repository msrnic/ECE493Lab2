# UC-12 Traceability

## Requirement Mapping

| Requirement | Implementation |
|---|---|
| FR-001 | `src/controllers/notification-controller.js` trigger endpoint |
| FR-002 | `src/models/finalized-decision-model.js`, `src/models/decision-notification-model.js` |
| FR-003 | `src/services/email-delivery-service.js` attempt dispatch |
| FR-004 | Provider message-id enforcement in `src/services/email-delivery-service.js` |
| FR-005 | Failed attempt detection in `src/models/delivery-attempt-model.js` |
| FR-006 | Single retry guard in `src/models/delivery-attempt-model.js` and retry endpoint |
| FR-007 | Unresolved failure persistence in `src/models/unresolved-failure-model.js` |
| FR-008 | Dedupe key enforcement in `src/models/decision-notification-model.js` |
| FR-009 | UC-12 acceptance/unit/integration suites under `tests/` |
| FR-010 | Required unresolved fields in `src/models/unresolved-failure-model.js` |
| FR-011 | Email-only channel in `src/models/decision-notification-model.js` |
| FR-012 | Admin middleware in `src/middleware/admin-role-auth.js` |
| FR-013 | 1-year retention via `retainedUntil` and purge logic |

## Verification Mapping

- Unit: `tests/unit/notification-workflow.unit.test.js`
- Integration: `tests/integration/notification-delivery.integration.test.js`
- Integration (performance): `tests/integration/notification-performance.integration.test.js`
- Acceptance: `tests/acceptance/uc12-delivery.acceptance.test.js`, `tests/acceptance/uc12-retry.acceptance.test.js`, `tests/acceptance/uc12-failure-log.acceptance.test.js`
