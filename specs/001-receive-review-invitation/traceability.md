# UC-07 Traceability Matrix

| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| FR-001 Invitation trigger on assignment | `src/controllers/InvitationController.js` (`triggerByAssignment`), `src/models/ReviewInvitationModel.js` (`triggerInvitationDelivery`) | `tests/integration/invitation-lifecycle.us1.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| FR-002 Delivery status lifecycle | `src/models/ReviewInvitationModel.js` state transitions | `tests/unit/models/review-invitation-model.test.js`, `tests/integration/invitation-lifecycle.us1.test.js` |
| FR-003 Initial delivery failure detection | `src/models/ReviewInvitationModel.js` (`executeSend`, failure handling) | `tests/integration/invitation-retry.us2.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| FR-004 Automatic retry every 5 minutes, max 3 | `src/controllers/InvitationController.js` (`retryDue`), `src/models/ReviewInvitationModel.js` (`processDueRetries`) | `tests/integration/invitation-retry.us2.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| FR-005 Stop retries on success | `src/models/ReviewInvitationModel.js` delivered transition handling | `tests/integration/invitation-retry.us2.test.js` |
| FR-006 Audit initial + retry outcomes | `src/models/ReviewInvitationModel.js` failure-log tracking | `tests/integration/failure-log.us3.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| FR-007 Manual follow-up flag on terminal failure | `src/models/ReviewInvitationModel.js` (`setFailed`) | `tests/integration/invitation-retry.us2.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| FR-008 Coverage and evidence generation | `vitest.config.js`, `c8.config.json`, acceptance evidence under `tests/acceptance/UC-07-*` | `tests/acceptance/UC-07-coverage.txt`, `tests/acceptance/UC-07-test-summary.md` |
| FR-009 RBAC for failure logs | `src/controllers/authorization.policy.js`, `src/controllers/InvitationController.js` | `tests/unit/controllers/failure-log.authorization.test.js`, `tests/integration/failure-log.us3.test.js` |
| FR-010 Cancel retries on assignment removal | `src/controllers/InvitationController.js` (`cancelByAssignment`), `src/models/ReviewInvitationModel.js` (`cancelInvitationByAssignment`) | `tests/integration/invitation-retry.us2.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| FR-011 Single active invitation per assignment | `src/models/ReviewInvitationModel.js` active invitation reuse logic | `tests/integration/invitation-lifecycle.us1.test.js`, `tests/acceptance/uc07-review-invitation.acceptance.test.js` |
| NFR-001 Latency threshold | `tests/integration/performance/invitation-latency.sc002.test.js` | `tests/acceptance/UC-07-SC002-latency.md` |
| NFR-002 Retry scheduler drift threshold | `tests/integration/retry-scheduler-drift.nfr.test.js` | `tests/acceptance/UC-07-retry-drift.md` |
