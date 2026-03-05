
> ece493-lab2-cms-registration@1.0.0 test
> vitest run --coverage


 RUN  v3.2.4 /home/m_srnic/ece493/lab2/ECE493Lab2
      Coverage enabled with v8

 ✓ tests/unit/views/submit-paper-view.test.js (4 tests) 154ms
 ✓ tests/unit/registration-form.test.js (8 tests) 270ms
 ✓ tests/unit/controllers/login-controller.test.js (4 tests) 196ms
 ✓ tests/unit/controllers/editor-schedule-conflicts-ui.test.js (4 tests) 262ms
 ✓ tests/unit/views/final-schedule-view.test.js (4 tests) 210ms
 ✓ tests/acceptance/uc-15-final-schedule.acceptance.test.js (3 tests) 239ms
 ✓ tests/unit/controllers/final-schedule-controller.test.js (4 tests) 269ms
 ✓ tests/unit/assets/draft-page.bootstrap.test.js (7 tests) 502ms
 ✓ tests/unit/assets/submit-paper-page.test.js (10 tests) 668ms
 ✓ tests/unit/controllers/admin-schedule-generation-ui.test.js (6 tests) 1171ms
   ✓ admin schedule generation UI > pollRun handles non-ok, failed, and timeout branches  779ms
 ✓ tests/unit/views/password-change-view.test.js (4 tests) 100ms
 ✓ tests/unit/assets/final-schedule-page-bootstrap.test.js (3 tests) 177ms
 ✓ tests/unit/assets/login-app-bootstrap.test.js (2 tests) 117ms
 ✓ tests/unit/controllers/password-change-controller.test.js (6 tests) 182ms
 ✓ tests/unit/assets/password-change-app-bootstrap.test.js (2 tests) 133ms
 ✓ tests/unit/assets/home-page.bootstrap.test.js (2 tests) 176ms
 ✓ tests/unit/assets/decision-workflow-page.test.js (8 tests) 1035ms
 ✓ tests/integration/api/schedule-runs.us1.test.js (7 tests) 713ms
   ✓ US1 integration: schedule run lifecycle > creates runs, returns run status, and exposes schedule details  338ms
 ✓ tests/integration/review-api-performance.test.js (1 test) 947ms
   ✓ integration: review-api performance > keeps p95 latency <= 5000ms under 500 requests with 70/30 authorized-unavailable mix  942ms
 ✓ tests/acceptance/uc-05-draft-save.acceptance.test.js (8 tests) 973ms
   ✓ UC-05-AS draft save scenarios (1-6) > Scenario 1b: Save-draft action succeeds when submit-paper page uses default fetch  512ms
 ✓ tests/acceptance/uc-05-draft-history.acceptance.test.js (6 tests) 979ms
   ✓ UC-05-AS draft history scenarios (7-11) > Scenario 8b: Restore action hydrates submit-paper form fields with selected version data  565ms
 ✓ tests/acceptance/uc07-review-invitation.acceptance.test.js (9 tests) 528ms
 ✓ tests/acceptance/uc13.acceptance.test.js (7 tests) 602ms
 ✓ tests/integration/auth-api.integration.test.js (10 tests) 513ms
 ✓ tests/unit/assets/review-form-page.test.js (5 tests) 622ms
 ✓ tests/unit/assets/assign-reviewers-page.bootstrap.test.js (6 tests) 624ms
 ✓ tests/acceptance/uc-02-login.acceptance.test.js (8 tests) 385ms
 ✓ tests/integration/draft-restore.form.integration.test.js (1 test) 658ms
   ✓ integration: submit-paper restore hydrates form fields > saves versioned metadata and hydrates restored values after pressing Restore  645ms
 ✓ tests/integration/api/schedule-failures.us3.test.js (4 tests) 415ms
 ✓ tests/unit/views/review-form-view.test.js (5 tests) 434ms
 ✓ tests/unit/assets/editor-reviews-page.test.js (3 tests) 419ms
   ✓ editor-reviews-page bootstrap > returns enhanced false when required dependencies are missing  304ms
 ✓ tests/integration/assign-reviewers-api.integration.test.js (5 tests) 402ms
 ✓ tests/acceptance/uc-08-as.test.js (7 tests) 405ms
 ✓ tests/integration/draft-page-client.fetch-context.integration.test.js (1 test) 385ms
   ✓ draft page + draft api client integration > saves a draft using default global fetch without illegal invocation  382ms
 ✓ tests/unit/views/editor-decision-view.test.js (4 tests) 453ms
 ✓ tests/acceptance/uc03-change-password.acceptance.test.js (6 tests) 510ms
 ✓ tests/unit/app.test.js (5 tests) 459ms
 ✓ tests/unit/controllers/draft-controller.stale-conflict.test.js (7 tests) 426ms
 ✓ tests/unit/views/assign-reviewers-view.test.js (3 tests) 454ms
   ✓ AssignReviewersView > renders papers, reviewers, selection and bind/unbind flow  401ms
 ✓ tests/integration/api/schedule-edit.integration.test.js (2 tests) 441ms
   ✓ UC14 integration: schedule edit APIs > loads schedule state, saves non-conflicting edits, and enforces stale/version checks  345ms
 ✓ tests/integration/auth-api.performance.test.js (1 test) 415ms
   ✓ performance: auth api > meets p95 <= 500ms for 500 login requests at 50 concurrency  409ms
 ✓ tests/unit/views/assignment-outcome-view.test.js (2 tests) 368ms
   ✓ AssignmentOutcomeView > renders invitation statuses and warning state for follow-up  306ms
 ✓ tests/acceptance/uc-09-submit-review.acceptance.test.js (4 tests) 361ms
 ✓ tests/integration/review-submission-api.integration.test.js (5 tests) 411ms
 ✓ tests/unit/controllers/draft-controller.save-success.test.js (3 tests) 341ms
 ✓ tests/acceptance/uc06-assign-reviewers.acceptance.test.js (5 tests) 495ms
   ✓ UC-06-AS Assign Reviewers acceptance > Given submitted paper, when reviewers selected, then reviewers are assigned and notified  313ms
 ✓ tests/integration/paper-submission.integration.test.js (5 tests) 528ms
 ✓ tests/unit/assets/reviewer-paper-access-page.test.js (2 tests) 418ms
   ✓ reviewer-paper-access-page bootstrap > returns enhanced false when required DOM nodes are missing  302ms
 ✓ tests/acceptance/uc-11-as.test.js (4 tests) 404ms
 ✓ tests/acceptance/uc14-edit-session-schedule.acceptance.test.js (2 tests) 349ms
 ✓ tests/integration/notification-delivery.integration.test.js (4 tests) 296ms
 ✓ tests/integration/reviewer-paper-access.integration.test.js (3 tests) 305ms
 ✓ tests/integration/api/schedule-edge-cases.polish.test.js (2 tests) 341ms
 ✓ tests/integration/invitation-retry.us2.test.js (3 tests) 232ms
 ✓ tests/acceptance/uc-04-submission.acceptance.test.js (4 tests) 288ms
 ✓ tests/integration/api/schedule-conflicts.us2.test.js (2 tests) 292ms
 ✓ tests/integration/api/view-routes.test.js (1 test) 256ms
 ✓ tests/integration/final-schedule.integration.test.js (3 tests) 256ms
 ✓ tests/integration/review-api-controller.test.js (1 test) 199ms
 ✓ tests/unit/views/view-state-renderer.test.js (1 test) 248ms
 ✓ tests/integration/performance/sc011-rejection-latency.perf.test.js (1 test) 249ms
 ✓ tests/unit/controllers/draft-version-controller.test.js (4 tests) 255ms
 ✓ tests/integration/reviewer-invitation-inbox.integration.test.js (2 tests) 228ms
 ✓ tests/integration/password-change-rejection.integration.test.js (2 tests) 227ms
 ✓ tests/acceptance/uc-04-performance.test.js (1 test) 185ms
 ✓ tests/integration/decision-api.test.js (2 tests) 236ms
 ✓ tests/acceptance/uc-01-registration.acceptance.test.js (7 tests) 193ms
 ✓ tests/unit/controllers/submission-contract.test.js (2 tests) 246ms
 ✓ tests/integration/draft-api.session.integration.test.js (2 tests) 240ms
 ✓ tests/acceptance/uc-10-view-reviews.acceptance.test.js (2 tests) 292ms
 ✓ tests/integration/invitation-lifecycle.us1.test.js (2 tests) 269ms
 ✓ tests/integration/draft-api.save-error.integration.test.js (2 tests) 283ms
 ✓ tests/acceptance/uc12-failure-log.acceptance.test.js (1 test) 203ms
 ✓ tests/acceptance/uc12-delivery.acceptance.test.js (2 tests) 237ms
 ✓ tests/integration/password-change-success.integration.test.js (1 test) 200ms
 ✓ tests/integration/contracts/reviewer-invitation.openapi.test.js (1 test) 201ms
 ✓ tests/integration/api/schedule-auth.us1.test.js (1 test) 203ms
 ✓ tests/integration/retry-scheduler-drift.nfr.test.js (1 test) 183ms
 ✓ tests/unit/controllers/draft-integration-regression.test.js (1 test) 240ms
 ✓ tests/unit/models/schedule-edit-service.test.js (18 tests) 155ms
 ✓ tests/unit/models/review-submission-model.test.js (7 tests) 182ms
 ✓ tests/acceptance/uc12-retry.acceptance.test.js (1 test) 221ms
 ✓ tests/integration/register-page.contract.test.js (2 tests) 226ms
 ✓ tests/integration/performance/invitation-latency.sc002.test.js (1 test) 199ms
 ✓ tests/unit/services/storage-service.test.js (4 tests) 58ms
 ✓ tests/integration/notification-performance.integration.test.js (1 test) 217ms
 ✓ tests/unit/token-and-validation-models.test.js (6 tests) 34ms
 ✓ tests/unit/models/final-schedule-model.test.js (5 tests) 91ms
 ✓ tests/integration/failure-log.us3.test.js (1 test) 195ms
 ✓ tests/unit/controllers/upload-controller.test.js (4 tests) 59ms
 ✓ tests/unit/controllers/draft-page-and-views.test.js (7 tests) 110ms
 ✓ tests/unit/services/paper-access-api.service.test.js (5 tests) 52ms
 ✓ tests/unit/models/generation-run-model.test.js (5 tests) 63ms
 ✓ tests/unit/models/review-invitation.contract.test.js (11 tests) 86ms
 ✓ tests/unit/notification-workflow.unit.test.js (12 tests) 106ms
 ✓ tests/unit/repositories/auth-repository.test.js (3 tests) 48ms
 ✓ tests/unit/models/session-assignment-model.test.js (3 tests) 65ms
 ✓ tests/unit/models/api-client.test.js (4 tests) 64ms
 ✓ tests/integration/performance/sc002-schedule-generation.perf.test.js (1 test) 79ms
 ✓ tests/unit/controllers/draft-api-client.test.js (7 tests) 50ms
 ✓ tests/unit/models/viewer-context-model.test.js (4 tests) 16ms
 ✓ tests/unit/controllers/submission-controller.test.js (5 tests) 58ms
 ✓ tests/unit/models/review-invitation-model.test.js (8 tests) 43ms
 ✓ tests/unit/review-model.test.js (4 tests) 27ms
 ✓ tests/unit/password-change-model.test.js (8 tests) 65ms
 ✓ tests/unit/services/schedule-generation-engine.test.js (4 tests) 39ms
 ✓ tests/unit/controllers/editor-decision-controller.test.js (9 tests) 52ms
 ✓ tests/unit/models/conflict-flag-model.test.js (3 tests) 24ms
 ✓ tests/unit/controllers/invitation-controller.contract.test.js (7 tests) 44ms
 ✓ tests/unit/registration-controller.test.js (6 tests) 37ms
 ✓ tests/unit/controllers/final-schedule-server-controller.test.js (5 tests) 33ms
 ✓ tests/unit/email-delivery-service.test.js (5 tests) 28ms
 ✓ tests/unit/review-api-controller.test.js (6 tests) 41ms
 ✓ tests/unit/models/draft-version-model.test.js (6 tests) 31ms
 ✓ tests/unit/controllers/reviewer-paper-access.controller.test.js (3 tests) 27ms
 ✓ tests/unit/models/reviewer-assignment-model.test.js (7 tests) 40ms
 ✓ tests/unit/controllers/schedule-edit-controller.test.js (3 tests) 22ms
 ✓ tests/unit/models/review-record-model.test.js (6 tests) 29ms
 ✓ tests/integration/create-registration.contract.test.js (4 tests) 36ms
 ✓ tests/unit/models/draft-file-reference-model.test.js (4 tests) 24ms
 ✓ tests/unit/models/schedule-generation.us1.test.js (1 test) 26ms
 ✓ tests/unit/registration-attempt-model.test.js (5 tests) 22ms
 ✓ tests/unit/controllers/auth-controller.test.js (6 tests) 36ms
 ✓ tests/unit/models/generated-schedule-model.test.js (3 tests) 35ms
 ✓ tests/unit/review-access-audit-model.test.js (5 tests) 39ms
 ✓ tests/unit/repositories/submission-repository.test.js (3 tests) 53ms
 ✓ tests/unit/controllers/reviewer-assignment-controller.test.js (3 tests) 34ms
 ✓ tests/integration/registration-latency.test.js (2 tests) 31ms
 ✓ tests/unit/editor-assignment-model.test.js (3 tests) 24ms
 ✓ tests/unit/controllers/session-controller.test.js (3 tests) 30ms
 ✓ tests/unit/controllers/authorize-role.test.js (2 tests) 19ms
 ✓ tests/integration/confirm-registration.contract.test.js (6 tests) 28ms
 ✓ tests/unit/models/submission-model.test.js (5 tests) 25ms
 ✓ tests/unit/controllers/status-controller.test.js (3 tests) 36ms
 ✓ tests/unit/models/decision-model.test.js (5 tests) 32ms
 ✓ tests/unit/repositories/session-state-repository.test.js (2 tests) 33ms
 ✓ tests/unit/repositories/file-repository.test.js (2 tests) 32ms
 ✓ tests/unit/models/decision-audit-model.test.js (3 tests) 24ms
 ✓ tests/unit/controllers/paper-file-request.controller.test.js (2 tests) 28ms
 ✓ tests/unit/api/review-submission-routes.test.js (3 tests) 22ms
 ✓ tests/unit/services/final-schedule-api.test.js (3 tests) 26ms
 ✓ tests/unit/controllers/http-responses.test.js (2 tests) 27ms
 ✓ tests/unit/models/security-adapters.test.js (5 tests) 41ms
 ✓ tests/unit/models/schedule-repository.test.js (2 tests) 26ms
 ✓ tests/unit/review-page-controller.test.js (5 tests) 22ms
 ✓ tests/unit/controllers/review-submission-controller.test.js (6 tests) 32ms
 ✓ tests/unit/models/reviewer-access-entitlement.model.test.js (3 tests) 22ms
 ✓ tests/unit/models/password-change-api-client.test.js (3 tests) 26ms
 ✓ tests/unit/models/draft-save-attempt-model.test.js (3 tests) 18ms
 ✓ tests/unit/repository.test.js (7 tests) 28ms
 ✓ tests/unit/models/attempt-throttle-model.test.js (3 tests) 14ms
 ✓ tests/unit/models/reviewer-paper-assignment-model.test.js (4 tests) 27ms
 ✓ tests/unit/controllers/outage-retry.controller.test.js (1 test) 20ms
 ✓ tests/unit/models/assignment-validation.test.js (3 tests) 18ms
 ✓ tests/unit/config/persistence-paths.test.js (3 tests) 14ms
 ✓ tests/unit/models/model-validation.test.js (3 tests) 23ms
 ✓ tests/unit/models/draft-submission-model.test.js (5 tests) 48ms
 ✓ tests/unit/models/file-model.test.js (4 tests) 52ms
 ✓ tests/unit/models/paper-access-attempt.model.test.js (3 tests) 58ms
 ✓ tests/unit/user-account-model.test.js (5 tests) 49ms
 ✓ tests/unit/models/reviewer-model.test.js (4 tests) 28ms
 ✓ tests/unit/models/conflict-flag.us2.test.js (1 test) 21ms
 ✓ tests/unit/models/validation-feedback-model.test.js (4 tests) 20ms
 ✓ tests/unit/models/draft-version-retention.test.js (3 tests) 21ms
 ✓ tests/unit/controllers/invitation-controller.test.js (4 tests) 28ms
 ✓ tests/unit/models/paper-file-bundle.model.test.js (2 tests) 23ms
 ✓ tests/unit/models/deduplication-model.test.js (3 tests) 25ms
 ✓ tests/unit/views/temporary-unavailable.view.test.js (1 test) 12ms
 ✓ tests/unit/models/outage-retry-window.model.test.js (3 tests) 20ms
 ✓ tests/unit/models/paper-submission-model.test.js (3 tests) 22ms
 ✓ tests/unit/repositories/json-file-store.test.js (2 tests) 19ms
 ✓ tests/unit/models/auth-session-model.test.js (4 tests) 18ms
 ✓ tests/unit/models/schedule-schemas.test.js (2 tests) 19ms
 ✓ tests/unit/controllers/access-records.controller.test.js (2 tests) 23ms
 ✓ tests/unit/models/failed-login-tracker-model.test.js (4 tests) 17ms
 ✓ tests/unit/views/login-and-dashboard-view.test.js (4 tests) 17ms
 ✓ tests/unit/registration-view-and-page-controller.test.js (3 tests) 12ms
 ✓ tests/unit/models/submission-config.test.js (1 test) 14ms
 ✓ tests/unit/paper-model.test.js (2 tests) 17ms
 ✓ tests/unit/email-delivery-job-model.test.js (5 tests) 17ms
 ✓ tests/unit/models/session-state-model.test.js (2 tests) 15ms
 ✓ tests/unit/models/password-policy-model.test.js (4 tests) 12ms
 ✓ tests/unit/controllers/failure-log.authorization.test.js (6 tests) 13ms
 ✓ tests/unit/models/draft-version-access-policy.test.js (2 tests) 18ms
 ✓ tests/unit/controllers/session-auth.test.js (3 tests) 32ms
 ✓ tests/unit/services/scan-service.test.js (2 tests) 26ms
 ✓ tests/unit/controllers/role-controller.test.js (3 tests) 14ms
 ✓ tests/unit/views/access-records.view.test.js (1 test) 24ms
 ✓ tests/unit/services/generation-precondition-service.test.js (6 tests) 15ms
 ✓ tests/unit/models/final-schedule-mock-data.test.js (2 tests) 15ms
 ✓ tests/unit/views/reviewer-paper-access.view.test.js (2 tests) 13ms
 ✓ tests/unit/controllers/app-controller.test.js (1 test) 9ms
 ✓ tests/unit/controllers/draft-error-mapper.test.js (3 tests) 12ms
 ✓ tests/unit/views/access-denied.view.test.js (1 test) 9ms
 ✓ tests/unit/models/credential-submission-model.test.js (4 tests) 14ms
 ✓ tests/acceptance/uc-08-performance.test.js (1 test) 9ms
 ✓ tests/unit/models/generation-failures.us3.test.js (1 test) 9ms

 Test Files  197 passed (197)
      Tests  751 passed (751)
   Start at  17:11:55
   Duration  32.53s (transform 5.63s, setup 0ms, collect 104.57s, tests 34.70s, environment 30.01s, prepare 56.47s)

 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |     100 |      100 |     100 |     100 |                   
 src               |     100 |      100 |     100 |     100 |                   
  app.js           |     100 |      100 |     100 |     100 |                   
 src/api           |     100 |      100 |     100 |     100 |                   
  ...ion-routes.js |     100 |      100 |     100 |     100 |                   
 src/assets/js     |     100 |      100 |     100 |     100 |                   
  ...generation.js |     100 |      100 |     100 |     100 |                   
  app.js           |     100 |      100 |     100 |     100 |                   
  ...ewers-page.js |     100 |      100 |     100 |     100 |                   
  ...kflow-page.js |     100 |      100 |     100 |     100 |                   
  draft-page.js    |     100 |      100 |     100 |     100 |                   
  ...or-reviews.js |     100 |      100 |     100 |     100 |                   
  ...-conflicts.js |     100 |      100 |     100 |     100 |                   
  ...edule-page.js |     100 |      100 |     100 |     100 |                   
  home-page.js     |     100 |      100 |     100 |     100 |                   
  ...ation-form.js |     100 |      100 |     100 |     100 |                   
  ...-form-page.js |     100 |      100 |     100 |     100 |                   
  ...ccess-page.js |     100 |      100 |     100 |     100 |                   
  ...paper-page.js |     100 |      100 |     100 |     100 |                   
 src/config        |     100 |      100 |     100 |     100 |                   
  ...ence-paths.js |     100 |      100 |     100 |     100 |                   
  ...ion-config.js |     100 |      100 |     100 |     100 |                   
 src/controllers   |     100 |      100 |     100 |     100 |                   
  AppController.js |     100 |      100 |     100 |     100 |                   
  ...Controller.js |     100 |      100 |     100 |     100 |                   
  ...Controller.js |     100 |      100 |     100 |     100 |                   
  ...Controller.js |     100 |      100 |     100 |     100 |                   
  ...Controller.js |     100 |      100 |     100 |     100 |                   
  ...Controller.js |     100 |      100 |     100 |     100 |                   
  ...Controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...ion.policy.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...api-client.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...ror-mapper.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...ry-service.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
  ...controller.js |     100 |      100 |     100 |     100 |                   
 ...ntrollers/http |     100 |      100 |     100 |     100 |                   
  responses.js     |     100 |      100 |     100 |     100 |                   
 ...ers/middleware |     100 |      100 |     100 |     100 |                   
  authorizeRole.js |     100 |      100 |     100 |     100 |                   
 src/middleware    |     100 |      100 |     100 |     100 |                   
  ...-role-auth.js |     100 |      100 |     100 |     100 |                   
  ...rvice-auth.js |     100 |      100 |     100 |     100 |                   
  session-auth.js  |     100 |      100 |     100 |     100 |                   
 src/models        |     100 |      100 |     100 |     100 |                   
  ApiClient.js     |     100 |      100 |     100 |     100 |                   
  ...Validation.js |     100 |      100 |     100 |     100 |                   
  ...tFlagModel.js |     100 |      100 |     100 |     100 |                   
  ...eduleModel.js |     100 |      100 |     100 |     100 |                   
  ...onRunModel.js |     100 |      100 |     100 |     100 |                   
  ...ssionModel.js |     100 |      100 |     100 |     100 |                   
  ...ationModel.js |     100 |      100 |     100 |     100 |                   
  ...nmentModel.js |     100 |      100 |     100 |     100 |                   
  ReviewerModel.js |     100 |      100 |     100 |     100 |                   
  ...nmentModel.js |     100 |      100 |     100 |     100 |                   
  ...ttle-model.js |     100 |      100 |     100 |     100 |                   
  ...-log-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...en-service.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...udit-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...tion-model.js |     100 |      100 |     100 |     100 |                   
  ...tion-model.js |     100 |      100 |     100 |     100 |                   
  ...empt-model.js |     100 |      100 |     100 |     100 |                   
  ...ence-model.js |     100 |      100 |     100 |     100 |                   
  ...ion-policy.js |     100 |      100 |     100 |     100 |                   
  ...empt-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...ess-policy.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...ment-model.js |     100 |      100 |     100 |     100 |                   
  ...oken-model.js |     100 |      100 |     100 |     100 |                   
  ...-job-model.js |     100 |      100 |     100 |     100 |                   
  ...malization.js |     100 |      100 |     100 |     100 |                   
  ...cker-model.js |     100 |      100 |     100 |     100 |                   
  file-model.js    |     100 |      100 |     100 |     100 |                   
  ...-mock-data.js |     100 |      100 |     100 |     100 |                   
  ...dule-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...validation.js |     100 |      100 |     100 |     100 |                   
  ...tion-model.js |     100 |      100 |     100 |     100 |                   
  ...ion-status.js |     100 |      100 |     100 |     100 |                   
  ...ndow.model.js |     100 |      100 |     100 |     100 |                   
  ...empt.model.js |     100 |      100 |     100 |     100 |                   
  ...ndle.model.js |     100 |      100 |     100 |     100 |                   
  paper-model.js   |     100 |      100 |     100 |     100 |                   
  ...api-client.js |     100 |      100 |     100 |     100 |                   
  ...ange-model.js |     100 |      100 |     100 |     100 |                   
  ...licy-model.js |     100 |      100 |     100 |     100 |                   
  ...empt-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...validation.js |     100 |      100 |     100 |     100 |                   
  repository.js    |     100 |      100 |     100 |     100 |                   
  ...udit-model.js |     100 |      100 |     100 |     100 |                   
  review-model.js  |     100 |      100 |     100 |     100 |                   
  ...cord-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...ment.model.js |     100 |      100 |     100 |     100 |                   
  ...ment-model.js |     100 |      100 |     100 |     100 |                   
  session-model.js |     100 |      100 |     100 |     100 |                   
  ...tate-model.js |     100 |      100 |     100 |     100 |                   
  ...sion-model.js |     100 |      100 |     100 |     100 |                   
  ...lure-model.js |     100 |      100 |     100 |     100 |                   
  ...ount-model.js |     100 |      100 |     100 |     100 |                   
  ...back-model.js |     100 |      100 |     100 |     100 |                   
  ...text-model.js |     100 |      100 |     100 |     100 |                   
 ...s/repositories |     100 |      100 |     100 |     100 |                   
  ...Repository.js |     100 |      100 |     100 |     100 |                   
 ...odels/services |     100 |      100 |     100 |     100 |                   
  ...ionService.js |     100 |      100 |     100 |     100 |                   
  ...ditService.js |     100 |      100 |     100 |     100 |                   
  ...tionEngine.js |     100 |      100 |     100 |     100 |                   
 ...els/validation |     100 |      100 |     100 |     100 |                   
  ...uleSchemas.js |     100 |      100 |     100 |     100 |                   
 src/repositories  |     100 |      100 |     100 |     100 |                   
  ...repository.js |     100 |      100 |     100 |     100 |                   
  ...repository.js |     100 |      100 |     100 |     100 |                   
  ...file-store.js |     100 |      100 |     100 |     100 |                   
  ...repository.js |     100 |      100 |     100 |     100 |                   
  ...repository.js |     100 |      100 |     100 |     100 |                   
 src/routes        |     100 |      100 |     100 |     100 |                   
  admin-routes.js  |     100 |      100 |     100 |     100 |                   
  auth-routes.js   |     100 |      100 |     100 |     100 |                   
  ...ion-routes.js |     100 |      100 |     100 |     100 |                   
 src/services      |     100 |      100 |     100 |     100 |                   
  ...ry-service.js |     100 |      100 |     100 |     100 |                   
  ...hedule-api.js |     100 |      100 |     100 |     100 |                   
  ...pi.service.js |     100 |      100 |     100 |     100 |                   
  ...er-service.js |     100 |      100 |     100 |     100 |                   
  scan-service.js  |     100 |      100 |     100 |     100 |                   
  ...ge-service.js |     100 |      100 |     100 |     100 |                   
 src/views         |     100 |      100 |     100 |     100 |                   
  ...iewersView.js |     100 |      100 |     100 |     100 |                   
  ...utcomeView.js |     100 |      100 |     100 |     100 |                   
  ...teRenderer.js |     100 |      100 |     100 |     100 |                   
  ...enied.view.js |     100 |      100 |     100 |     100 |                   
  ...cords.view.js |     100 |      100 |     100 |     100 |                   
  ...board-view.js |     100 |      100 |     100 |     100 |                   
  ...ditor-view.js |     100 |      100 |     100 |     100 |                   
  ...story-view.js |     100 |      100 |     100 |     100 |                   
  ...-ui-shared.js |     100 |      100 |     100 |     100 |                   
  ...ision-view.js |     100 |      100 |     100 |     100 |                   
  ...edule-view.js |     100 |      100 |     100 |     100 |                   
  login-view.js    |     100 |      100 |     100 |     100 |                   
  ...hange-view.js |     100 |      100 |     100 |     100 |                   
  ...tatus-view.js |     100 |      100 |     100 |     100 |                   
  ...ation-view.js |     100 |      100 |     100 |     100 |                   
  ...-form-view.js |     100 |      100 |     100 |     100 |                   
  ...ccess.view.js |     100 |      100 |     100 |     100 |                   
  ...paper-view.js |     100 |      100 |     100 |     100 |                   
  ...lable.view.js |     100 |      100 |     100 |     100 |                   
