# Performance Plan: 001-user-login

## Objective

Validate SC-002 constraints for login handling latency under load.

## Scenario

- Endpoint behavior under test: `POST /api/auth/login`
- Workload: 500 valid login requests
- Concurrency: 50 in-flight requests per batch
- Environment: local Node.js 20 runtime, in-memory repository/session state

## Measurement Method

- Run automated profile in `tests/integration/auth-api.performance.test.js`.
- Capture per-request elapsed milliseconds (`Date.now()` around each login call).
- Compute p95 latency and assert p95 <= 500 ms.

## Pass/Fail Criteria

- Pass: p95 <= 500 ms
- Fail: p95 > 500 ms
