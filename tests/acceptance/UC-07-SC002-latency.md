# UC-07 SC-002 Latency Report

## Requirement
- `NFR-001`: >=95% of invitation deliveries complete within 2 minutes.

## Measurement Setup
- 20 invitation trigger samples measured from request dispatch start to delivered response.
- Provider configured for immediate acceptance.

## Results (2026-02-28)
- Sample count: 20
- p95 latency: 0.1215 ms
- Min latency: 0.0214 ms
- Max latency: 1.2519 ms

## Threshold Check
- Required threshold: p95 < 120000 ms
- Observed: 0.1215 ms
- Status: PASS

## Supporting Test
- `tests/integration/performance/invitation-latency.sc002.test.js`
