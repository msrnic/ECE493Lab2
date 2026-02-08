# Draft Requirements Quality Checklist: Save Paper Draft

**Purpose**: Unit tests for requirement quality covering completeness, clarity, consistency, measurability, and scenario coverage for UC-05 draft behavior.
**Created**: 2026-02-08
**Feature**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/spec.md`

## Requirement Completeness

- [ ] CHK001 Are save-trigger requirements defined for all pre-final-submission states, including metadata-only and file-inclusive drafts? [Completeness, Spec §FR-001, Spec §FR-002]
- [ ] CHK002 Are requirements explicit about what "all current submission draft content" includes beyond metadata/files (for example removed files or reordered data)? [Gap, Spec §FR-002]
- [ ] CHK003 Are restore requirements defined for whether a restore action creates a new latest version or mutates an existing one? [Gap, Spec §FR-009]
- [ ] CHK004 Are retention requirements explicit about when pruning executes after final submission and what trigger initiates it? [Gap, Spec §FR-010]
- [ ] CHK005 Are view and restore requirements fully documented for both submission owners and conference administrators? [Completeness, Spec §FR-011]

## Requirement Clarity

- [ ] CHK006 Is "clear confirmation" quantified with required message content, visibility duration, and placement expectations? [Clarity, Spec §FR-003]
- [ ] CHK007 Is "system error" decomposed into explicit failure classes with unambiguous user-facing messaging requirements per class? [Ambiguity, Spec §FR-004]
- [ ] CHK008 Is "require reloading the latest draft" defined with precise wording and required next-step guidance? [Clarity, Spec §FR-008]
- [ ] CHK009 Is "latest saved draft state by default" unambiguous for near-simultaneous saves across sessions? [Ambiguity, Spec §FR-006, Spec §FR-008]
- [ ] CHK010 Are "conference administrators" mapped to authoritative role definitions to avoid interpretation drift? [Assumption, Spec §FR-011, Spec §Dependencies]

## Requirement Consistency

- [ ] CHK011 Do success-rate targets and failure guarantees align without contradiction across save success and failure requirements? [Consistency, Spec §FR-004, Spec §FR-005, Spec §SC-002, Spec §SC-003]
- [ ] CHK012 Are retention expectations consistent between clarification notes and functional requirements lifecycle language? [Consistency, Spec §Clarifications, Spec §FR-010]
- [ ] CHK013 Do rapid-successive-save edge cases align with stale-save rejection requirements? [Consistency, Spec §Edge Cases, Spec §FR-008]
- [ ] CHK014 Are authorization assumptions consistent with strict access control requirements for view/restore operations? [Consistency, Spec §Assumptions, Spec §FR-011]
- [ ] CHK015 Does the traceability matrix include every requirement listed in the requirements section without omissions or mismatches? [Traceability, Spec §Traceability Matrix, Spec §Requirements]

## Acceptance Criteria Quality

- [ ] CHK016 Are measurable outcomes tied to explicit measurement windows, sampling methods, and data sources? [Measurability, Spec §Success Criteria]
- [ ] CHK017 Can "preserved submission state" be objectively assessed using explicit equivalence criteria? [Measurability, Spec §SC-004]
- [ ] CHK018 Are pass/fail boundaries defined for retention pruning behavior, including acceptable completion timing after finalization? [Gap, Spec §SC-008, Spec §FR-010]
- [ ] CHK019 Are authorization outcomes separately measurable for version viewing and version restoration actions? [Clarity, Spec §SC-009, Spec §FR-011]

## Scenario Coverage

- [ ] CHK020 Are alternate-flow requirements specified for retry-after-failure, including expected user guidance content? [Coverage, Spec §User Story 2, Spec §FR-004]
- [ ] CHK021 Are recovery-flow requirements documented for partially processed restore attempts that cannot complete? [Gap, Exception Flow]
- [ ] CHK022 Are non-functional scenario requirements documented for long inactivity or session-expiry conditions during save attempts? [Gap, Non-Functional]
- [ ] CHK023 Are administrator-assistance scenarios complete regarding author visibility and ownership implications after admin restore actions? [Coverage, Spec §User Story 3]

## Edge Case Coverage

- [ ] CHK024 Are file-related boundary requirements defined for unsupported formats, oversize payloads, and integrity mismatches? [Gap, Spec §FR-002]
- [ ] CHK025 Are duplicate save-trigger scenarios defined with deterministic requirement outcomes? [Coverage, Spec §Edge Cases]
- [ ] CHK026 Is expected behavior specified when no prior draft exists and latest-draft retrieval is requested? [Gap, Spec §FR-006]
- [ ] CHK027 Are failure-handling requirements defined for retention-pruning errors to prevent inconsistent deletion states? [Gap, Spec §FR-010]

## Non-Functional Requirements

- [ ] CHK028 Are performance requirements explicitly specified for save, load, version listing, and restore interactions? [Gap, Plan §Technical Context]
- [ ] CHK029 Are auditability requirements defined for who accessed/restored versions and when? [Gap, Spec §FR-011]
- [ ] CHK030 Are accessibility requirements specified for save outcomes and draft-version history interactions? [Gap]

## Dependencies & Assumptions

- [ ] CHK031 Are dependency requirements defined for role/permission service behavior when upstream systems are degraded? [Dependency, Spec §Dependencies]
- [ ] CHK032 Is the assumption of an existing editable submission state validated with explicit missing/invalid-state requirements? [Assumption, Spec §Assumptions]
- [ ] CHK033 Are acceptance-suite dependencies explicitly version-pinned or governance-controlled to avoid moving-target interpretation? [Traceability, Spec §Constitution Alignment]

## Ambiguities & Conflicts

- [ ] CHK034 Is terminology clearly differentiated among "draft", "draft version", and "latest draft state" across all sections? [Ambiguity, Spec §Key Entities]
- [ ] CHK035 Do requirements reconcile "save at any point before final submission" with post-finalization retention constraints without overlap ambiguity? [Conflict, Spec §FR-001, Spec §FR-010]
- [ ] CHK036 Is the UC-05 open issue on draft expiration either resolved in this spec or explicitly marked out of scope with rationale? [Gap, Use Case §Open Issues]
