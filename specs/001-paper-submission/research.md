# Phase 0 Research: Author Paper Submission

## Scope and Inputs

- Feature: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/spec.md`
- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-04.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-04-AS.md`
- Constitution: `/home/m_srnic/ece493/lab2/ECE493Lab2/lab2/.specify/memory/constitution.md`

## Research Tasks Dispatched

- Research MVC-compliant web implementation choices for UC-04 in HTML/CSS/JavaScript.
- Research best practices for retryable multipart file upload in browser-driven submission flows.
- Research server-side duplicate finalization prevention within a single user action sequence.
- Research pattern for session-scoped preservation of metadata and valid files across retries.
- Research malware/security scan enforcement before final submission status change.
- Research coverage tooling and CI gates to enforce constitution coverage rules.

## Decisions

### 1) MVC and Stack Selection

- Decision: Use HTML for structure, CSS for styling, and JavaScript for behavior, with strict MVC
  separation (`src/models`, `src/views`, `src/controllers`).
- Rationale: Constitution Principle III and user input mandate this stack and architecture.
- Alternatives considered: Component framework with integrated view/controller logic; rejected
  because it weakens explicit MVC boundaries required by project rules.

### 2) API Style

- Decision: Define REST endpoints for submission lifecycle (`create`, `upload`, `validate`,
  `submit`, `status`) under `/api/v1/submissions`.
- Rationale: UC-04 steps and FR-001..FR-014 map cleanly to resource/state transitions.
- Alternatives considered: GraphQL mutation-only API; rejected because explicit endpoint semantics
  are simpler for acceptance traceability and failure-mode testing.

### 3) Upload and Retry Pattern

- Decision: Use multipart upload endpoint with unlimited retries while session is active; preserve
  valid uploaded files and metadata between retries.
- Rationale: Directly satisfies FR-006, FR-012, and FR-014.
- Alternatives considered: Single all-in-one submit request with full re-upload on every retry;
  rejected due to poor UX and conflict with preservation requirements.

### 4) Duplicate Submission Control

- Decision: Enforce one finalized submission per `actionSequenceId` and idempotency key on submit.
- Rationale: Prevents rapid duplicate finalization in the same action sequence (FR-009) while
  allowing later intentional new sequences.
- Alternatives considered: Global duplicate title+author detection; rejected because it blocks
  legitimate later submissions and exceeds requirement scope.

### 5) Malware/Security Scanning

- Decision: Submission finalization requires all uploaded files in `scan_passed` state; scan
  failures return actionable rejection and do not transition to submitted.
- Rationale: Required by FR-013 and edge-case expectations.
- Alternatives considered: Asynchronous post-submit scanning; rejected because it could mark
  submission complete before scan pass.

### 6) Save Failure Recovery

- Decision: On persistence failure after validation/upload, keep submission in `save_failed`,
  preserve session data, and allow immediate retry.
- Rationale: Explicitly required by FR-011 and clarifications.
- Alternatives considered: Clear form and restart on save failure; rejected because it violates
  preserved-data requirement.

### 7) Validation Ownership

- Decision: Models own metadata/file rule validation and state transition guards; controllers only
  orchestrate request flow and map responses.
- Rationale: Keeps MVC separation strict and testable, and centralizes domain rules.
- Alternatives considered: Validation logic embedded in controllers/views; rejected due to
  cross-layer coupling.

### 8) Coverage and Regression Gate

- Decision: Enforce 100% line coverage target for in-scope project-owned JavaScript, floor 95%
  blocked without exception; run UC-04-AS and regression acceptance suites before merge.
- Rationale: Constitution Principles II and V require acceptance conformance, coverage evidence,
  and regression safety.
- Alternatives considered: 80% global threshold; rejected because it fails constitutional minimum.

## Resolved Clarifications

All technical-context clarifications are resolved. No `NEEDS CLARIFICATION` items remain for Phase
1 design.
