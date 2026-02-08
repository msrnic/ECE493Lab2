# Phase 0 Research: Reviewer Assignment Workflow

## Decision 1: Use vanilla JavaScript MVC modules for production behavior
- Decision: Implement UI behavior using HTML views, CSS styling, and JavaScript ES modules split into `src/models`, `src/views`, and `src/controllers`.
- Rationale: Satisfies constitution Principle III directly, keeps boundaries explicit, and avoids framework overhead for the scoped UC-06/UC-07 workflow.
- Alternatives considered: Single-file script (rejected: violates MVC separation); frontend framework (rejected: unnecessary complexity for this lab feature).

## Decision 2: Validate reviewer availability and COI twice (selection and confirmation)
- Decision: Perform availability/COI checks when reviewers are selected and re-check at confirmation time before assignment commit.
- Rationale: Meets FR-002, FR-010, and FR-011 while preventing stale assignment decisions when reviewer state changes mid-workflow.
- Alternatives considered: Check only at selection time (rejected: stale data risk); check only at confirmation time (rejected: poor editor feedback loop).

## Decision 3: Concurrency uses optimistic locking with first-confirmation-wins
- Decision: Include `basePaperVersion` on confirm; server accepts first successful confirmation, increments paper assignment version, and returns `409 Conflict` for stale confirmations.
- Rationale: Directly implements FR-012 and supports parallel editor attempts without global locks.
- Alternatives considered: Pessimistic lock during assignment attempt (rejected: harms collaboration and can deadlock abandoned sessions); last-write-wins (rejected: violates FR-012).

## Decision 4: Invitation retries run on fixed 5-minute cadence with hard cap of 3 retries
- Decision: Track invitation state with retry metadata (`retryCount`, `nextRetryAt`, `lastError`), retry every 5 minutes up to 3 retries, then mark terminal failure and set follow-up required.
- Rationale: Implements FR-007 and FR-013 exactly while preserving active reviewer assignment status.
- Alternatives considered: Exponential backoff (rejected: conflicts with fixed interval requirement); cancel reviewer assignment on terminal failure (rejected: violates FR-013).

## Decision 5: API contract is REST + JSON for editor and notification workflows
- Decision: Define resource-oriented endpoints for paper selection, reviewer candidate retrieval, assignment attempts, replacement actions, confirmation, outcomes, and invitation dispatch/retry status.
- Rationale: Clear mapping from user actions to endpoints, simple contract verification, and straightforward controller integration.
- Alternatives considered: GraphQL-only contract (rejected: higher setup complexity and less explicit command semantics for confirm/retry actions).

## Decision 6: Acceptance-plus-unit test strategy with line-coverage enforcement
- Decision: Implement acceptance tests mapped to `UC-06-AS` and `UC-07-AS`, add model/controller unit tests, and enforce 100% line coverage target for project-owned in-scope JavaScript with documented exception process if needed.
- Rationale: Satisfies constitution Principle II and V, and directly supports SC-001/SC-005/SC-006.
- Alternatives considered: Acceptance-only tests (rejected: lower defect localization); manual-only verification (rejected: no auditable coverage evidence).

## Clarification Status

All technical-context clarifications are resolved; no `NEEDS CLARIFICATION` items remain.
