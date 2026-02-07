# Feature Specification: Save Paper Draft

**Feature Branch**: `002-save-submission-draft`  
**Created**: 2026-02-07  
**Status**: Draft  
**Input**: User description: "Main Success Scenario: 1. Author enters partial submission data 2. Author selects save option 3. System stores draft Extensions: * **3a**: System error * **3a1**: Draft is not saved"

## Clarifications

### Session 2026-02-07

- Q: How should the system handle save conflicts when the same draft is edited in multiple sessions? → A: Reject stale save attempts and require reload before saving.
- Q: What submission content must be included when a draft is saved? → A: Save all entered submission content, including uploaded files and metadata.
- Q: What draft model should be used for repeated saves? → A: Maintain automatic version history with restore support.
- Q: How long should draft versions be retained? → A: Keep all draft versions until final submission, then retain only the latest draft version.
- Q: Who can view and restore draft versions? → A: The submission owner and conference administrators.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-05]
- **Source Use Case Files**: [`Use Cases/UC-05.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-05-AS.md`]
- **Coverage Target**: Acceptance execution and companion tests target 100% line coverage for in-scope project-owned JavaScript; any shortfall requires justification, remediation steps, and an approved exception below 95%.
- **Traceability Commitment**: Every scenario and requirement below cites `UC-05` and `UC-05-AS`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Save In-Progress Draft (Priority: P1)

As an author, I can save an incomplete submission so I do not lose work before final submission.

**Mapped Use Case(s)**: [UC-05]  
**Mapped Acceptance Suite(s)**: [UC-05-AS]

**Why this priority**: Saving partial work is the core value of this feature and prevents re-entry of submission content.

**Independent Test**: Start a submission, enter partial data, choose save, and verify the draft is stored with a success confirmation.

**Acceptance Scenarios**:

1. **Given** an author has a submission in progress with partial data, **When** the author selects save, **Then** the system stores the current draft state and confirms the save.
2. **Given** an author has already saved a draft and makes additional edits, **When** the author selects save again, **Then** the system stores the updated draft state as the latest version while retaining previous draft versions.
3. **Given** an author has entered metadata and uploaded files in an in-progress submission, **When** the author saves a draft, **Then** the system preserves all entered metadata and uploaded files in the saved draft state.

---

### User Story 2 - Protect Data During Save Errors (Priority: P2)

As an author, I receive clear feedback when saving fails so I can retry without assuming my draft was stored.

**Mapped Use Case(s)**: [UC-05]  
**Mapped Acceptance Suite(s)**: [UC-05-AS]

**Why this priority**: Error handling prevents silent data loss and aligns with the failed-end condition in `UC-05`.

**Independent Test**: Force a save error during an in-progress submission and verify no new draft is stored and the user sees a failure message.

**Acceptance Scenarios**:

1. **Given** a system error occurs during save, **When** the author selects save, **Then** the system does not store the draft and shows an explicit failure message.
2. **Given** a previously saved draft exists, **When** a later save attempt fails, **Then** the previously saved draft remains available and unchanged.
3. **Given** the same draft is open in two sessions and one session saves newer changes, **When** the other session attempts to save older state, **Then** the system rejects the stale save and prompts the author to reload the latest draft.

---

### User Story 3 - Resume Work From Saved Draft (Priority: P3)

As an author, I can reopen a saved draft later and continue editing from where I left off.

**Mapped Use Case(s)**: [UC-05]  
**Mapped Acceptance Suite(s)**: [UC-05-AS]

**Why this priority**: Resuming later editing completes the intended benefit of saving incomplete submissions.

**Independent Test**: Save a draft multiple times, leave the submission flow, return later, and verify the latest draft loads with the ability to restore a previous version.

**Acceptance Scenarios**:

1. **Given** a saved draft exists for an author submission, **When** the author returns to edit later, **Then** the system loads the preserved draft state.
2. **Given** a saved draft exists, **When** the author continues editing and saves again, **Then** the system preserves the newest state for future editing.
3. **Given** multiple saved draft versions exist, **When** the author chooses an earlier version to restore, **Then** the system restores that selected version for continued editing.
4. **Given** a conference administrator needs to assist with a submission, **When** the administrator views or restores a draft version, **Then** the system allows the action.
5. **Given** a non-owner user without administrator privileges, **When** that user attempts to view or restore a draft version, **Then** the system denies the action.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-05 | UC-05-AS | Submission draft model/state management |
| FR-002 | UC-05 | UC-05-AS | Save draft interaction flow/controller |
| FR-003 | UC-05 | UC-05-AS | Author submission view feedback |
| FR-004 | UC-05 | UC-05-AS | Save error handling and messaging |
| FR-005 | UC-05 | UC-05-AS | Draft version/state integrity rules |
| FR-006 | UC-05 | UC-05-AS | Draft retrieval/loading flow |
| FR-007 | UC-05 | UC-05-AS | Acceptance and coverage evidence generation |
| FR-008 | UC-05 | UC-05-AS | Draft conflict detection and stale-save validation |
| FR-009 | UC-05 | UC-05-AS | Draft version history and restore behavior |
| FR-010 | UC-05 | UC-05-AS | Draft version retention lifecycle |
| FR-011 | UC-05 | UC-05-AS | Draft version access control |