-------------------|---------|----------|---------|---------|-------------------
---------------------------------------|---------|----------|---------|---------|-------------------
File                                   | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
---------------------------------------|---------|----------|---------|---------|-------------------
All files                              |     100 |      100 |     100 |     100 |                   
 src                                   |     100 |      100 |     100 |     100 |                   
  app.js                               |     100 |      100 |     100 |     100 |                   
 src/api                               |     100 |      100 |     100 |     100 |                   
  review-submission-routes.js          |     100 |      100 |     100 |     100 |                   
 src/assets/js                         |     100 |      100 |     100 |     100 |                   
  admin-schedule-generation.js         |     100 |      100 |     100 |     100 |                   
  app.js                               |     100 |      100 |     100 |     100 |                   
  assign-reviewers-page.js             |     100 |      100 |     100 |     100 |                   
  decision-workflow-page.js            |     100 |      100 |     100 |     100 |                   
  draft-page.js                        |     100 |      100 |     100 |     100 |                   
  editor-reviews.js                    |     100 |      100 |     100 |     100 |                   
  editor-schedule-conflicts.js         |     100 |      100 |     100 |     100 |                   
  final-schedule-page.js               |     100 |      100 |     100 |     100 |                   
  home-page.js                         |     100 |      100 |     100 |     100 |                   
  registration-form.js                 |     100 |      100 |     100 |     100 |                   
  review-form-page.js                  |     100 |      100 |     100 |     100 |                   
  reviewer-paper-access-page.js        |     100 |      100 |     100 |     100 |                   
  submit-paper-page.js                 |     100 |      100 |     100 |     100 |                   
 src/config                            |     100 |      100 |     100 |     100 |                   
  persistence-paths.js                 |     100 |      100 |     100 |     100 |                   
  submission-config.js                 |     100 |      100 |     100 |     100 |                   
 src/controllers                       |     100 |      100 |     100 |     100 |                   
  AppController.js                     |     100 |      100 |     100 |     100 |                   
  InvitationController.js              |     100 |      100 |     100 |     100 |                   
  ReviewerAssignmentController.js      |     100 |      100 |     100 |     100 |                   
  ScheduleEditController.js            |     100 |      100 |     100 |     100 |                   
  ScheduleGenerationController.js      |     100 |      100 |     100 |     100 |                   
  ScheduleReviewController.js          |     100 |      100 |     100 |     100 |                   
  ScheduleRunController.js             |     100 |      100 |     100 |     100 |                   
  access-records.controller.js         |     100 |      100 |     100 |     100 |                   
  admin-failure-log-controller.js      |     100 |      100 |     100 |     100 |                   
  auth-controller.js                   |     100 |      100 |     100 |     100 |                   
  authorization.policy.js              |     100 |      100 |     100 |     100 |                   
  confirmation-controller.js           |     100 |      100 |     100 |     100 |                   
  draft-api-client.js                  |     100 |      100 |     100 |     100 |                   
  draft-controller.js                  |     100 |      100 |     100 |     100 |                   
  draft-error-mapper.js                |     100 |      100 |     100 |     100 |                   
  draft-version-controller.js          |     100 |      100 |     100 |     100 |                   
  editor-decision-controller.js        |     100 |      100 |     100 |     100 |                   
  email-delivery-service.js            |     100 |      100 |     100 |     100 |                   
  final-schedule-controller.js         |     100 |      100 |     100 |     100 |                   
  final-schedule-server-controller.js  |     100 |      100 |     100 |     100 |                   
  http-app.js                          |     100 |      100 |     100 |     100 |                   
  login-controller.js                  |     100 |      100 |     100 |     100 |                   
  notification-controller.js           |     100 |      100 |     100 |     100 |                   
  outage-retry.controller.js           |     100 |      100 |     100 |     100 |                   
  paper-file-request.controller.js     |     100 |      100 |     100 |     100 |                   
  password-change-controller.js        |     100 |      100 |     100 |     100 |                   
  password-change-form-controller.js   |     100 |      100 |     100 |     100 |                   
  registration-controller.js           |     100 |      100 |     100 |     100 |                   
  registration-page-controller.js      |     100 |      100 |     100 |     100 |                   
  review-api-controller.js             |     100 |      100 |     100 |     100 |                   
  review-page-controller.js            |     100 |      100 |     100 |     100 |                   
  review-submission-controller.js      |     100 |      100 |     100 |     100 |                   
  reviewer-paper-access.controller.js  |     100 |      100 |     100 |     100 |                   
  role-controller.js                   |     100 |      100 |     100 |     100 |                   
  session-controller.js                |     100 |      100 |     100 |     100 |                   
  status-controller.js                 |     100 |      100 |     100 |     100 |                   
  submission-controller.js             |     100 |      100 |     100 |     100 |                   
  upload-controller.js                 |     100 |      100 |     100 |     100 |                   
 src/controllers/http                  |     100 |      100 |     100 |     100 |                   
  responses.js                         |     100 |      100 |     100 |     100 |                   
 src/controllers/middleware            |     100 |      100 |     100 |     100 |                   
  authorizeRole.js                     |     100 |      100 |     100 |     100 |                   
 src/middleware                        |     100 |      100 |     100 |     100 |                   
  admin-role-auth.js                   |     100 |      100 |     100 |     100 |                   
  internal-service-auth.js             |     100 |      100 |     100 |     100 |                   
  session-auth.js                      |     100 |      100 |     100 |     100 |                   
 src/models                            |     100 |      100 |     100 |     100 |                   
  ApiClient.js                         |     100 |      100 |     100 |     100 |                   
  AssignmentValidation.js              |     100 |      100 |     100 |     100 |                   
  ConflictFlagModel.js                 |     100 |      100 |     100 |     100 |                   
  GeneratedScheduleModel.js            |     100 |      100 |     100 |     100 |                   
  GenerationRunModel.js                |     100 |      100 |     100 |     100 |                   
  PaperSubmissionModel.js              |     100 |      100 |     100 |     100 |                   
  ReviewInvitationModel.js             |     100 |      100 |     100 |     100 |                   
  ReviewerAssignmentModel.js           |     100 |      100 |     100 |     100 |                   
  ReviewerModel.js                     |     100 |      100 |     100 |     100 |                   
  SessionAssignmentModel.js            |     100 |      100 |     100 |     100 |                   
  attempt-throttle-model.js            |     100 |      100 |     100 |     100 |                   
  audit-log-model.js                   |     100 |      100 |     100 |     100 |                   
  auth-session-model.js                |     100 |      100 |     100 |     100 |                   
  confirmation-token-service.js        |     100 |      100 |     100 |     100 |                   
  credential-submission-model.js       |     100 |      100 |     100 |     100 |                   
  decision-audit-model.js              |     100 |      100 |     100 |     100 |                   
  decision-model.js                    |     100 |      100 |     100 |     100 |                   
  decision-notification-model.js       |     100 |      100 |     100 |     100 |                   
  deduplication-model.js               |     100 |      100 |     100 |     100 |                   
  delivery-attempt-model.js            |     100 |      100 |     100 |     100 |                   
  delivery-attempt.repository.js       |     100 |      100 |     100 |     100 |                   
  draft-file-reference-model.js        |     100 |      100 |     100 |     100 |                   
  draft-retention-policy.js            |     100 |      100 |     100 |     100 |                   
  draft-save-attempt-model.js          |     100 |      100 |     100 |     100 |                   
  draft-submission-model.js            |     100 |      100 |     100 |     100 |                   
  draft-version-access-policy.js       |     100 |      100 |     100 |     100 |                   
  draft-version-model.js               |     100 |      100 |     100 |     100 |                   
  editor-assignment-model.js           |     100 |      100 |     100 |     100 |                   
  email-confirmation-token-model.js    |     100 |      100 |     100 |     100 |                   
  email-delivery-job-model.js          |     100 |      100 |     100 |     100 |                   
  email-normalization.js               |     100 |      100 |     100 |     100 |                   
  failed-login-tracker-model.js        |     100 |      100 |     100 |     100 |                   
  failure-log-entry.repository.js      |     100 |      100 |     100 |     100 |                   
  file-model.js                        |     100 |      100 |     100 |     100 |                   
  final-schedule-mock-data.js          |     100 |      100 |     100 |     100 |                   
  final-schedule-model.js              |     100 |      100 |     100 |     100 |                   
  finalized-decision-model.js          |     100 |      100 |     100 |     100 |                   
  model-validation.js                  |     100 |      100 |     100 |     100 |                   
  notification-model.js                |     100 |      100 |     100 |     100 |                   
  notification-status.js               |     100 |      100 |     100 |     100 |                   
  outage-retry-window.model.js         |     100 |      100 |     100 |     100 |                   
  paper-access-attempt.model.js        |     100 |      100 |     100 |     100 |                   
  paper-file-bundle.model.js           |     100 |      100 |     100 |     100 |                   
  paper-model.js                       |     100 |      100 |     100 |     100 |                   
  password-change-api-client.js        |     100 |      100 |     100 |     100 |                   
  password-change-model.js             |     100 |      100 |     100 |     100 |                   
  password-policy-model.js             |     100 |      100 |     100 |     100 |                   
  registration-attempt-model.js        |     100 |      100 |     100 |     100 |                   
  registration-submission-model.js     |     100 |      100 |     100 |     100 |                   
  registration-validation.js           |     100 |      100 |     100 |     100 |                   
  repository.js                        |     100 |      100 |     100 |     100 |                   
  review-access-audit-model.js         |     100 |      100 |     100 |     100 |                   
  review-invitation.repository.js      |     100 |      100 |     100 |     100 |                   
  review-model.js                      |     100 |      100 |     100 |     100 |                   
  review-record-model.js               |     100 |      100 |     100 |     100 |                   
  review-submission-model.js           |     100 |      100 |     100 |     100 |                   
  reviewer-access-entitlement.model.js |     100 |      100 |     100 |     100 |                   
  reviewer-paper-assignment-model.js   |     100 |      100 |     100 |     100 |                   
  session-model.js                     |     100 |      100 |     100 |     100 |                   
  session-state-model.js               |     100 |      100 |     100 |     100 |                   
  submission-model.js                  |     100 |      100 |     100 |     100 |                   
  unresolved-failure-model.js          |     100 |      100 |     100 |     100 |                   
  user-account-model.js                |     100 |      100 |     100 |     100 |                   
  validation-feedback-model.js         |     100 |      100 |     100 |     100 |                   
  viewer-context-model.js              |     100 |      100 |     100 |     100 |                   
 src/models/repositories               |     100 |      100 |     100 |     100 |                   
  ScheduleRepository.js                |     100 |      100 |     100 |     100 |                   
 src/models/services                   |     100 |      100 |     100 |     100 |                   
  GenerationPreconditionService.js     |     100 |      100 |     100 |     100 |                   
  ScheduleEditService.js               |     100 |      100 |     100 |     100 |                   
  ScheduleGenerationEngine.js          |     100 |      100 |     100 |     100 |                   
 src/models/validation                 |     100 |      100 |     100 |     100 |                   
  scheduleSchemas.js                   |     100 |      100 |     100 |     100 |                   
 src/repositories                      |     100 |      100 |     100 |     100 |                   
  auth-repository.js                   |     100 |      100 |     100 |     100 |                   
  file-repository.js                   |     100 |      100 |     100 |     100 |                   
  json-file-store.js                   |     100 |      100 |     100 |     100 |                   
  session-state-repository.js          |     100 |      100 |     100 |     100 |                   
  submission-repository.js             |     100 |      100 |     100 |     100 |                   
 src/routes                            |     100 |      100 |     100 |     100 |                   
  admin-routes.js                      |     100 |      100 |     100 |     100 |                   
  auth-routes.js                       |     100 |      100 |     100 |     100 |                   
  notification-routes.js               |     100 |      100 |     100 |     100 |                   
 src/services                          |     100 |      100 |     100 |     100 |                   
  email-delivery-service.js            |     100 |      100 |     100 |     100 |                   
  final-schedule-api.js                |     100 |      100 |     100 |     100 |                   
  notification-provider.js             |     100 |      100 |     100 |     100 |                   
  paper-access-api.service.js          |     100 |      100 |     100 |     100 |                   
  retry-scheduler-service.js           |     100 |      100 |     100 |     100 |                   
  scan-service.js                      |     100 |      100 |     100 |     100 |                   
  storage-service.js                   |     100 |      100 |     100 |     100 |                   
 src/views                             |     100 |      100 |     100 |     100 |                   
  AssignReviewersView.js               |     100 |      100 |     100 |     100 |                   
  AssignmentOutcomeView.js             |     100 |      100 |     100 |     100 |                   
  ViewStateRenderer.js                 |     100 |      100 |     100 |     100 |                   
  access-denied.view.js                |     100 |      100 |     100 |     100 |                   
  access-records.view.js               |     100 |      100 |     100 |     100 |                   
  dashboard-view.js                    |     100 |      100 |     100 |     100 |                   
  draft-editor-view.js                 |     100 |      100 |     100 |     100 |                   
  draft-history-view.js                |     100 |      100 |     100 |     100 |                   
  draft-ui-shared.js                   |     100 |      100 |     100 |     100 |                   
  editor-decision-view.js              |     100 |      100 |     100 |     100 |                   
  final-schedule-view.js               |     100 |      100 |     100 |     100 |                   
  login-view.js                        |     100 |      100 |     100 |     100 |                   
  password-change-view.js              |     100 |      100 |     100 |     100 |                   
  registration-status-view.js          |     100 |      100 |     100 |     100 |                   
  registration-view.js                 |     100 |      100 |     100 |     100 |                   
  review-form-view.js                  |     100 |      100 |     100 |     100 |                   
  reviewer-paper-access.view.js        |     100 |      100 |     100 |     100 |                   
  submit-paper-view.js                 |     100 |      100 |     100 |     100 |                   
  temporary-unavailable.view.js        |     100 |      100 |     100 |     100 |                   
 src/views/failure-log                 |     100 |      100 |     100 |     100 |                   
  failure-log.js                       |     100 |      100 |     100 |     100 |                   
 src/views/invitation-status           |     100 |      100 |     100 |     100 |                   
  invitation-status.js                 |     100 |      100 |     100 |     100 |                   
---------------------------------------|---------|----------|---------|---------|-------------------
