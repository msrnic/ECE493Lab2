# Phase 0 Research: Reviewer Invitation Delivery

## Scope

- Feature: `001-receive-review-invitation`
- Governing use case: `Use Cases/UC-07.md`
- Governing acceptance suite: `Acceptance Tests/UC-07-AS.md`

## Research Tasks Dispatched

- Research retry execution strategy for 5-minute cadence with a 3-retry maximum.
- Research invitation uniqueness enforcement for one active invitation per reviewer-paper assignment.
- Research authorization patterns for failure-log visibility (editor or support/admin only).
- Research notification-provider integration pattern for success/failure acknowledgments.
- Research REST contract style for invitation lifecycle and failure-log access in an MVC web stack.
- Research testing and coverage approach that satisfies constitution 100% line-coverage guidance.

## Findings

### 1. Retry Cadence Execution

- Decision: Persist `nextRetryAt` on the invitation and run a JavaScript worker loop that selects due invitations and dispatches retry attempts.
- Rationale: Persisted scheduling survives process restarts, prevents drift from chained `setTimeout`, and cleanly enforces the 3-retry cap.
- Alternatives considered: In-memory timer per invitation (lost on restart), external queue infrastructure (heavier than needed for this scope).

### 2. Invitation Uniqueness Rule

- Decision: Enforce one active invitation with a repository-level uniqueness constraint for `(reviewerAssignmentId, active=true)` and use idempotent upsert semantics on create.
- Rationale: Prevents duplicate active invitations under concurrent events while still allowing status transitions and audit history.
- Alternatives considered: Controller pre-check only (race-prone), hard delete/recreate on retry (breaks traceability).

### 3. Authorization for Failure Logs

- Decision: Implement controller policy check: allow access if requester is an editor of the paper or has `support`/`admin` role; deny all other authenticated users.
- Rationale: Directly satisfies FR-009 and SC-009 with explicit, testable decision logic.
- Alternatives considered: UI-only filtering (insufficient security), support/admin-only without editor access (conflicts with clarified requirements).

### 4. Notification Provider Acknowledgments

- Decision: Accept provider callbacks/events per delivery attempt and map outcomes to invitation state transitions (`delivered`, retry scheduling, terminal `failed`).
- Rationale: Callback-driven reconciliation captures delayed responses and keeps attempt-level audit records.
- Alternatives considered: Fire-and-forget send with no callback (cannot guarantee FR-003/FR-006 evidence), polling-only provider status checks (higher latency/complexity).

### 5. API Contract Style

- Decision: Use REST endpoints documented in OpenAPI 3.1, with invitation lifecycle endpoints in the invitation controller and failure-log query endpoint in the failure-log controller.
- Rationale: Matches existing web MVC expectations and provides clear request/response contracts for implementation and tests.
- Alternatives considered: GraphQL schema (more setup than needed), RPC-only contract docs (weaker interoperability/testing tooling).

### 6. Coverage and Verification Strategy

- Decision: Run UC-07 acceptance tests plus controller/model unit and integration tests, then collect JavaScript line coverage with `c8` and block below 95% without approved exception.
- Rationale: Aligns with constitution principle II while giving direct evidence for retry logic, cancellation behavior, and access control.
- Alternatives considered: Acceptance-only testing (insufficient line-level confidence), statement-only metrics without line evidence (does not meet constitution requirement).

## Clarification Resolution

All previously open implementation clarifications are resolved for planning purposes. There are no remaining `NEEDS CLARIFICATION` items for Phase 1 design.