### Edge Cases

- Author saves with only minimal required draft information entered.
- Two save actions are triggered in rapid succession from the same draft.
- A save fails after a prior successful save; prior draft must remain intact.
- A save fails because of a transient system error and the author retries immediately.
- The same draft is edited in parallel sessions and one save attempt is stale.
- An author restores an earlier draft version after a newer save exists.
- Final submission occurs after many saved draft versions exist.
- A non-owner without administrator privileges attempts to view or restore draft versions.
- The author resumes editing after a long gap and expects the last successful draft state.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-05 / UC-05-AS)**: The system MUST allow an author with an in-progress submission to trigger a save action at any point before final submission.
- **FR-002 (UC-05 / UC-05-AS)**: When save succeeds, the system MUST preserve all current submission draft content for later editing, including entered metadata and uploaded files.
- **FR-003 (UC-05 / UC-05-AS)**: After each successful save, the system MUST provide clear confirmation that the draft was saved.
- **FR-004 (UC-05 / UC-05-AS)**: If a system error occurs during save, the system MUST indicate that the draft was not saved and instruct the author to retry.
- **FR-005 (UC-05 / UC-05-AS)**: A failed save attempt MUST NOT overwrite or corrupt the most recent previously saved draft.
- **FR-006 (UC-05 / UC-05-AS)**: The system MUST allow the author to reopen and continue editing from the latest successfully saved draft state by default.
- **FR-007 (UC-05 / UC-05-AS)**: Delivery evidence MUST include passing results for `UC-05-AS` and coverage evidence that meets constitution thresholds for in-scope project-owned JavaScript.
- **FR-008 (UC-05 / UC-05-AS)**: If the draft has been updated elsewhere since the author loaded it, the system MUST reject the stale save attempt and require reloading the latest draft before saving again.
- **FR-009 (UC-05 / UC-05-AS)**: The system MUST retain draft version history across repeated saves and allow the author to restore a selected prior version.
- **FR-010 (UC-05 / UC-05-AS)**: The system MUST retain all draft versions while a submission is in progress and, once final submission is completed, retain only the latest draft version.
- **FR-011 (UC-05 / UC-05-AS)**: The system MUST allow only the submission owner and conference administrators to view or restore draft versions, and MUST deny these actions for all other users.

### Assumptions

- Author authentication and authorization are handled by existing capabilities outside this feature.
- A submission already exists in an editable in-progress state before draft saving is attempted.
- Retention timing for the single latest post-submission draft version follows existing system policy outside this feature.

### Dependencies

- Existing author submission workflow that provides an in-progress submission context.
- Existing user-facing messaging pattern for success and error notifications.
- Existing role and permission controls that identify conference administrators.
- Availability of the mapped acceptance suite file `Acceptance Tests/UC-05-AS.md`.

### Key Entities *(include if feature involves data)*

- **Draft Submission**: The saved, editable state of an author’s incomplete paper submission, including entered metadata and uploaded files.
- **Draft Version**: A timestamped snapshot of a draft submission captured at each successful save and available for later restore.
- **Draft Version Access Role**: Authorization role determining who can view or restore draft versions (`submission owner` and `conference administrator` only).
- **Draft Save Attempt**: A single author-initiated action to persist current submission progress, resulting in success or failure.
- **Draft Save Outcome**: User-visible result of a save attempt, including success confirmation or explicit failure notification.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of scenarios in `Acceptance Tests/UC-05-AS.md` pass without modifications.
- **SC-002**: At least 95% of author-initiated save attempts complete successfully during normal system operation.
- **SC-003**: 100% of failed save attempts show an explicit message that the draft was not saved.
- **SC-004**: 100% of successfully saved drafts can be reopened later with preserved submission state.
- **SC-005**: At least 90% of authors in validation testing can save and later resume a partial submission without assistance.
- **SC-006**: 100% of stale save attempts in concurrent-edit scenarios are rejected without overwriting newer draft state.
- **SC-007**: 100% of restored draft versions match the selected saved version content at restore time.
- **SC-008**: 100% of in-progress submissions retain complete draft version history, and 100% of finalized submissions retain only the latest draft version.
- **SC-009**: 100% of draft version view/restore attempts by submission owners and conference administrators succeed when authorized, and 100% of unauthorized attempts are denied.
