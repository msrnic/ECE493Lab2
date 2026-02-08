# Feature Specification: Reviewer Assignment Workflow

**Feature Branch**: `[001-assign-reviewers]`
**Created**: 2026-02-07
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. Editor selects a paper 2. Editor selects reviewers 3. System assigns reviewers 4. System notifies reviewers Extensions: * **2a**: Reviewer unavailable * **2a1**: Editor selects alternate reviewer"

## Clarifications

### Session 2026-02-07

- Q: If at least one selected reviewer is unavailable, what should the system do before finishing assignment? → A: Block completion until each unavailable reviewer is replaced with an alternate reviewer.
- Q: Should conflict-of-interest (COI) checks be handled inside this assignment workflow? → A: Enforce COI checks here and block assignment for conflicted reviewers.
- Q: If two editors try to assign reviewers to the same paper at nearly the same time, how should conflicts be handled? → A: Allow parallel attempts, but only the first confirmed assignment succeeds; later confirmations are rejected and must reload current state.
- Q: How many retry attempts should the system make after an invitation delivery failure before marking it as failed? → A: Retry every 5 minutes for a maximum of 3 retries, then mark failed.
- Q: After notification is marked failed (after 3 retries), what should happen to the reviewer assignment itself? → A: Keep the reviewer assignment active, mark invitation failed, and show follow-up is needed.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-06, UC-07]
- **Source Use Case Files**: [`Use Cases/UC-06.md`, `Use Cases/UC-07.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-06-AS.md`, `Acceptance Tests/UC-07-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope project-owned feature logic; if below 100%, uncovered lines MUST be justified with a remediation plan; coverage below 95% requires an approved exception.
- **Traceability Commitment**: Every scenario and requirement below cites one or more in-scope UC IDs and matching acceptance suites.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Assign Reviewers to a Paper (Priority: P1)

An editor assigns available reviewers to a submitted paper so the review process can start without manual coordination.

**Mapped Use Case(s)**: [UC-06]
**Mapped Acceptance Suite(s)**: [UC-06-AS]

**Why this priority**: Reviewer assignment is the core flow that enables all downstream review and decision activities.

**Independent Test**: Can be fully tested by selecting a submitted paper and available reviewers, then confirming assignment and notification outcomes.

**Acceptance Scenarios**:

1. **Given** a submitted paper and available reviewers, **When** the editor selects the paper and reviewers and confirms assignment, **Then** the system assigns the selected reviewers and marks assignment as successful.
2. **Given** reviewers are successfully assigned, **When** assignment processing completes, **Then** the system confirms that reviewer notifications were initiated.

---

### User Story 2 - Replace Unavailable Reviewer (Priority: P2)

An editor replaces an unavailable reviewer during assignment so the paper can still receive the intended reviewer coverage.

**Mapped Use Case(s)**: [UC-06]
**Mapped Acceptance Suite(s)**: [UC-06-AS]

**Why this priority**: Handling unavailability prevents stalled assignments and reduces editor rework.

**Independent Test**: Can be tested by attempting assignment with an unavailable reviewer and confirming the alternate-reviewer path completes successfully.

**Acceptance Scenarios**:

1. **Given** a selected reviewer is unavailable, **When** the editor attempts assignment, **Then** the system prompts the editor to select an alternative reviewer.
2. **Given** one or more selected reviewers are unavailable, **When** the editor replaces each unavailable reviewer with an available alternative and confirms the updated selection, **Then** the system completes assignment for the paper.

---

### User Story 3 - Deliver Reviewer Invitations (Priority: P3)

A reviewer receives an invitation after assignment so they know a paper is ready for review.

**Mapped Use Case(s)**: [UC-07]
**Mapped Acceptance Suite(s)**: [UC-07-AS]

**Why this priority**: Assignment value is only realized when reviewers are informed and can act.

**Independent Test**: Can be tested by assigning a reviewer and verifying invitation receipt, then simulating delivery failure and verifying retry logging.

**Acceptance Scenarios**:

1. **Given** a reviewer is assigned to a paper, **When** notification is sent, **Then** the reviewer receives the invitation.
2. **Given** notification delivery fails, **When** retry occurs, **Then** the system logs the failure and retry outcome.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-06 | UC-06-AS | Paper selection and assignment initiation flow |
| FR-002 | UC-06 | UC-06-AS | Reviewer selection and availability validation |
| FR-003 | UC-06 | UC-06-AS | Assignment completion and status confirmation |
| FR-004 | UC-06 | UC-06-AS | Unavailability handling and alternate selection |
| FR-005 | UC-06 | UC-06-AS | Assignment continuation after alternate selection |
| FR-006 | UC-07 | UC-07-AS | Invitation dispatch for newly assigned reviewers |
| FR-007 | UC-07 | UC-07-AS | Notification retry cadence, retry limit, and failure logging |
| FR-008 | UC-06, UC-07 | UC-06-AS, UC-07-AS | Assignment outcome visibility for editors |
| FR-009 | UC-06, UC-07 | UC-06-AS, UC-07-AS | Assignment and notification traceability records |
| FR-010 | UC-06 | UC-06-AS | Completion blocking for unreplaced unavailable reviewers |
| FR-011 | UC-06 | UC-06-AS | Conflict-of-interest validation and enforcement |
| FR-012 | UC-06 | UC-06-AS | Concurrent assignment conflict resolution |
| FR-013 | UC-06, UC-07 | UC-06-AS, UC-07-AS | Assignment state retention after terminal notification failure |

### Edge Cases

- A reviewer is selected more than once for the same paper in one assignment attempt.
- All initially selected reviewers are unavailable at assignment time.
- A selected reviewer has a conflict of interest with the paper.
- Two editors submit assignment confirmations for the same paper at nearly the same time.
- The editor cancels assignment after being prompted to choose an alternate reviewer.
- Notification delivery fails repeatedly after retry attempts.
- Notification reaches terminal failure after 3 retries.
- The paper is no longer eligible for assignment (for example, withdrawn) between selection and confirmation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-06 / UC-06-AS)**: System MUST allow an editor to begin reviewer assignment only for papers that are in submitted state.
- **FR-002 (UC-06 / UC-06-AS)**: System MUST allow the editor to select reviewers for the chosen paper and validate each selected reviewer’s current availability and conflict-of-interest eligibility before final assignment.
- **FR-003 (UC-06 / UC-06-AS)**: System MUST assign all selected available reviewers to the paper when the editor confirms assignment.
- **FR-004 (UC-06 / UC-06-AS)**: If any selected reviewer is unavailable, system MUST prompt the editor to select an alternate reviewer before that reviewer slot can be assigned.
- **FR-005 (UC-06 / UC-06-AS)**: After an alternate reviewer is selected, system MUST continue and complete assignment without forcing the editor to restart the full workflow.
- **FR-006 (UC-07 / UC-07-AS)**: System MUST initiate an invitation notification for each reviewer successfully assigned to a paper.
- **FR-007 (UC-07 / UC-07-AS)**: If invitation delivery fails, system MUST retry delivery every 5 minutes for a maximum of 3 retries, then mark the invitation as failed and record failure details in system logs.
- **FR-008 (UC-06, UC-07 / UC-06-AS, UC-07-AS)**: System MUST show the editor a final assignment outcome that identifies assigned reviewers, replaced unavailable reviewers, notification status, and any follow-up needed.
- **FR-009 (UC-06, UC-07 / UC-06-AS, UC-07-AS)**: System MUST preserve traceability records linking paper, reviewer assignment action, and notification outcome for review and audit.
- **FR-010 (UC-06 / UC-06-AS)**: System MUST block assignment completion while any selected reviewer remains unavailable and unreplaced.
- **FR-011 (UC-06 / UC-06-AS)**: System MUST block assignment of any reviewer flagged with a conflict of interest and require the editor to select a non-conflicted alternate reviewer.
- **FR-012 (UC-06 / UC-06-AS)**: System MUST accept only the first successful assignment confirmation for a paper and reject later conflicting confirmations until the editor reloads the current paper assignment state.
- **FR-013 (UC-06, UC-07 / UC-06-AS, UC-07-AS)**: When an invitation reaches terminal failure after the configured retries, system MUST keep the reviewer assignment active, mark the invitation as failed, and flag the assignment for editor follow-up.

### Key Entities *(include if feature involves data)*

- **Paper Submission**: A submitted paper selected by an editor for reviewer assignment.
- **Reviewer**: A qualified reviewer candidate with availability status and conflict-of-interest status for assignment decisions.
- **Reviewer Assignment**: A record connecting a paper and reviewer, including assignment state and replacement history when alternates are chosen.
- **Review Invitation**: A notification record tied to a reviewer assignment, including delivery status, retry attempts, terminal failure status, and follow-up indicator.

## Assumptions

- Reviewer qualification scoring is determined before this workflow; this feature additionally enforces conflict-of-interest blocking during assignment.
- The required number of reviewers per paper is defined elsewhere; this feature applies assignment behavior to the requested reviewer slots.
- Notification preferences and message content are managed by existing notification policies and are outside this feature scope.

## Dependencies

- A reviewer availability source exists and can return current availability during assignment.
- A conflict-of-interest data source exists and can identify whether a reviewer has a conflict with a selected paper.
- A notification capability exists that can report invitation delivery success, failure, and retry outcomes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scenarios in `UC-06-AS` and `UC-07-AS` pass without modifying acceptance suite text.
- **SC-002**: At least 95% of editor assignment attempts with available reviewers complete successfully in under 2 minutes from paper selection to final confirmation.
- **SC-003**: 100% of assignment attempts containing an unavailable reviewer trigger the alternate-reviewer prompt before assignment can complete.
- **SC-004**: 100% of successful reviewer assignments trigger invitation processing, and failed delivery attempts are logged with retry outcome visibility.
- **SC-005**: 0 previously passing acceptance suites regress after this feature is merged.
- **SC-006**: Coverage evidence for in-scope project-owned feature logic is recorded at 100%, or has documented justification and approved exception when below 100% and never below 95% without approval.
- **SC-007**: 100% of assignment attempts that include a conflicted reviewer are blocked until a non-conflicted alternate reviewer is selected.
- **SC-008**: 100% of simultaneous assignment confirmation conflicts result in exactly one accepted assignment and explicit rejection feedback for stale confirmations.
- **SC-009**: 100% of invitation delivery failures trigger retries at 5-minute intervals with a hard limit of 3 retries, after which the invitation is marked failed and logged.
- **SC-010**: 100% of terminal invitation failures retain the related reviewer assignment as active and visibly flagged for editor follow-up.
