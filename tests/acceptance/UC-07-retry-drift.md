# UC-07 Retry Drift Report

## Requirement
- `NFR-002`: retry execution starts within 15 seconds of scheduled retry time.

## Measurement Setup
- Triggered invitation in failing state.
- Executed retry worker on scheduled timestamps and compared next scheduled timestamp to expected `+5 minutes` cadence.

## Results (2026-02-28)
- Drift samples (ms): 0, 0
- Max drift (ms): 0

## Threshold Check
- Required threshold: <=15000 ms
- Observed: 0 ms
- Status: PASS

## Supporting Test
- `tests/integration/retry-scheduler-drift.nfr.test.js`
