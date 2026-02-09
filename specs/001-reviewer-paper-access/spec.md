# Feature Specification: Reviewer Paper Access

**Feature Branch**: `[001-reviewer-paper-access]`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. Reviewer logs in 2. Reviewer selects paper 3. System displays paper files Extensions: * **3a**: Access revoked * **3a1**: System denies access"

## Clarifications

### Session 2026-02-08

- Q: When should revoked access take effect for paper files? → A: Enforce immediately on every file access request.
- Q: Who can view paper access records? → A: Only the paper's editors plus support/admin roles.
- Q: How should the system respond when paper files are temporarily unavailable? → A: Show a temporary unavailability outcome and allow immediate retry.
- Q: What should happen if access is revoked while the reviewer is already viewing paper content? → A: Keep currently displayed content, but deny all subsequent file requests immediately.
- Q: What retry throttling should apply during temporary file outages? → A: Allow immediate retry, then throttle repeated requests to 1 request per 5 seconds per reviewer-paper.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-08]
- **Source Use Case Files**: [`Use Cases/UC-08.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-08-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope project-owned feature logic; if below 100%, uncovered lines MUST be justified with a remediation plan; coverage below 95% requires an approved exception.
- **Traceability Commitment**: Every scenario and requirement below cites one or more in-scope UC IDs and matching acceptance suites.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Open Assigned Paper Files (Priority: P1)

A reviewer opens an assigned paper after login so they can start evaluating the submission.

**Mapped Use Case(s)**: [UC-08]
**Mapped Acceptance Suite(s)**: [UC-08-AS]

**Why this priority**: Access to assigned paper files is the core value of this feature and is required before any review work can begin.

**Independent Test**: Can be fully tested by logging in as an assigned reviewer, selecting a paper, confirming paper files are displayed, validating session-expiry handling on request, and verifying p95 selection-to-render time is <= 3 seconds.

**Acceptance Scenarios**:

1. **Given** the reviewer accepted the assignment and is logged in, **When** the reviewer selects the assigned paper, **Then** the system displays the paper files.
2. **Given** the reviewer has access to multiple assigned papers, **When** one assigned paper is selected, **Then** only that paper's files are displayed.
3. **Given** the reviewer is authorized but paper files are temporarily unavailable, **When** the reviewer requests the paper files, **Then** the system shows a temporary unavailability outcome, allows an immediate retry, and throttles additional repeated requests to at most one request every 5 seconds per reviewer-paper.
4. **Given** the reviewer session expires before file retrieval, **When** the reviewer requests the paper files, **Then** the system requires re-authentication and does not display protected files.

---

### User Story 2 - Deny Revoked Access (Priority: P2)

The system blocks a reviewer from viewing paper files when access is revoked so restricted content is protected.

**Mapped Use Case(s)**: [UC-08]
**Mapped Acceptance Suite(s)**: [UC-08-AS]

**Why this priority**: Access control enforcement prevents unauthorized viewing and protects submission confidentiality.

**Independent Test**: Can be tested by revoking a reviewer's access and verifying the system denies paper file access when the paper is selected.

**Acceptance Scenarios**:

1. **Given** access to an assigned paper is revoked, **When** the reviewer attempts to access that paper, **Then** the system denies access.
2. **Given** access is denied due to revocation, **When** the denial is shown, **Then** the reviewer receives a clear message that access is no longer available.
3. **Given** a reviewer previously had access and revocation occurs, **When** the next paper file request is made, **Then** access is denied immediately.
4. **Given** a reviewer is already viewing paper content and revocation occurs, **When** the reviewer requests any additional paper file, **Then** that new request is denied immediately while the already displayed content remains visible.

---

### User Story 3 - Record Access Outcomes (Priority: P3)

Paper editors and support/admin staff can review access outcomes so approved access and denied attempts are traceable.

**Mapped Use Case(s)**: [UC-08]
**Mapped Acceptance Suite(s)**: [UC-08-AS]

**Why this priority**: Traceability supports operational support and audit follow-up when reviewers report access issues.

**Independent Test**: Can be tested by completing one successful access and one revoked-access denial, then verifying both outcomes are recorded.

**Acceptance Scenarios**:

1. **Given** a reviewer accesses a paper successfully or is denied due to revocation, **When** access records are reviewed, **Then** the outcome is available for support and audit review.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-08 | UC-08-AS | Reviewer authentication gate before paper access |
| FR-002 | UC-08 | UC-08-AS | Assigned paper selection and file display |
| FR-003 | UC-08 | UC-08-AS | Access entitlement validation at access time |
| FR-004 | UC-08 | UC-08-AS | Revoked-access denial flow |
| FR-005 | UC-08 | UC-08-AS | Access denial messaging |
| FR-006 | UC-08 | UC-08-AS | Access outcome logging and traceability |
| FR-007 | UC-08 | UC-08-AS | Coverage and traceability evidence |
| FR-008 | UC-08 | UC-08-AS | Role-based access to paper access records |
| FR-009 | UC-08 | UC-08-AS | Temporary paper-file unavailability handling |
| FR-010 | UC-08 | UC-08-AS | Revocation behavior during active viewing |
| FR-011 | UC-08 | UC-08-AS | Temporary-outage retry throttling |
| FR-012 | UC-08 | UC-08-AS | Session-expiry handling for file and access-record requests |

### Edge Cases

- Reviewer session expires between paper selection and file display request.
- Access is revoked after the paper list is displayed but before file access is requested, and the next file request must be denied immediately.
- Access is revoked while a reviewer is already viewing content, and all subsequent file requests must be denied without clearing already displayed content.
- Reviewer attempts to access a paper not assigned to them.
- Paper files are temporarily unavailable when an authorized reviewer requests access, and the system must report temporary unavailability (not access denial) with immediate retry allowed.
- A reviewer rapidly repeats file requests during a temporary outage, and requests beyond the immediate retry must be throttled to one request every 5 seconds per reviewer-paper.
- Reviewer has partial assignment changes and refreshes while viewing available papers.
- An authenticated user who is not a paper editor and not support/admin attempts to view paper access records.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-08 / UC-08-AS)**: System MUST allow paper file access only for authenticated reviewers.
- **FR-002 (UC-08 / UC-08-AS)**: System MUST allow a reviewer to select a paper from their assigned papers and display that paper's files when access is valid.
- **FR-003 (UC-08 / UC-08-AS)**: System MUST validate reviewer assignment and access entitlement on every paper file access request.
- **FR-004 (UC-08 / UC-08-AS)**: If access has been revoked, system MUST deny all new paper file access requests.
- **FR-005 (UC-08 / UC-08-AS)**: When access is denied due to revocation, system MUST present a clear denial outcome to the reviewer.
- **FR-006 (UC-08 / UC-08-AS)**: System MUST record successful and denied access outcomes with at least: attemptId, reviewerId, paperId, optional fileId, outcome, reasonCode, occurredAt, requestId, and viewerRoleSnapshot.
- **FR-007 (UC-08 / UC-08-AS)**: System MUST generate coverage evidence for in-scope project-owned feature logic and target 100% line coverage; if below 100%, uncovered lines MUST be justified with remediation steps; coverage below 95% MUST include an approved exception.
- **FR-008 (UC-08 / UC-08-AS)**: System MUST restrict viewing of paper access records to users who are either editors of the related paper or in support/admin roles.
- **FR-009 (UC-08 / UC-08-AS)**: If paper files are temporarily unavailable for an otherwise authorized reviewer, system MUST present a temporary unavailability outcome and allow immediate retry without marking access as revoked.
- **FR-010 (UC-08 / UC-08-AS)**: If revocation occurs while paper content is already displayed, system MUST keep already displayed content visible but deny every subsequent paper file request immediately.
- **FR-011 (UC-08 / UC-08-AS)**: During temporary file unavailability, system MUST allow one immediate retry and throttle additional repeated requests to no more than one request every 5 seconds per reviewer-paper.
- **FR-012 (UC-08 / UC-08-AS)**: If a session is expired or invalid at paper-file or access-record request time, system MUST return an authentication-required outcome and MUST NOT display protected files or records.

If a source requirement is ambiguous, implementation MUST pause and log a clarification request that cites exact `Use Cases/UC-08.md` and `Acceptance Tests/UC-08-AS.md` text.

### Key Entities *(include if feature involves data)*

- **Reviewer Access Entitlement**: The current permission state tying a reviewer to an assigned paper, including whether access is active or revoked.
- **Paper File Bundle**: The set of files associated with a selected paper that may be displayed to authorized reviewers.
- **Paper Access Attempt**: A record of a reviewer request to open a paper, including outcome (`granted`, `denied-revoked`, `temporarily-unavailable`, or `throttled`) and reason context.
- **Outage Retry Window**: Per reviewer-paper retry state used to allow one immediate retry and throttle additional temporary-outage retries to one request every 5 seconds.

## Assumptions

- Reviewer login is handled by an existing authentication flow; this feature relies on authenticated reviewer identity.
- Assignment acceptance and revocation decisions are managed by upstream workflows and are available as current entitlement state.
- Reviewer denial messaging content follows existing product communication standards.

## Dependencies

- An authentication mechanism exists to identify the current reviewer.
- Assignment and revocation status can be retrieved at paper access time.
- Paper files are available from the submission repository for authorized access.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scenarios in `UC-08-AS` pass without modifying acceptance suite text.
- **SC-002**: In a run of at least 100 authorized reviewer paper selections, the 95th-percentile time from paper selection to visible file-list render is 3 seconds or less.
- **SC-003**: 100% of revoked-access attempts are denied at access time.
- **SC-004**: 100% of access denials provide reviewers with a clear access-revoked outcome message.
- **SC-005**: 100% of successful and denied access attempts are captured in access records visible to paper editors and support/admin staff.
- **SC-006**: 0 previously passing acceptance suites regress after this feature is merged.
- **SC-007**: Coverage evidence for in-scope project-owned feature logic is recorded at 100%, or has documented justification and approved exception when below 100% and never below 95% without approval.
- **SC-008**: 100% of paper file requests made after revocation are denied on the next request without requiring re-login.
- **SC-009**: 100% of attempts by authenticated users outside paper-editor and support/admin roles to view paper access records are denied.
- **SC-010**: 100% of authorized requests during temporary file outages return a temporary unavailability outcome (not access denial) and include an immediate retry path.
- **SC-011**: 100% of post-revocation paper file requests are denied even when revocation occurs during active viewing, while already displayed content remains visible.
- **SC-012**: 100% of repeated temporary-outage requests beyond the immediate retry are throttled to no more than one request every 5 seconds per reviewer-paper.
- **SC-013**: 100% of paper-file and access-record requests with expired or invalid sessions return an authentication-required outcome and display no protected content.
