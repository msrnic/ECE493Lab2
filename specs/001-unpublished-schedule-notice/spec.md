# Feature Specification: View Final Schedule

**Feature Branch**: `001-unpublished-schedule-notice`
**Created**: 2026-02-08
**Status**: Draft
**Input**: User description: "Main Success Scenario: 1. Author logs in 2. Author views schedule Extensions: * **2a**: Schedule unpublished * **2a1**: System displays notice"

## Clarifications

### Session 2026-02-08

- Q: What schedule scope should an author see when published? → A: Show the full conference schedule and highlight the author's session(s).
- Q: How should schedule times be presented to authors? → A: Show both conference and local time zones.
- Q: What should define the author's "local" time zone for display? → A: Use the current device/browser time zone automatically.
- Q: Who is allowed to access this "author final schedule" view? → A: Anyone can access when published.
- Q: What should happen when an unauthenticated viewer opens the schedule while it is unpublished? → A: Show the unpublished-schedule notice to anyone without requiring login.

## Constitution Alignment *(mandatory)*

- **In-Scope Use Cases**: [UC-15]
- **Source Use Case Files**: [`Use Cases/UC-15.md`]
- **Mapped Acceptance Suites**: [`Acceptance Tests/UC-15-AS.md`]
- **Coverage Target**: 100% line coverage for in-scope project-owned code; below 95% requires approved exception.
- **Traceability Commitment**: Every scenario and requirement below cites the in-scope use case and acceptance suite.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Published Final Schedule (Priority: P1)

As a conference viewer, I want to view the full final conference schedule when it is published, and as an authenticated author I want my own session visibly highlighted with times shown in both conference and local time zones, so I can understand presentation timing in context.

**Mapped Use Case(s)**: [UC-15]
**Mapped Acceptance Suite(s)**: [UC-15-AS]

**Why this priority**: This is the core user value of the feature and the primary success path.

**Independent Test**: Can be tested by opening the schedule while unauthenticated when schedule status is published to confirm full schedule visibility, then opening it as an authenticated author to confirm session highlighting and dual time-zone display.

**Acceptance Scenarios**:

1. **Given** a published schedule, **When** any viewer opens the final schedule view, **Then** the full final schedule is displayed.
2. **Given** an authenticated author and a published schedule with assigned presentation information, **When** the author views the schedule, **Then** the author can see assigned presentation details, identify them via highlight treatment, and view each session time in both conference and local time zones.

---

### User Story 2 - Show Unpublished Notice (Priority: P2)

As a schedule viewer, I want a clear notice when the schedule is not yet published so I understand why schedule details are unavailable.

**Mapped Use Case(s)**: [UC-15]
**Mapped Acceptance Suite(s)**: [UC-15-AS]

**Why this priority**: This prevents confusion and avoids exposing unfinished scheduling information.

**Independent Test**: Can be fully tested by opening the schedule while unauthenticated and schedule status is unpublished, and confirming a notice appears without login and without schedule details.

**Acceptance Scenarios**:

1. **Given** an unauthenticated viewer and an unpublished schedule, **When** the viewer opens the final schedule view, **Then** the system displays an unpublished-schedule notice without requiring login.
2. **Given** a viewer who has previously viewed a published schedule, **When** schedule status changes to unpublished and the viewer refreshes the view, **Then** the notice is shown and schedule details are not shown.

## Traceability Matrix *(mandatory)*

| Requirement ID | Use Case ID(s) | Acceptance Suite ID(s) | Planned Code Areas |
|----------------|----------------|-------------------------|--------------------|
| FR-001 | UC-15 | UC-15-AS | Published schedule access policy |
| FR-002 | UC-15 | UC-15-AS | Published schedule display behavior |
| FR-003 | UC-15 | UC-15-AS | Author session highlighting in published schedule |
| FR-004 | UC-15 | UC-15-AS | Unpublished schedule notice behavior |
| FR-005 | UC-15 | UC-15-AS | Visibility control for unpublished state |
| FR-006 | UC-15 | UC-15-AS | Public published access and personalization behavior |
| FR-007 | UC-15 | UC-15-AS | Behavioral consistency with mapped acceptance suite |
| FR-008 | UC-15 | UC-15-AS | Dual time-zone schedule display |
| FR-009 | UC-15 | UC-15-AS | Public unpublished notice access behavior |

