# UC-12 Implementation Notes

## Delivered Scope

- Added internal notification trigger and retry endpoints.
- Added admin unresolved-failure listing/detail endpoints.
- Enforced email-only channel, idempotent dedupe key, and max 2 delivery attempts.
- Persisted unresolved failure records with 1-year retention metadata.
- Added latency instrumentation for finalize-to-attempt1 and fail1-to-retry.

## Assumptions

- `editor` role is treated as admin-equivalent for operational failure visibility.
- Internal endpoints use `X-Internal-Service-Key` when configured.
