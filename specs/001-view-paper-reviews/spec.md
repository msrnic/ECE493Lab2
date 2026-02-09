# Feature Specification: Editor Review Visibility

**Feature Branch**: `[001-view-paper-reviews]`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. Editor selects a paper 2. System displays associated reviews Extensions: * **2a**: No reviews submitted * **2a1**: System displays status"

## Clarifications

### Session 2026-02-07

- Q: Who is allowed to view reviews for a selected paper? → A: Only editors assigned to that paper (or its track) can view its reviews.
- Q: Should reviewer identities be shown with each review? → A: Show reviewer identities with each review.
- Q: What access auditing is required for review visibility? → A: Log every successful review-view access with editor, paper, and timestamp.
- Q: What should unauthorized editors see when requesting reviews? → A: Show a generic "Paper reviews unavailable" response.
- Q: How long should review access audit logs be retained? → A: Retain audit logs for 1 year.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-10]
- **Source Use Case Files**: [`Use Cases/UC-10.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-10-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope project-owned JavaScript; below 95% requires approved exception.
- **Traceability Commitment**: Every scenario and requirement below MUST cite UC-10 and UC-10-AS.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Completed Reviews (Priority: P1)

An editor selects a paper and reviews all completed evaluations to support an informed publication decision.

**Mapped Use Case(s)**: [UC-10]
**Mapped Acceptance Suite(s)**: [UC-10-AS]

**Why this priority**: This is the core value of the feature and the primary reason the editor enters this workflow.

**Independent Test**: Can be fully tested by selecting a paper with completed reviews and verifying that all completed reviews are shown in one request.

**Acceptance Scenarios**:

1. **Given** completed reviews exist for a selected paper, **When** the editor requests the paper reviews, **Then** the system displays all completed reviews for that paper.
2. **Given** a selected paper has both completed and in-progress reviews, **When** the editor requests reviews, **Then** completed reviews are displayed and in-progress items are not shown as completed reviews.

---

### User Story 2 - Show Pending Review Status (Priority: P2)

An editor selects a paper with no submitted reviews and immediately sees that reviews are still pending.

**Mapped Use Case(s)**: [UC-10]
**Mapped Acceptance Suite(s)**: [UC-10-AS]

**Why this priority**: Clear pending status prevents confusion and avoids repeated manual checks for missing review data.

**Independent Test**: Can be tested by selecting a paper with no completed reviews and verifying that the workflow returns a pending status instead of blank results.

**Acceptance Scenarios**:

1. **Given** no reviews exist for the selected paper, **When** the editor requests reviews, **Then** the system indicates that reviews are pending.
2. **Given** reviews have not yet been submitted, **When** the editor opens the review view, **Then** the status clearly communicates that no completed reviews are currently available.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-10 | UC-10-AS | Paper selection and review request flow |
| FR-002 | UC-10 | UC-10-AS | Completed review retrieval and presentation |
| FR-003 | UC-10 | UC-10-AS | Filtering completed versus incomplete review states |
| FR-004 | UC-10 | UC-10-AS | Pending-status presentation when no reviews exist |
| FR-005 | UC-10 | UC-10-AS | Review view state messaging and response consistency |
| FR-006 | UC-10 | UC-10-AS | Traceability records for review view outcomes |
| FR-007 | UC-10 | UC-10-AS | Authorization checks for review visibility access |
| FR-008 | UC-10 | UC-10-AS | Reviewer identity visibility in completed review display |
| FR-009 | UC-10 | UC-10-AS | Access audit records for successful review views |
| FR-010 | UC-10 | UC-10-AS | Non-disclosing response for unauthorized review requests |
| FR-011 | UC-10 | UC-10-AS | Retention policy for review access audit logs |

### Edge Cases

- A paper has a mix of completed and in-progress reviews.
- A paper has no completed reviews but has assigned reviewers.
- The editor selects a paper that becomes unavailable before reviews are returned.
- The editor requests reviews repeatedly while status transitions from pending to available.
- A paper has a large number of completed reviews and all must still be visible in one view.
- An editor who is not assigned to the paper or track requests review visibility.
- Unauthorized editors attempt to infer paper or review existence through response differences.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-10 / UC-10-AS)**: System MUST allow an editor to select a paper and request its associated reviews.
- **FR-002 (UC-10 / UC-10-AS)**: System MUST display all completed reviews associated with the selected paper when completed reviews exist.
- **FR-003 (UC-10 / UC-10-AS)**: System MUST distinguish completed reviews from non-completed review states so only completed reviews are shown as completed results.
- **FR-004 (UC-10 / UC-10-AS)**: System MUST display a pending review status when no completed reviews exist for the selected paper.
- **FR-005 (UC-10 / UC-10-AS)**: System MUST present a clear outcome for every review request as either completed reviews available or reviews pending.
- **FR-006 (UC-10 / UC-10-AS)**: System MUST maintain a traceability record for each review request outcome in `specs/001-view-paper-reviews/traceability.md`, including `requestId`, `editorId`, `paperId`, `outcome` (`available`, `pending`, or `unavailable`), timestamp, `UC-10`, and `UC-10-AS`.
- **FR-007 (UC-10 / UC-10-AS)**: System MUST allow review visibility only to editors assigned to the selected paper or its track and deny access to other editors.
- **FR-008 (UC-10 / UC-10-AS)**: System MUST display the reviewer identity with each completed review for authorized editors.
- **FR-009 (UC-10 / UC-10-AS)**: System MUST record an audit entry for every successful review-view access that includes editor identity, selected paper identity, and access timestamp.
- **FR-010 (UC-10 / UC-10-AS)**: System MUST return a generic "Paper reviews unavailable" response for unauthorized review requests and MUST NOT disclose whether the paper exists or has reviews.
- **FR-011 (UC-10 / UC-10-AS)**: System MUST retain review access audit entries for 1 year from the access timestamp.

### Key Entities *(include if feature involves data)*

- **Paper**: The submission selected by an editor to view review outcomes.
- **Review**: An evaluation tied to a paper, including completion state and submitted feedback content.
- **Reviewer Identity**: The reviewer attribution attached to a completed review and shown to authorized editors.
- **Review View Status**: The result state returned to the editor for a selected paper, represented as reviews available or reviews pending.
- **Review Access Audit Entry**: A record of a successful review-view event containing editor identity, paper identity, and access timestamp.
- **Audit Retention Window**: The required period that review access audit entries remain available, set to 1 year from event time.

## Assumptions

- Editors accessing this workflow are authenticated through existing platform controls.
- Review visibility authorization is limited to editors assigned to the selected paper or its track.
- Reviewer identity data is available and attributable for each completed review.
- A review is considered completed only after formal submission.
- Pending status indicates that no completed reviews are currently available for display.

## Dependencies

- Paper selection data is available to identify the editor's target paper.
- Review records maintain a reliable completion state.
- Existing access-control rules determine whether the editor can view a given paper's reviews.
- Audit logging capability exists to store successful review-view access entries.
- Audit storage supports retention and retrieval of review access entries for 1 year.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scenarios in `Acceptance Tests/UC-10-AS.md` pass without modifying acceptance suite wording.
- **SC-002**: Under a workload of 500 requests (70% authorized, 30% unavailable), with papers containing up to 100 reviews, p95 latency for `GET /api/papers/{paperId}/reviews` is at most 5.0 seconds in the CI test environment.
- **SC-003**: 100% of papers with one or more completed reviews display all completed reviews to the editor.
- **SC-004**: 100% of papers with no completed reviews display a pending status instead of empty or ambiguous output.
- **SC-005**: In a scripted usability check with 10 editors, at least 9 correctly identify review state (`available` or `pending`) within 10 seconds on first view.
- **SC-006**: 0 previously passing acceptance suites regress after this feature is merged.
- **SC-007**: 100% of review visibility requests from editors not assigned to the selected paper or track are denied.
- **SC-008**: 100% of completed reviews displayed to authorized editors include the reviewer identity.
- **SC-009**: 100% of successful review-view accesses create an audit entry with editor identity, paper identity, and timestamp.
- **SC-010**: 100% of unauthorized review requests return the same generic "Paper reviews unavailable" response without revealing paper or review existence details.
- **SC-011**: 100% of review access audit entries remain retrievable for 1 year from their recorded access timestamp.
