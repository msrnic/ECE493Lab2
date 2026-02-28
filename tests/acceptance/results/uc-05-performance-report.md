# UC-05 Performance Report (NFR-001 / NFR-002)

Date: 2026-02-28
Method: Scripted request-receipt to response-commit timing, 250 successful requests per operation.

## Results (p95)

- Save (metadata-only): 0.043 ms (target <= 2000 ms)
- Save (with file descriptors): 0.030 ms (target <= 5000 ms)
- Load latest draft: 0.037 ms (target <= 1000 ms)
- List versions: 0.101 ms (target <= 1000 ms)
- Restore version: 0.014 ms (target <= 1000 ms)

## Verdict

PASS for all measured targets.
