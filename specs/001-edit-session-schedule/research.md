# Phase 0 Research: Edit Conference Schedule

## Context

Feature: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/spec.md`  
Use case baseline: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-14.md`  
Acceptance baseline: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-14-AS.md`

All technical clarifications identified in `plan.md` are resolved below.

## Research Outcomes

### 1) Save-time conflict detection strategy

- Decision: Run conflict detection on the server against the latest persisted schedule snapshot at save time, checking time-slot overlap, room collision, and any existing conflict records linked to edited sessions.
- Rationale: This directly satisfies `FR-004` and `FR-005`, avoids stale client-side assumptions, and ensures warning payloads are based on authoritative state.
- Alternatives considered:
  - Client-side-only detection: rejected because it cannot guarantee correctness under concurrent edits.
  - Deferred asynchronous conflict checks after save: rejected because it would allow silent persistence of unresolved conflicts.

### 2) Concurrency handling for stale saves

- Decision: Use optimistic concurrency with an `expectedVersion` value on every save request; return `412 Precondition Failed` when the current schedule version differs.
- Rationale: This cleanly handles concurrent updates while supporting `FR-007` behavior where unsaved edits remain available client-side for reapplication.
- Alternatives considered:
  - Pessimistic locking: rejected due to poor editor experience and lock contention.
  - Last-write-wins: rejected because it can overwrite peer edits and violate stale-state safeguards.

### 3) Override save authorization and audit trail

- Decision: Require authenticated `Editor` role for override, require non-empty `reason`, and persist an override audit entry containing actor ID, timestamp, reason, schedule ID, version saved, and affected conflict IDs.
- Rationale: This implements `FR-009` and `FR-011` exactly and provides compliance evidence for intentional conflict retention.
- Alternatives considered:
  - Optional reason field: rejected because the spec mandates required reason capture.
  - Logging only to application logs: rejected because durable, queryable audit records are required.

### 4) Publish/finalization guard behavior

- Decision: Enforce a server-side guard on publish/finalization attempts; if unresolved conflicts exist, return `409 Conflict` with blocking guidance.
- Rationale: Guarantees `FR-010` regardless of client behavior and keeps publish policy centralized.
- Alternatives considered:
  - UI-only publish disablement: rejected because it can be bypassed through direct API calls.
  - Auto-resolve conflicts at publish: rejected because it changes schedule semantics without explicit editor action.

### 5) HTML/CSS/JavaScript + MVC structure

- Decision: Use semantic HTML for schedule edit forms and warning dialogs, CSS for layout/state styling, and JavaScript modules with strict MVC separation:
  - Models: schedule state, conflict calculations, override payload assembly
  - Views: schedule editor rendering, warning modal rendering, publish-block messaging
  - Controllers: edit flow orchestration, save/override workflow, publish guard workflow
- Rationale: Satisfies constitution Principle III and the explicit user instruction to keep HTML/CSS/JavaScript responsibilities separated under MVC.
- Alternatives considered:
  - Component framework with mixed templating/runtime logic: rejected to keep strict MVC separation and reduce cross-layer coupling.
  - Inline script/style in HTML templates: rejected because it blurs layer boundaries.

### 6) Testing and coverage approach

- Decision: Validate against `UC-14-AS` scenarios with contract tests for save/override/publish endpoints and model/controller unit tests. Enforce c8 line coverage reports targeting 100% for in-scope JavaScript.
- Rationale: Aligns with constitution Principle II and keeps acceptance suites as the source of done.
- Alternatives considered:
  - Unit tests without acceptance mapping: rejected due to missing constitution-mandated traceability.
  - Coverage target below 100% by default: rejected because policy requires 100% target and documented exceptions otherwise.

## Final Clarification Status

- Outstanding clarification items: **0**
- Gate impact: **No unresolved clarifications remain; Phase 1 design can proceed.**
