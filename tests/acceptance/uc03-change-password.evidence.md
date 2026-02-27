# UC-03 Acceptance Evidence

## Run Metadata

- Date: 2026-02-27
- Command: `npm test`
- Suite: `tests/acceptance/uc03-change-password.acceptance.test.js`
- Result: PASS (`6/6` scenarios)

## Covered UC-03-AS Scenarios

- Logged-in user can change password with valid current/new values.
- Incorrect current password rejects change and leaves credentials unchanged.
- Successful change invalidates other sessions while retaining the initiating session.
- Successful change generates a security notification.
- Five incorrect attempts within 10 minutes lead to temporary blocking on subsequent attempts.
- Every success/rejection attempt creates an audit entry.

## Notes

- Acceptance scenarios executed in automated tests against the in-memory app/test harness.
- No failing acceptance assertions were observed in the latest run.
