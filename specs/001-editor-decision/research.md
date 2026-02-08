# Phase 0 Research: Editor Decision Recording

**Feature**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision/spec.md`  
**Use Case**: `UC-11`  
**Acceptance Suite**: `UC-11-AS`  
**Date**: 2026-02-08

## Research Tasks Covered

- Research MVC implementation boundaries for HTML/CSS/JavaScript decision workflows.
- Research API patterns to support evaluation loading plus decision saves.
- Research concurrency/immutability strategy for conflicting final saves.
- Research authorization and audit logging patterns for decision actions.
- Research testing and coverage strategy for UC-11 constitution compliance.

## Decisions

### 1. MVC Boundary for the Decision Workflow

Decision: Keep business rules in JavaScript model modules, keep rendering in view modules (HTML/CSS bindings only), and keep orchestration/API interaction in controller modules.

Rationale: This satisfies Constitution Principle III and supports isolated unit tests for rule-heavy logic (immutability, allowed outcomes, preconditions).

Alternatives considered:
- Single script mixing DOM and business rules: rejected because it breaks MVC separation and reduces testability.
- Server-rendered-only flow with minimal JS: rejected because retry/error/defer interaction paths require explicit client-side behavior control.

### 2. Contract Pattern for UC-11 User Actions

Decision: Use REST endpoints `GET /api/papers/{paperId}/decision-workflow` and `POST /api/papers/{paperId}/decisions` with JSON payloads and response envelopes.

Rationale: The endpoints map directly to the UC-11 steps (review evaluations, select decision, save decision) and keep frontend integration simple for plain JavaScript clients.

Alternatives considered:
- GraphQL queries/mutations: rejected to avoid introducing new infrastructure for one workflow.
- Separate write endpoints for defer/final: rejected because a single typed save endpoint centralizes validation and audit behavior.

### 3. Concurrency and Final-Decision Immutability

Decision: Enforce first-write-wins on final decisions using an `expectedVersion` precondition (or equivalent ETag check) and reject late conflicting writes with HTTP 409 plus override workflow guidance.

Rationale: This directly implements FR-009/FR-010 and avoids ambiguity when two editors submit conflicting final outcomes.

Alternatives considered:
- Last-write-wins updates: rejected because it violates immutability.
- Global lock around all saves: rejected because it adds unnecessary operational complexity for this scope.

### 4. Authorization and Audit Integration

Decision: Validate that the acting editor is assigned to the paper or paper track before write execution; persist audit entries for all successful and denied attempts with editor, paper, action, outcome, and timestamp.

Rationale: This satisfies FR-011/FR-013 and provides compliance evidence for both allowed and denied attempts.

Alternatives considered:
- Client-only authorization checks: rejected because authorization must be enforced server-side.
- Logging only successful actions: rejected because denied action logging is mandatory.

### 5. Acceptance and Coverage Strategy

Decision: Implement `UC-11-AS` assertions verbatim in acceptance tests, add targeted unit/integration tests for model/controller edge cases, and require JavaScript line coverage evidence targeting 100%.

Rationale: Constitution Principle II requires acceptance suites as the definition of done plus strong line-coverage evidence.

Alternatives considered:
- Acceptance-only tests: rejected because edge cases (immutability conflicts, retries, denied writes) need direct unit/integration coverage.
- Coverage sampling without line metrics: rejected because line-level evidence is required.

## Clarification Resolution Status

- Remaining `NEEDS CLARIFICATION` items: None.
