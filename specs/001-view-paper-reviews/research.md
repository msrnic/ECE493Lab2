# Research: Editor Review Visibility (UC-10)

## Scope

- Use case source: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-10.md`
- Acceptance source: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-10-AS.md`
- Constitution constraints: HTML/CSS/JavaScript only, strict MVC separation, full traceability, acceptance suite compliance, and 100% line coverage target for in-scope JavaScript.

## Decisions

### 1. Authorization-safe unavailable response

- Decision: Return identical `404` payload `{ "message": "Paper reviews unavailable" }` for unauthorized or otherwise inaccessible review requests.
- Rationale: Satisfies FR-010 by preventing unauthorized editors from inferring paper existence or review availability while preserving deterministic client behavior.
- Alternatives considered:
  - `403 Forbidden` for unauthorized access: rejected because it reveals authorization state differences.
  - Distinct messages for missing paper vs unauthorized: rejected because it leaks resource existence details.

### 2. Completed review filtering rule

- Decision: Treat `status = "submitted"` as completed and include only submitted reviews in completed-review output.
- Rationale: Matches the spec assumption that completion occurs after formal submission and directly satisfies FR-002/FR-003 and UC-10-AS wording.
- Alternatives considered:
  - Return all review states with labels: rejected because non-completed items would be mixed into completed review output.
  - Infer completion from score/comment presence: rejected because it is ambiguous and not source-of-truth state.

### 3. Pending-state response contract

- Decision: For authorized requests with zero completed reviews, return `200` with `status: "pending"` and an empty `reviews` array.
- Rationale: Explicitly satisfies UC-10 extension `2a/2a1` and FR-004/FR-005 while avoiding ambiguous empty responses.
- Alternatives considered:
  - `204 No Content`: rejected because status communication is required.
  - `404` for no completed reviews: rejected because pending is a valid authorized outcome, not an unavailable resource.

### 4. Audit retention implementation pattern

- Decision: Persist each successful authorized review-view in `review_access_audit(audit_id, editor_id, paper_id, accessed_at)` and enforce retention with a daily purge of records older than 365 days.
- Rationale: Meets FR-009 and FR-011 with straightforward storage/queryability and deterministic compliance behavior.
- Alternatives considered:
  - Indefinite audit retention: rejected due policy mismatch.
  - Application log-only auditing: rejected because retrieval/retention guarantees are weaker.

### 5. MVC-aligned testing and coverage strategy

- Decision: Use acceptance tests for UC-10 outcomes, integration tests for API/controller authorization and response shapes, model unit tests for filtering/audit logic, and c8 coverage gates targeting 100% in-scope line coverage.
- Rationale: Aligns with constitution principles II–V while proving both acceptance behavior and layered boundary correctness.
- Alternatives considered:
  - Manual QA only: rejected due lack of executable acceptance evidence.
  - Unit-only testing: rejected because end-to-end UC outcome verification would be incomplete.

## Clarification Status

All Technical Context clarifications are resolved; no remaining `NEEDS CLARIFICATION` items.
