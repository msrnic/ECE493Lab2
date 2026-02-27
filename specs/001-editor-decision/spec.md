# Feature Specification: Editor Decision Recording

**Feature Branch**: `[001-editor-decision]`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. Editor reviews evaluations 2. Editor selects decision 3. System saves decision Extensions: * **2a**: Decision deferred * **2a1**: Paper remains undecided"

## Clarifications

### Session 2026-02-08

- Q: Can a final paper decision be changed after it is saved in this workflow? → A: Final decision is immutable once saved; changes require a separate formal override workflow.
- Q: How should concurrent conflicting final decision saves be handled? → A: First successful final save wins; later conflicting saves are rejected and must use override workflow.
- Q: Who is authorized to record decisions for a paper? → A: Only editors assigned to the paper or its track can record decisions.
- Q: What final decision outcomes are supported in this workflow? → A: Final outcomes are fixed to Accept, Reject, and Revise.
- Q: What decision audit logging is required? → A: Log both successful and denied decision actions with editor, paper, action, outcome, and timestamp.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-11]
- **Source Use Case Files**: [`Use Cases/UC-11.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-11-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope project-owned JavaScript; below 95% requires approved exception.
- **Traceability Commitment**: Every scenario and requirement below cites UC-11 and UC-11-AS.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Record Final Paper Decision (Priority: P1)

An editor reviews available evaluations and records a final decision for a paper.

**Mapped Use Case(s)**: [UC-11]
**Mapped Acceptance Suite(s)**: [UC-11-AS]

**Why this priority**: Capturing the final decision is the core business outcome of this workflow.

**Independent Test**: Can be fully tested by providing available reviews, selecting a final decision, saving it, and verifying the decision remains stored on reload.

**Acceptance Scenarios**:

1. **Given** reviews are available for a paper, **When** the editor selects a final decision and saves, **Then** the decision is stored for that paper.
2. **Given** a final decision was stored, **When** the editor reopens the same paper, **Then** the stored decision is shown as the current recorded outcome.
3. **Given** a final decision was already stored, **When** an editor attempts to change it in this workflow, **Then** the system rejects the change and preserves the original decision.
4. **Given** two editors submit conflicting final decisions nearly simultaneously, **When** the first final save succeeds, **Then** later conflicting saves are rejected and routed to the override workflow.
5. **Given** an editor is not assigned to the paper or its track, **When** they attempt to record a decision, **Then** the system denies the request.

---

### User Story 2 - Defer a Paper Decision (Priority: P2)

An editor can defer making a final decision while keeping the paper in an undecided state.

**Mapped Use Case(s)**: [UC-11]
**Mapped Acceptance Suite(s)**: [UC-11-AS]

**Why this priority**: Deferral is explicitly required by the extension path and prevents forced premature decisions.

**Independent Test**: Can be tested by choosing defer, saving, and verifying the paper remains undecided and available for future decision updates.

**Acceptance Scenarios**:

1. **Given** the editor chooses to defer the decision, **When** the defer action is saved, **Then** the paper remains undecided.
2. **Given** a paper is in deferred state, **When** the editor later returns to decide, **Then** the workflow still allows a final decision to be selected and saved.

---

### User Story 3 - Handle Unsuccessful Save Attempts (Priority: P3)

An editor receives a clear outcome when decision saving does not succeed so no incorrect assumption is made about paper status.

**Mapped Use Case(s)**: [UC-11]
**Mapped Acceptance Suite(s)**: [UC-11-AS]

**Why this priority**: Prevents silent data loss and supports recovery from the failed end condition.

**Independent Test**: Can be tested by simulating a save failure and verifying the system reports that the decision was not recorded and allows a retry.

**Acceptance Scenarios**:

1. **Given** reviews are available and a decision is selected, **When** saving fails, **Then** the system clearly indicates that no decision was recorded.
2. **Given** a save attempt failed, **When** the editor retries save after correction, **Then** the decision is recorded successfully.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-11 | UC-11-AS | Evaluation review step in decision workflow |
| FR-002 | UC-11 | UC-11-AS | Decision selection controls and validation |
| FR-003 | UC-11 | UC-11-AS | Decision save and persistence outcome |
| FR-004 | UC-11 | UC-11-AS | Success confirmation to editor |
| FR-005 | UC-11 | UC-11-AS | Deferred decision state handling |
| FR-006 | UC-11 | UC-11-AS | Undecided paper status continuity |
| FR-007 | UC-11 | UC-11-AS | Save-failure handling and retry path |
| FR-008 | UC-11 | UC-11-AS | Preconditions around review availability |
| FR-009 | UC-11 | UC-11-AS | Final decision immutability and override boundary |
| FR-010 | UC-11 | UC-11-AS | Concurrent conflicting save resolution |
| FR-011 | UC-11 | UC-11-AS | Authorization boundary for decision recording |
| FR-012 | UC-11 | UC-11-AS | Allowed final decision outcomes |
| FR-013 | UC-11 | UC-11-AS | Decision action audit logging |
| FR-014 | UC-11 | UC-11-AS | Audit persistence failure handling for decision actions |

### Edge Cases

- Reviews become unavailable between the time the editor starts review and attempts to save a decision.
- Two editors attempt to record different decisions for the same paper nearly simultaneously.
- The editor selects defer after previously choosing a final decision but before saving.
- A save request is submitted multiple times due to repeated click or refresh behavior.
- A save operation fails after the editor submitted a decision and must not be shown as successful.
- An editor attempts to change a final decision that was already saved.
- An unassigned editor attempts to record or defer a decision for a paper.
- An editor attempts to save a final outcome outside Accept, Reject, or Revise.
- A decision action succeeds or is denied but audit logging fails.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-11 / UC-11-AS)**: System MUST present available paper evaluations to the editor before the decision is saved.
- **FR-002 (UC-11 / UC-11-AS)**: System MUST allow the editor to select a decision outcome for the paper, where final outcomes are Accept, Reject, or Revise, and where defer is available as a non-final option.
- **FR-003 (UC-11 / UC-11-AS)**: System MUST store the selected final decision for the targeted paper when save succeeds.
- **FR-004 (UC-11 / UC-11-AS)**: System MUST confirm to the editor when a decision has been successfully stored.
- **FR-005 (UC-11 / UC-11-AS)**: System MUST keep the paper in undecided status when the editor saves a deferred decision.
- **FR-006 (UC-11 / UC-11-AS)**: System MUST allow a paper in deferred state to later receive a final recorded decision.
- **FR-007 (UC-11 / UC-11-AS)**: System MUST show that a decision was not recorded when save fails and MUST allow the editor to retry.
- **FR-008 (UC-11 / UC-11-AS)**: System MUST prevent decision recording when required reviews are not available at save time.
- **FR-009 (UC-11 / UC-11-AS)**: System MUST treat a saved final decision as immutable in this workflow and MUST direct change requests to a separate formal override workflow.
- **FR-010 (UC-11 / UC-11-AS)**: System MUST resolve concurrent conflicting final decision saves by preserving the first successful final save and rejecting later conflicting saves with direction to the override workflow.
- **FR-011 (UC-11 / UC-11-AS)**: System MUST allow decision recording only for editors assigned to the paper or its track and MUST deny decision actions from unassigned editors.
- **FR-012 (UC-11 / UC-11-AS)**: System MUST reject any attempted final decision value other than Accept, Reject, or Revise.
- **FR-013 (UC-11 / UC-11-AS)**: System MUST create an audit entry for every successful and denied decision action, including editor identity, paper identity, action attempted, outcome, and timestamp.
- **FR-014 (UC-11 / UC-11-AS)**: If audit persistence fails while processing a decision action, the system MUST treat the decision action as not recorded, return an explicit failure outcome, and allow retry.

### Key Entities *(include if feature involves data)*

- **Paper**: A submission under editorial review that can hold a final or deferred decision state.
- **Evaluation**: Reviewer feedback used by the editor to make a paper decision.
- **Editorial Decision**: The outcome selected by the editor for a paper, where final outcomes are Accept, Reject, or Revise, and defer represents a non-final state.
- **Decision Status**: The current state of paper decisioning, including undecided when deferred.
- **Decision Audit Entry**: A record for each decision action attempt containing editor identity, paper identity, action, outcome, and timestamp.

## Assumptions

- Editors using this workflow are already authenticated and authorized through existing conference management controls.
- Decision authorization is limited to editors assigned to the paper or its track.
- Notifying authors of final decisions is handled by a separate workflow and is out of scope for this feature.
- Exceptional post-save changes to final decisions are handled by a separate formal override workflow outside this feature.

## Dependencies

- Review/evaluation records are available to the decision workflow when preconditions are met.
- Paper records support storing both final decisions and an undecided status.
- Assignment data is available to determine whether an editor is assigned to a paper or its track.
- Audit storage is available to persist decision action records for successful and denied attempts.
- Existing acceptance suites for UC-11 remain the source of truth for regression validation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scenarios in `Acceptance Tests/UC-11-AS.md` pass without changing acceptance suite wording.
- **SC-002**: At least 95% of editor decision workflows complete (from opening evaluations to saving) in under 2 minutes during normal operations.
- **SC-003**: 99% of successful save attempts show the correct persisted decision on the next view within 5 seconds.
- **SC-004**: 100% of saved deferred decisions leave papers in undecided state until a later final decision is saved.
- **SC-005**: 0% of failed save attempts are reported to editors as successful saves.
- **SC-006**: In stakeholder acceptance testing, at least 90% of editors report that decision outcomes (saved vs. not saved) are clear on first attempt.
- **SC-007**: 0 previously passing acceptance suites regress after this feature is merged.
- **SC-008**: 100% of attempts to change an already saved final decision through this workflow are rejected and leave the original decision unchanged.
- **SC-009**: 100% of concurrent conflicting final decision save attempts preserve the first successful final save and reject later conflicting saves.
- **SC-010**: 100% of decision-recording attempts by unassigned editors are denied.
- **SC-011**: 100% of saved final decisions use only Accept, Reject, or Revise, and 100% of other final values are rejected.
- **SC-012**: 100% of successful and denied decision actions create an audit entry with editor, paper, action, outcome, and timestamp.
- **SC-013**: 100% of simulated audit-write failures result in a reported "decision not recorded" outcome with retry available.
