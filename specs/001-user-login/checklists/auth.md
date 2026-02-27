# Auth Requirements Checklist: User Login Access

**Purpose**: Unit-test the quality of authentication and login requirements for completeness, clarity, consistency, measurability, and scenario coverage.
**Created**: 2026-02-08
**Feature**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md`

**Note**: This checklist validates requirement quality, not implementation behavior.

## Requirement Completeness

- [ ] CHK001 Are requirements defined for account state prerequisites (for example disabled or suspended accounts) during credential validation? [Gap, Spec §FR-003]
- [ ] CHK002 Are requirements documented for how logged-out users discover and access the login entry point from all relevant unauthenticated paths? [Completeness, Spec §FR-001]
- [ ] CHK003 Are requirements specified for the exact temporary-block message content shown during the 10-minute lock window? [Gap, Spec §FR-008]
- [ ] CHK004 Are requirements documented for session termination outcomes after successful login (timeout, explicit logout, invalidation) within this feature boundary? [Gap, Spec §FR-004, Spec §Assumptions]
- [ ] CHK005 Are requirements defined for input normalization rules (email case and whitespace handling) before validation against account records? [Gap, Spec §FR-002, Spec §FR-003]

## Requirement Clarity

- [ ] CHK006 Is "registered account records" defined precisely enough to identify the authoritative credential source? [Ambiguity, Spec §FR-003]
- [ ] CHK007 Is "grant access to the dashboard" clarified with explicit state and routing outcomes? [Clarity, Spec §FR-004]
- [ ] CHK008 Is the missing-credentials error requirement defined with exact wording or format rather than subjective phrasing? [Ambiguity, Spec §Edge Cases]
- [ ] CHK009 Is "immediately" in failed-attempt reset defined with an objective timing boundary? [Ambiguity, Spec §FR-010]
- [ ] CHK010 Is the "no additional authentication factor" scope boundary precise about related controls (for example challenge prompts) to avoid interpretation drift? [Clarity, Spec §FR-009, Spec §Assumptions]

## Requirement Consistency

- [ ] CHK011 Do lockout requirements stay consistent across Clarifications, FR-008, Edge Cases, and SC-006 for threshold, duration, and user-facing response? [Consistency, Spec §Clarifications, Spec §FR-008, Spec §Edge Cases, Spec §SC-006]
- [ ] CHK012 Do invalid-credential message requirements align exactly between FR-005, Edge Cases, and SC-003? [Consistency, Spec §FR-005, Spec §Edge Cases, Spec §SC-003]
- [ ] CHK013 Do logged-out state requirements (FR-006) align with the already-authenticated redirect edge case without contradictory session expectations? [Consistency, Spec §FR-006, Spec §Edge Cases]
- [ ] CHK014 Do user-story acceptance scenarios and key entity definitions use a consistent meaning for persistent authenticated state? [Consistency, Spec §User Scenarios & Testing, Spec §Key Entities]

## Acceptance Criteria Quality

- [ ] CHK015 Are all success criteria objectively measurable without adding unstated reviewer assumptions? [Measurability, Spec §SC-001, Spec §SC-008]
- [ ] CHK016 Is the measurement method for SC-002 explicitly defined (timing start/end points, sample size, and environment)? [Gap, Spec §SC-002]
- [ ] CHK017 Are functional requirements traceably covered by acceptance criteria without orphaned or over-broad criteria? [Traceability, Spec §Traceability Matrix, Spec §Requirements, Spec §Success Criteria]
- [ ] CHK018 Is there an acceptance criterion that evaluates temporary-block message quality in addition to block timing behavior? [Gap, Spec §FR-008, Spec §SC-006]

## Scenario Coverage

- [ ] CHK019 Are exception-path requirements for dependency outages (authentication capability, account records, dashboard destination) defined or explicitly excluded? [Coverage, Gap, Spec §Dependencies]
- [ ] CHK020 Are recovery requirements specified for attempts made immediately after the lockout window expires? [Coverage, Gap, Spec §FR-008]
- [ ] CHK021 Are repeated fail-lockout-success cycles covered with explicit state-transition requirements to prevent ambiguous counter behavior? [Coverage, Spec §FR-008, Spec §FR-010]
- [ ] CHK022 Are requirements defined for unauthenticated direct access attempts to dashboard routes before login? [Coverage, Gap, Spec §FR-004, Spec §Assumptions]

## Edge Case Coverage

- [ ] CHK023 Are boundary conditions for the fifth failed attempt and the first post-expiry retry explicitly specified? [Edge Case, Spec §FR-008]
- [ ] CHK024 Are concurrent login attempt requirements for the same account defined, including counter and block-window consistency? [Edge Case, Gap, Spec §FR-008]
- [ ] CHK025 Are malformed and blank credential scenarios specified with unambiguous validation and response expectations? [Edge Case, Spec §Edge Cases, Spec §FR-002]

## Non-Functional Requirements

- [ ] CHK026 Are security requirements defined for credential handling in transit and in storage within feature scope? [Non-Functional, Gap, Spec §FR-002]
- [ ] CHK027 Are resiliency and availability requirements defined for external dependencies used during login validation? [Non-Functional, Gap, Spec §Dependencies]
- [ ] CHK028 Are accessibility requirements specified for invalid-credential and temporary-block message presentation states? [Non-Functional, Gap, Spec §FR-005, Spec §FR-008]

## Dependencies & Assumptions

- [ ] CHK029 Are out-of-scope assumptions (MFA and admin unlock) tied to explicit boundary statements that prevent accidental omission of required behavior? [Assumption, Spec §Assumptions, Spec §FR-009]
- [ ] CHK030 Are dependency expectations measurable (latency, uptime, or error-contract assumptions) for account and authentication sources? [Dependency, Gap, Spec §Dependencies]
- [ ] CHK031 Is the dashboard-access assumption reconciled with explicit session lifetime and renewal requirement coverage? [Assumption, Gap, Spec §Assumptions, Spec §Key Entities]

## Ambiguities & Conflicts

- [ ] CHK032 Is traceability structure sufficient for non-FR content (edge cases, assumptions, dependencies), or are additional identifiers required? [Traceability, Gap, Spec §Traceability Matrix]
- [ ] CHK033 Are subjective terms such as "clear," "successfully," and "without external assistance" defined with measurable criteria? [Ambiguity, Spec §User Stories, Spec §SC-004]
- [ ] CHK034 Are precedence rules defined if use-case-level invalid-credential behavior and feature-level lockout behavior overlap? [Conflict, Spec §Clarifications, Spec §FR-005, Spec §FR-008]
