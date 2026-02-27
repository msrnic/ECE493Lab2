# Performance Report: 001-user-login

## Run Metadata

- Date: 2026-02-27
- Scenario: 500 login requests at 50 concurrency
- Runtime: local Node.js 20, in-memory app/test harness execution

## Measured Results

- Total requests: 500
- Concurrency: 50
- p95 latency: 2 ms
- Max latency: 3 ms
- Average latency: 0.46 ms

## Verdict

- SC-002 threshold (`p95 <= 500 ms`) passed.
- Automated enforcement also passes in `tests/integration/auth-api.performance.test.js`.
