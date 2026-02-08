# Phase 0 Research: Public User Registration

## Scope

- Feature: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`
- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-01.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-01-AS.md`

## Research Tasks Dispatched

- Research validation layering for browser + server registration flow.
- Find best practices for duplicate-email handling and normalized email comparison.
- Find best practices for per-email throttling (5 attempts per 10-minute rolling window).
- Research confirmation-email failure recovery patterns with automatic retries.
- Research confirmation token lifecycle and account activation flow.
- Find best practices for JavaScript coverage strategy targeting 100% line coverage.

## Decisions

### 1) Validation Layering

- Decision: Use dual-layer validation: immediate client-side validation for UX plus authoritative server-side validation for security and correctness.
- Rationale: Client-side checks provide rapid feedback, while server validation prevents bypass and ensures FR-003/FR-006/FR-012 correctness.
- Alternatives considered: Server-only validation (rejected: poor UX and delayed feedback); client-only validation (rejected: insecure and bypassable).

### 2) Duplicate Email Handling

- Decision: Normalize email (`trim`, lowercase) before uniqueness lookup and reject duplicates with explicit `Email already registered` guidance to login/reset flows.
- Rationale: Normalization prevents case/whitespace duplicates and satisfies FR-009 deterministic behavior.
- Alternatives considered: Case-sensitive uniqueness (rejected: user-confusing duplicates); silent generic error (rejected: violates explicit message requirement).

### 3) Throttling Strategy

- Decision: Persist per-email attempt records with timestamped events; enforce rolling-window limit of 5 attempts per normalized email per 10 minutes and return temporary block response.
- Rationale: Persistent tracking works across processes/restarts and enforces FR-010 consistently.
- Alternatives considered: In-memory throttling (rejected: resets on restart and non-deterministic in multi-instance deployments); IP-only throttling (rejected: requirement is per email).

### 4) Confirmation Email Retry Pattern

- Decision: On initial delivery failure, keep account `pending`, create `EmailDeliveryJob` in `queued_retry`, and retry automatically with bounded backoff.
- Rationale: Meets FR-008 by preserving account creation success while making delivery eventual and observable.
- Alternatives considered: Roll back account creation on email failure (rejected: violates FR-008); no retries (rejected: violates automatic retry requirement).

### 5) Account Confirmation Flow

- Decision: Use signed, time-bounded confirmation tokens mapped to pending accounts; successful token verification transitions account state from `pending` to `active`.
- Rationale: Provides explicit FR-011 transition control and safe activation semantics.
- Alternatives considered: Immediate activation on registration (rejected: violates FR-011); perpetual token validity (rejected: weaker security posture).

### 6) Contract and Coverage Approach

- Decision: Model backend interactions as REST endpoints (OpenAPI) and implement acceptance + unit tests with enforced line coverage gates at 100% target and hard block below 95%.
- Rationale: REST/OpenAPI is straightforward for browser-to-controller interactions and coverage gates satisfy constitutional principle II and FR-007.
- Alternatives considered: GraphQL schema for this single flow (rejected: extra complexity without feature value); acceptance-only tests (rejected: inadequate isolation for edge-case logic).

## Clarification Resolution Status

- All prior technical unknowns for this feature are resolved in this document.
- No `NEEDS CLARIFICATION` entries remain for Phase 1 design.
