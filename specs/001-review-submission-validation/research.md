# Phase 0 Research: Review Submission Validation

## Inputs

- Feature spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/spec.md`
- Constitution: `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/memory/constitution.md`
- In-scope use case and acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-09.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-09-AS.md`
- User constraint: HTML for definition, CSS for style, JavaScript for behavior, and MVC architecture

## Clarifications Resolved

- Concurrency enforcement strategy for duplicate submit attempts
- Validation implementation approach for required and whitespace-only checks
- Error contract shape that preserves in-session data while avoiding persistent drafts
- Test strategy to satisfy acceptance criteria and 100% JavaScript line coverage target

## Decisions

### 1. MVC Web Stack Boundary

- Decision: Use HTML templates for structure, CSS files for styling, and JavaScript modules split into `models/`, `views/`, and `controllers/`.
- Rationale: This directly satisfies Constitution Principle III and keeps validation/state rules out of view code.
- Alternatives considered: A single-page script file was rejected because it mixes concerns and weakens traceability to MVC responsibilities.

### 2. Validation Execution Point

- Decision: Centralize required-field and whitespace checks in a JavaScript model validator shared by controller and API layers.
- Rationale: A shared validator guarantees consistent behavior between UI feedback and submit-time server enforcement for FR-002 through FR-004.
- Alternatives considered: View-only validation was rejected because bypassed client checks could still submit invalid payloads.

### 3. Failed Validation Data Handling

- Decision: Preserve entered form values in controller-managed in-memory state for the current browser session only; never write failed payloads to persistent storage.
- Rationale: This satisfies FR-006 and FR-008 simultaneously by retaining usability during correction while preventing draft persistence.
- Alternatives considered: Database draft rows were rejected because they violate FR-008 and broaden out-of-scope behavior.

### 4. Concurrent Submission Conflict Handling

- Decision: Treat completion as a one-time state transition protected by assignment-level uniqueness and atomic write semantics; return conflict for losing concurrent attempts.
- Rationale: Guarantees FR-009 by ensuring exactly one successful completion for each reviewer-paper assignment.
- Alternatives considered: Last-write-wins was rejected because it can overwrite accepted review data and violate submission integrity.

### 5. Contract Style for User Actions

- Decision: Use REST JSON endpoints: one status endpoint for current completion state and one submit endpoint for completion attempt.
- Rationale: REST keeps the contract explicit and aligns directly with UC-09 actions (submit, then observe completed state).
- Alternatives considered: GraphQL was rejected because this feature requires a small, deterministic command-style API surface.

### 6. Test and Coverage Approach

- Decision: Implement UC-09 acceptance tests, plus model/controller unit tests and API integration tests, with c8 line coverage targeting 100% of in-scope JavaScript.
- Rationale: Matches Constitution Principle II and creates direct verification for validation failures, successful completion, and concurrency conflicts.
- Alternatives considered: Acceptance-only testing was rejected because coverage and edge-case guarantees would be insufficient.

