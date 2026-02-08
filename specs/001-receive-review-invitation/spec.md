# Feature Specification: Reviewer Invitation Delivery

**Feature Branch**: `[001-receive-review-invitation]`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. System sends notification 2. Reviewer receives invitation Extensions: * **1a**: Notification delivery failure * **1a1**: System retries"

## Clarifications

### Session 2026-02-08

- Q: What retry schedule and limit should apply after invitation delivery failure? → A: Retry every 5 minutes with a maximum of 3 retries, then mark failed.
- Q: Who can view invitation delivery failure logs? → A: Only the paper's editors plus support/admin roles can view failure logs.
- Q: What should happen if reviewer assignment is removed while retries are still pending? → A: Stop retries immediately and mark invitation as canceled.
- Q: What invitation uniqueness rule should apply per reviewer-paper assignment? → A: Maintain one active invitation record per reviewer-paper assignment.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-07]
- **Source Use Case Files**: [`Use Cases/UC-07.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-07-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope project-owned feature logic; if below 100%, uncovered lines MUST be justified with a remediation plan; coverage below 95% requires an approved exception.
- **Traceability Commitment**: Every scenario and requirement below cites one or more in-scope UC IDs and matching acceptance suites.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Receive Review Invitation (Priority: P1)

A reviewer receives an invitation after being assigned to a paper so they can begin the review process on time.

**Mapped Use Case(s)**: [UC-07]
**Mapped Acceptance Suite(s)**: [UC-07-AS]

**Why this priority**: Reviewer notification is the core value of this feature and directly determines whether review work can start.

**Independent Test**: Can be fully tested by assigning a reviewer to a paper and verifying the invitation is received without manual follow-up.

**Acceptance Scenarios**:

1. **Given** a registered reviewer is assigned to a paper, **When** notification is sent, **Then** the reviewer receives the invitation.
2. **Given** invitation delivery succeeds, **When** delivery status is checked, **Then** the invitation is marked as delivered.

---

### User Story 2 - Retry Failed Invitation Delivery (Priority: P2)

The system automatically retries invitation delivery after an initial failure so temporary notification issues do not block reviewer onboarding.

**Mapped Use Case(s)**: [UC-07]
**Mapped Acceptance Suite(s)**: [UC-07-AS]

**Why this priority**: Automatic retry improves reliability and reduces manual intervention when transient failures occur.

**Independent Test**: Can be tested by forcing an initial delivery failure and verifying an automatic retry is attempted and tracked.

**Acceptance Scenarios**:

1. **Given** notification delivery fails, **When** the failure is detected, **Then** the system retries delivery every 5 minutes for up to 3 retries.
2. **Given** retry succeeds, **When** retry processing completes, **Then** the reviewer receives the invitation and retry attempts stop.
3. **Given** reviewer assignment is removed before retry processing completes, **When** the system evaluates pending retries, **Then** retries stop immediately and the invitation is marked canceled.

---

### User Story 3 - Capture Failure Evidence (Priority: P3)

Paper editors and support/admin staff can review delivery failure records so unresolved invitation issues are visible and actionable.

**Mapped Use Case(s)**: [UC-07]
**Mapped Acceptance Suite(s)**: [UC-07-AS]

**Why this priority**: Failure visibility is required to resolve invitations that remain undelivered after automatic retry.

**Independent Test**: Can be tested by causing delivery failure and retry failure, then verifying the failure and retry outcomes are recorded for follow-up.

**Acceptance Scenarios**:

1. **Given** initial delivery fails and retry occurs, **When** invitation records are reviewed, **Then** failure details and retry outcome are available.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-07 | UC-07-AS | Invitation trigger on reviewer assignment |
| FR-002 | UC-07 | UC-07-AS | Invitation delivery status lifecycle |
| FR-003 | UC-07 | UC-07-AS | Initial delivery failure detection |
| FR-004 | UC-07 | UC-07-AS | Automatic retry execution |
| FR-005 | UC-07 | UC-07-AS | Retry stop conditions |
| FR-006 | UC-07 | UC-07-AS | Failure and retry audit records |
| FR-007 | UC-07 | UC-07-AS | Follow-up flagging for unresolved delivery |
| FR-008 | UC-07 | UC-07-AS | Coverage and traceability evidence |
| FR-009 | UC-07 | UC-07-AS | Role-based access control for failure logs |
| FR-010 | UC-07 | UC-07-AS | Cancellation behavior on assignment removal |
| FR-011 | UC-07 | UC-07-AS | Invitation uniqueness enforcement |

### Edge Cases

- Reviewer assignment is removed after the first delivery attempt fails but before retry executes, and pending invitation retries must stop with a canceled outcome.
- A delayed success acknowledgment arrives after retry has already been initiated.
- Reviewer contact details are missing or invalid at invitation time.
- Initial attempt and retry both fail due to a prolonged notification outage.
- The same reviewer is reassigned to the same paper, and the system must avoid creating duplicate active invitations for that assignment.
- An unauthorized authenticated user attempts to view invitation delivery failure logs.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-07 / UC-07-AS)**: System MUST trigger an invitation notification immediately after a reviewer is assigned to a paper.
- **FR-002 (UC-07 / UC-07-AS)**: System MUST track each invitation with a delivery status of pending, delivered, failed, or canceled.
- **FR-003 (UC-07 / UC-07-AS)**: System MUST detect and record initial invitation delivery failure.
- **FR-004 (UC-07 / UC-07-AS)**: When initial delivery fails, system MUST automatically retry delivery every 5 minutes with a maximum of 3 retries without requiring manual action.
- **FR-005 (UC-07 / UC-07-AS)**: System MUST stop retrying once delivery succeeds.
- **FR-006 (UC-07 / UC-07-AS)**: System MUST record the outcome of the initial delivery attempt and each retry attempt for audit and support review.
- **FR-007 (UC-07 / UC-07-AS)**: If all 3 automatic retries fail, system MUST keep the invitation marked as failed and flag it for manual follow-up.
- **FR-008 (UC-07 / UC-07-AS)**: System MUST generate coverage evidence for in-scope project-owned feature logic and target 100% line coverage; if below 100%, uncovered lines MUST be justified with remediation steps; coverage below 95% MUST include an approved exception.
- **FR-009 (UC-07 / UC-07-AS)**: System MUST restrict viewing of invitation delivery failure logs to users who are either editors of the related paper or in support/admin roles.
- **FR-010 (UC-07 / UC-07-AS)**: If reviewer assignment is removed while an invitation is pending or retrying, system MUST stop all further retries immediately and mark the invitation as canceled.
- **FR-011 (UC-07 / UC-07-AS)**: System MUST maintain exactly one active invitation record per reviewer-paper assignment and reuse that record for retries and status transitions.

If a source requirement is ambiguous, implementation MUST pause and log a clarification request that cites exact `Use Cases/UC-07.md` and `Acceptance Tests/UC-07-AS.md` text.

### Key Entities *(include if feature involves data)*

- **Review Invitation**: A record linking reviewer assignment to invitation delivery lifecycle, including current status (`pending`, `delivered`, `failed`, `canceled`) and follow-up flag; each reviewer-paper assignment has at most one active invitation record.
- **Delivery Attempt**: A timestamped record for each initial send or retry attempt, including outcome and failure reason when applicable.
- **Failure Log Entry**: An audit record that captures delivery failure context and retry outcome for support troubleshooting.

## Assumptions

- Reviewer assignment completion happens in an upstream workflow and is available as the trigger for this feature.
- Automatic retry policy for this feature is fixed at 5-minute intervals with a maximum of 3 retries before terminal failure.
- Invitation message content and reviewer notification channel preferences are managed outside this feature.

## Dependencies

- A reviewer assignment event is available when assignment is confirmed.
- A notification capability exists that reports success or failure for each invitation attempt.
- Support staff have access to invitation failure records for follow-up.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scenarios in `UC-07-AS` pass without modifying acceptance suite text.
- **SC-002**: At least 95% of reviewer assignments result in invitation delivery within 2 minutes of assignment confirmation.
- **SC-003**: 100% of initial delivery failures trigger an automatic retry attempt without manual intervention.
- **SC-008**: 100% of retry-enabled failures follow the 5-minute retry cadence and stop after at most 3 retries, then transition to failed status if still undelivered.
- **SC-004**: 100% of failed initial deliveries include a recorded retry outcome visible to support staff.
- **SC-005**: During user acceptance testing, at least 90% of reviewers report that invitation delivery is reliable enough to start review work without contacting support.
- **SC-006**: 0 previously passing acceptance suites regress after this feature is merged.
- **SC-007**: Coverage evidence for in-scope project-owned feature logic is recorded at 100%, or has documented justification and approved exception when below 100% and never below 95% without approval.
- **SC-009**: 100% of attempts by unauthorized authenticated users to view invitation failure logs are denied.
- **SC-010**: 100% of invitations tied to removed assignments stop retrying and transition to `canceled` before any additional delivery attempt occurs.
- **SC-011**: 100% of reviewer-paper assignments have no more than one active invitation record at any point in time.
