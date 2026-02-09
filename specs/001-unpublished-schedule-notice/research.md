# Phase 0 Research: View Final Schedule

## Scope

- Feature: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-unpublished-schedule-notice/spec.md`
- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-15.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-15-AS.md`

## Research Task Dispatch

- Task: "Find best practices for vanilla HTML/CSS/JavaScript MVC in schedule-view domain."
- Task: "Find best practices for `Intl.DateTimeFormat` dual time-zone rendering in browser clients."
- Task: "Research integration patterns for public schedule access with optional authenticated personalization."
- Task: "Research contract pattern to prevent schedule data exposure when publication status is unpublished."
- Task: "Find best practices for mapping UC-15 acceptance scenarios to automated JS tests with 100% line coverage evidence."

No unresolved `NEEDS CLARIFICATION` markers remain in technical context after decisions below.

## Decisions

### 1. MVC module boundaries

- Decision: Keep strict MVC split with `/src/models`, `/src/views`, and `/src/controllers`; isolate network calls in `/src/services`.
- Rationale: Enforces constitution principle III and keeps UI rendering concerns separate from publication/time-zone business rules.
- Alternatives considered: Put fetch and formatting directly in view scripts (rejected because it mixes controller/model behavior and makes coverage tracing harder).

### 2. Dual time-zone display strategy

- Decision: Store canonical timestamps as UTC in model state and derive conference/local display strings using `Intl.DateTimeFormat`; local time zone comes from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- Rationale: Ensures deterministic storage while satisfying FR-008 device/browser local-time behavior.
- Alternatives considered: Have API pre-render both time strings (rejected because server cannot reliably infer browser time zone for anonymous viewers without explicit client input).

### 3. Publication-state data exposure rule

- Decision: API response shape is status-driven; unpublished response includes notice metadata and omits session entries entirely.
- Rationale: Meets FR-004/FR-005 and eliminates accidental unpublished leakage in view rendering.
- Alternatives considered: Send sessions plus an `unpublished` flag and hide client-side (rejected because hidden data is still exposed in network payload).

### 4. Public access with optional personalization

- Decision: Use one public `GET /api/final-schedule` endpoint with optional authenticated session context; response includes `viewerContext` and per-session `isCurrentAuthorSession`.
- Rationale: Satisfies FR-001/FR-006 while avoiding separate public and authenticated routes for the same page.
- Alternatives considered: Split endpoints for anonymous and author variants (rejected due to duplicate response schemas and higher integration complexity).

### 5. Test and coverage strategy

- Decision: Implement acceptance tests for UC-15 in `/tests/acceptance` and model/controller/view unit tests in `/tests/unit` using `vitest` + `jsdom`, with coverage captured via `c8`.
- Rationale: Supports browser-like behavior assertions and constitution-required 100% line coverage evidence for in-scope JavaScript.
- Alternatives considered: Manual acceptance verification only (rejected because it cannot provide repeatable coverage metrics); full browser E2E only (rejected for higher overhead on a small isolated feature).
