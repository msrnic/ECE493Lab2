# Phase 0 Research: Conference Schedule Generation

## Decision 1: Scheduling Strategy and Conflict Detection
- Decision: Use a deterministic two-pass scheduler (assignment pass then validation pass) that always produces a schedule and records every rule violation as a conflict flag.
- Rationale: FR-010 requires schedule output even when violations exist, and deterministic ordering makes acceptance validation and regression tests stable.
- Alternatives considered: Hard-fail on first violation (rejected because FR-010 requires output), non-deterministic optimization-first assignment (rejected due to unstable test outcomes).

## Decision 2: Concurrent Generation Request Handling
- Decision: Enforce a single active generation run using a run-lock in the `GenerationRun` model; reject new `POST /schedule-runs` requests with HTTP 409 and a clear in-progress message.
- Rationale: Directly satisfies FR-011 and prevents duplicate run state updates.
- Alternatives considered: Queue subsequent requests (rejected because requirement explicitly says reject), allow parallel runs (rejected due to race risk and ambiguous active schedule designation).

## Decision 3: Schedule Versioning and Active Version Selection
- Decision: Persist every successful run as a new `GeneratedSchedule` record with monotonic `versionNumber`; atomically mark only the newest successful version as `isActive=true` and archive previous active version.
- Rationale: Satisfies FR-013 and avoids split-brain active schedule state.
- Alternatives considered: Overwrite a single schedule document (rejected because history retention is required), manual activation endpoint only (rejected because successful run must already produce one latest active schedule).

## Decision 4: Conflict Deduplication Rule
- Decision: Deduplicate conflict flags per run using a computed key: `{violationType}:{paperId}:{sessionSlotId}:{ruleId}`.
- Rationale: Meets FR-008 by preventing duplicate records for the same conflict condition while still tracking distinct violations.
- Alternatives considered: Deduplicate by message text only (rejected due to collision risk), no deduplication (rejected by FR-008).

## Decision 5: API Pattern for Generation and Review
- Decision: Expose REST endpoints for run creation/status and schedule/conflict retrieval (`POST /api/schedule-runs`, `GET /api/schedule-runs/{runId}`, `GET /api/schedules`, `GET /api/schedules/{scheduleId}`, `GET /api/schedules/{scheduleId}/conflicts`).
- Rationale: Maps directly to administrator/editor actions in UC-13 scenarios and supports polling for run outcome.
- Alternatives considered: GraphQL-only schema (rejected because acceptance flow maps cleanly to REST resources), synchronous generation response only (rejected due to 2-minute performance window).

## Decision 6: MVC and Stack Compliance
- Decision: Keep production behavior in HTML/CSS/JavaScript with strict MVC layering: models for scheduling state/rules, controllers for request flow and authorization, views for admin/editor rendering.
- Rationale: Required by constitution principle III and user input.
- Alternatives considered: Server-rendered logic mixed in controllers without model boundaries (rejected due to MVC violation), SPA framework introduction (rejected as unnecessary for scoped UC-13 behavior).

## Decision 7: Testing and Coverage Evidence
- Decision: Treat `Acceptance Tests/UC-13-AS.md` as mandatory acceptance baseline, then add unit/integration tests to reach 100% line coverage on in-scope JavaScript modules.
- Rationale: Constitution principle II requires exact acceptance fulfillment and coverage evidence.
- Alternatives considered: Acceptance-only testing (rejected due to coverage mandate), coverage target below 100% without rationale (rejected by constitution gates).

## Clarification Resolution Summary
All technical-context unknowns are resolved in this document:
- Scheduling algorithm behavior under conflicts
- Concurrency policy for active generation runs
- Versioning and active schedule invariants
- Conflict deduplication criteria
- API contract style for role-based actions
- MVC and testing strategy under constitution constraints