### Edge Cases

- An unauthenticated viewer opens the schedule while it is published.
- An unauthenticated viewer opens the schedule while it is unpublished.
- The publication status changes while the author is actively viewing the schedule page.
- The schedule is marked as published but contains no entries for the current author, so no session is highlighted.
- A direct link to the schedule view is accessed before publication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (UC-15 / UC-15-AS)**: When the schedule is published, the system MUST allow any viewer (authenticated or unauthenticated) to access the final schedule view.
- **FR-002 (UC-15 / UC-15-AS)**: When the schedule is published, the system MUST display the full final conference schedule to the viewer.
- **FR-003 (UC-15 / UC-15-AS)**: When the schedule is published and the viewer is an authenticated author with assigned session(s), the system MUST visibly highlight the author's own session(s) within the full schedule.
- **FR-004 (UC-15 / UC-15-AS)**: When the schedule is unpublished, the system MUST display a clear notice that the final schedule is not yet available.
- **FR-005 (UC-15 / UC-15-AS)**: While the schedule is unpublished, the system MUST prevent display of final schedule entries.
- **FR-006 (UC-15 / UC-15-AS)**: For published schedules, unauthenticated viewers MUST still receive full schedule visibility, while author-specific highlighting applies only when an authenticated author context exists.
- **FR-007 (UC-15 / UC-15-AS)**: The system MUST satisfy both mapped acceptance outcomes: published schedules are shown and unpublished schedules show a notice.
- **FR-008 (UC-15 / UC-15-AS)**: When the schedule is published, the system MUST display session times in both the conference time zone and the viewer's local time zone, where local time zone is determined automatically from the current device/browser time zone.
- **FR-009 (UC-15 / UC-15-AS)**: When the schedule is unpublished, the system MUST allow unauthenticated viewers to access the schedule view and receive the unpublished-schedule notice without a login requirement.

### Key Entities *(include if feature involves data)*

- **Viewer Context**: Represents whether the current viewer is unauthenticated, authenticated non-author, or authenticated author.
- **Author Session**: Represents whether an author identity is authenticated for personalized schedule highlighting.
- **Final Schedule**: Represents full conference presentation assignments and timing details shown when publication status is published.
- **Session Time Display**: Represents each session time shown in conference time and local time for the viewer, with local time derived from the device/browser time zone.
- **Author Session Highlight**: Represents the visual indicator that marks the current author's assigned session(s) within the full schedule.
- **Schedule Publication Status**: Represents whether the final schedule is published or unpublished and determines what the viewer can view.
- **Schedule Availability Notice**: Represents the message shown to viewers when final schedule information is unavailable due to unpublished status.

### Assumptions

- Author authentication already exists and is not changed by this feature.
- Publication status is controlled by existing schedule management workflows and is reliably available to the viewing flow.
- The conference uses a single final schedule publication status at a time.
- The viewing device/browser provides a usable time zone for local-time conversion.

### Dependencies

- Availability of an authenticated author login flow for personalized highlighting behavior.
- Availability of a maintained schedule publication status from conference administration processes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of unauthenticated viewers can open and view published schedule content in a single navigation to the schedule view.
- **SC-002**: 100% of authenticated test authors can reach a schedule outcome (published schedule or unpublished notice) within 2 actions after login.
- **SC-003**: In published-state testing, 100% of attempts show the full final schedule, and 100% of attempts for authors with assigned sessions show those session(s) highlighted.
- **SC-004**: In unpublished-state testing, 100% of attempts from both authenticated and unauthenticated viewers show the unpublished-schedule notice and 0 schedule entries.
- **SC-005**: 100% of scenarios in `UC-15-AS` pass without modifying mapped acceptance text.
- **SC-006**: During stakeholder review, at least 95% of sampled authors report the schedule availability state is clear on first view.
- **SC-007**: In published-state testing, 100% of displayed sessions include both conference-time and local-time values, with local-time values matching the viewing device/browser time zone.
