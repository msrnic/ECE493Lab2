# Phase 0 Research: Reviewer Paper Access

**Feature**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/spec.md`  
**Date**: 2026-02-08  
**Scope**: `Use Cases/UC-08.md` + `Acceptance Tests/UC-08-AS.md`

## Research Tasks

1. Research revocation enforcement timing for reviewer file access.
2. Find best practices for temporary outage retry/throttling in JavaScript web apps.
3. Research audit logging patterns for support and compliance visibility.
4. Select an API contract style for reviewer paper access actions.
5. Select test and coverage strategy that satisfies constitution gates.

## Findings

### R1 - Revocation Enforcement

- Decision: Re-check reviewer-paper entitlement in the controller for every file-list and file-download request, with server-authoritative access decisions.
- Rationale: FR-003, FR-004, and FR-010 require immediate denial of new requests after revocation, including when content is already visible.
- Alternatives considered: Client-side cached entitlement checks were rejected because cached state can lag revocation events.

### R2 - Temporary Outage Retry + Throttle

- Decision: Model outage retries per `reviewerId + paperId` using a short-lived throttle window: one immediate retry is allowed, then repeated outage retries are limited to one request every 5 seconds.
- Rationale: Directly satisfies FR-009 and FR-011 while keeping the policy local to the affected reviewer-paper pair.
- Alternatives considered: Global reviewer throttling and static backoff sequences were rejected because they over-throttle unrelated papers or violate immediate retry requirements.

### R3 - Access Outcome Logging

- Decision: Persist append-only `PaperAccessAttempt` records with outcome enum (`granted`, `denied-revoked`, `temporarily-unavailable`, `throttled`) and request context.
- Rationale: FR-006 and FR-008 require traceability and restricted visibility to paper editors and support/admin roles.
- Alternatives considered: Overwriting a latest-status row was rejected because it destroys historical troubleshooting and audit trails.

### R4 - Contract Pattern

- Decision: Use REST + JSON contracts for paper list, paper file access, and access-record retrieval, with clear HTTP status mapping (`200`, `403`, `503`, `429`).
- Rationale: REST endpoints map cleanly to user actions in UC-08 and provide explicit semantics for denied, unavailable, and throttled outcomes.
- Alternatives considered: GraphQL was rejected for this feature scope because it adds extra schema/runtime complexity without improving traceability for acceptance scenarios.

### R5 - Test and Coverage Strategy

- Decision: Implement one acceptance test module that mirrors `UC-08-AS` plus unit tests for models/controllers, and enforce line coverage reporting over all UC-08 JavaScript modules with a 100% target.
- Rationale: Constitution Principle II requires acceptance suites as done criteria and coverage evidence near 100% with formal exception handling below thresholds.
- Alternatives considered: Manual acceptance validation or acceptance-only tests were rejected because they do not provide robust regression safety or sufficient coverage diagnostics.

## Clarification Resolution

- `Language/Version`: resolved to HTML5 + CSS3 + JavaScript ES2022 modules.
- `Primary Dependencies`: resolved to browser-native APIs and JavaScript test/coverage tooling.
- `Storage`: resolved to server-side persistence for entitlement and access logs; client-only transient state.
- `Performance/Failure Behavior`: resolved to SC-002 timing plus FR-009/FR-011 retry and throttle behavior.
- `Contract Style`: resolved to REST OpenAPI.

All planning clarifications are resolved. No `NEEDS CLARIFICATION` markers remain.
