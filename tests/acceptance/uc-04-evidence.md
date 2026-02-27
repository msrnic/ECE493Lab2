# UC-04 Acceptance Evidence

## Run Metadata
- Date: 2026-02-27
- Command: `npm run test:acceptance:uc04`
- Result: PASS

## Scenario Evidence
- Given the author is logged in, when required metadata/files are submitted, then submission is stored as `submitted`: PASS (`tests/acceptance/uc-04-submission.acceptance.test.js`)
- Given file upload fails, when submission is attempted, then retry is prompted with `retry_required`: PASS (`tests/acceptance/uc-04-submission.acceptance.test.js`)

## Extended UC-04 Validation Evidence
- Invalid metadata blocks final submit with 422 and no submitted status: PASS (`tests/integration/paper-submission.integration.test.js`)
- Scan failure blocks successful finalization path: PASS (`tests/integration/paper-submission.integration.test.js`)

## SC-005 Decision
- Usability evidence is recorded in `tests/acceptance/uc-04-usability-results.md`.
- Current decision: pending manual usability execution in a human-participant session.
