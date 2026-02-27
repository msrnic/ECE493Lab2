# Phase 0 Research: Author Decision Notifications

## Context

- Feature spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-notification-delivery-retry/spec.md`
- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-12.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-12-AS.md`
- Constitution: `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/memory/constitution.md`

## Unknowns From Technical Context

No `NEEDS CLARIFICATION` items remained after filling technical context. Research focused on dependency and integration best practices required to satisfy FR-001 through FR-013.

## Research Findings

### Notification Orchestration

- Decision: Use an event-driven notification controller that creates one `DecisionNotification` record per finalized decision and author, then dispatches delivery attempts through a service layer.
- Rationale: This aligns with MVC boundaries by keeping workflow logic in controllers/services and state rules in models, while preserving traceability to UC-12 steps.
- Alternatives considered: Synchronous inline email sending inside decision finalization logic (rejected because it couples unrelated workflows and makes retry/error handling brittle).

### Email Delivery Integration

- Decision: Isolate email transport behind a JavaScript adapter (`email-delivery-service.js`) that normalizes provider responses into success/failure outcomes.
- Rationale: Adapter isolation allows consistent handling of delivery failures and simplifies deterministic testing for retry and unresolved-failure scenarios.
- Alternatives considered: Direct SMTP provider calls from controllers (rejected because controller logic would mix transport concerns with flow orchestration).

### Retry + Duplicate Prevention

- Decision: Enforce exactly one retry by tracking `attemptNumber` values (`1` initial, `2` retry) and adding a unique deduplication key on `decisionId + authorId` for delivered notifications.
- Rationale: Explicit attempt state guarantees FR-006 compliance and dedupe keys prevent duplicate author messages in concurrent trigger conditions (FR-008).
- Alternatives considered: Time-window dedupe cache only (rejected because cache eviction can allow duplicate sends and does not provide auditable persistence).

### Unresolved Failure Logging

- Decision: Persist unresolved failures in a dedicated model with required fields (`timestamp`, `submissionId`, `authorId`, `failureReason`, `attemptNumber`, `finalDeliveryStatus`) and compute `retainedUntil = createdAt + 365 days`.
- Rationale: Dedicated records satisfy FR-007/FR-010/FR-013 and support operational follow-up without querying transient delivery-attempt logs.
- Alternatives considered: Logging unresolved failures only to stdout/application logs (rejected because logs do not provide reliable retention guarantees or structured admin access).

### Administrator Access Control

- Decision: Restrict failure-log endpoints and views to administrator role checks in an admin controller/middleware path.
- Rationale: Centralized role enforcement supports FR-012 and keeps access-control behavior testable at controller boundaries.
- Alternatives considered: Client-side role checks only (rejected because authorization must be enforced server-side to be secure).

### Acceptance + Coverage Strategy

- Decision: Validate `UC-12-AS` scenarios via acceptance tests, add integration tests for retry/error paths, and run JavaScript coverage reporting targeting 100% for scoped modules.
- Rationale: This satisfies Constitution Principle II and FR-009 while reducing regression risk for prior passing suites.
- Alternatives considered: Acceptance-only testing without module-level coverage (rejected because uncovered lines can hide retry/deduplication defects).
