# UC-13 Traceability Matrix

| Requirement | Acceptance Scenario | Automated Test Coverage |
|---|---|---|
| FR-001/FR-011 | Admin starts generation and concurrent requests rejected | `tests/acceptance/uc13.acceptance.test.js`, `tests/integration/api/schedule-runs.us1.test.js` |
| FR-002/FR-003/FR-013 | Session assignment and versioned active schedule behavior | `tests/integration/api/schedule-runs.us1.test.js`, `tests/acceptance/uc13.acceptance.test.js` |
| FR-004/FR-005/FR-007/FR-008/FR-010/FR-012 | Conflict detection, deduplication, and editor/admin visibility | `tests/integration/api/schedule-conflicts.us2.test.js`, `tests/unit/models/conflict-flag-model.test.js` |
| FR-006 | Missing prerequisite failure with clear reason and retry | `tests/integration/api/schedule-failures.us3.test.js`, `tests/acceptance/uc13.acceptance.test.js` |
| FR-009 | Acceptance automation and full branch coverage evidence | `tests/acceptance/uc13.acceptance.test.js`, `tests/coverage/uc13-final-coverage.md` |
