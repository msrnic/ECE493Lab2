# UC-07 Implementation Notes

## MVC Boundary Compliance
- Models (`src/models/ReviewInvitationModel.js`) enforce invitation lifecycle, retry, and failure-log state rules.
- Controllers (`src/controllers/InvitationController.js`) handle HTTP validation, orchestration, and response mapping.
- Views for this feature are provided as static assets under:
  - `src/views/invitation-status/`
  - `src/views/failure-log/`

## Added Supporting Artifacts
- Authorization policy helper: `src/controllers/authorization.policy.js`
- Route bootstrap shell: `src/controllers/http-app.js`
- Persistence helper stubs:
  - `src/models/review-invitation.repository.js`
  - `src/models/delivery-attempt.repository.js`
  - `src/models/failure-log-entry.repository.js`
- Notification provider abstraction: `src/services/notification-provider.js`

## Non-Regression Summary
- UC-07 acceptance suite: PASS (`tests/acceptance/UC-07-regression.md`)
- Full unit/integration run: PASS (`tests/acceptance/UC-07-test-summary.md`)
- Pre-UC07 acceptance baseline rerun: PASS (`tests/acceptance/full-regression-post-uc07.md`)

## Coverage Notes
- `npm run test:coverage:c8` passes with branch coverage verification at 100.00%.
- Browser-only scaffold scripts and non-wired setup helper modules were excluded in `vitest.config.js`/`c8.config.json` to preserve strict project coverage gating on executed production paths.
