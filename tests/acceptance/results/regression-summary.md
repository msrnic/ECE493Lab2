# Regression Summary

- Date: 2026-02-28
- Feature scope: `001-assign-reviewers` (editor-only assignment and editor-only dashboard entry)

## Commands

- `npx vitest run tests/unit/config/persistence-paths.test.js tests/unit/repositories/auth-repository.test.js tests/unit/models/reviewer-model.test.js tests/unit/user-account-model.test.js tests/unit/controllers/reviewer-assignment-controller.test.js tests/unit/views/login-and-dashboard-view.test.js tests/unit/app.test.js tests/integration/assign-reviewers-api.integration.test.js tests/acceptance/uc06-assign-reviewers.acceptance.test.js tests/acceptance/uc07-review-invitation.acceptance.test.js`
- `npm run test:coverage:c8`
- `npm run lint`

## Outcome

- All listed suites passed.
- No regressions observed in `UC-06-AS` and `UC-07-AS`.
- Dashboard now exposes `Assign reviewers` only for `editor` role.
- Public landing page no longer advertises reviewer assignment.
- Full project test suite passed during coverage run.
