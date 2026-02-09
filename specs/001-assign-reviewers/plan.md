# Implementation Plan: Reviewer Assignment Workflow

**Branch**: `[001-assign-reviewers]` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-assign-reviewers/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-assign-reviewers/spec.md`

## Summary

Implement UC-06 and UC-07 with a browser-based MVC workflow where editors assign reviewers to submitted papers, replace unavailable or conflicted reviewers, and confirm assignments with first-confirmation-wins concurrency handling. The design uses HTML/CSS/JavaScript modules, REST contracts for assignment and invitation processing, and acceptance-plus-coverage validation targeting 100% project-owned JavaScript line coverage.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 modules)
**Primary Dependencies**: Browser DOM APIs, Fetch API, server-side JavaScript REST services, JSON over HTTP
**Storage**: Backend API persistence for papers, assignment attempts, reviewer assignments, and invitation delivery records
**Testing**: Acceptance validation for `Acceptance Tests/UC-06-AS.md` and `Acceptance Tests/UC-07-AS.md`, plus controller/model unit tests and coverage reporting for in-scope JavaScript
**Target Platform**: Modern desktop and mobile browsers
**Project Type**: web (MVC)
**Performance Goals**: Meet SC-002 (>=95% assignment attempts with available reviewers complete in under 2 minutes from selection to confirmation).
**Constraints**: Map all behavior to `Use Cases/UC-06.md` and `Use Cases/UC-07.md`; preserve strict MVC separation; enforce COI and availability blocking; preserve previous acceptance pass status
**Scale/Scope**: 2 in-scope UCs (UC-06, UC-07), 2 acceptance suites (UC-06-AS, UC-07-AS), 1 assignment page flow, ~4 models, ~2 views, ~2 controllers

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Research Gate Result**: PASS

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

**Post-Design Gate Result (after Phase 1 artifacts)**: PASS

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-assign-reviewers/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── src/
│   ├── models/
│   │   ├── PaperSubmissionModel.js
│   │   ├── ReviewerModel.js
│   │   ├── ReviewerAssignmentModel.js
│   │   └── ReviewInvitationModel.js
│   ├── views/
│   │   ├── AssignReviewersView.js
│   │   └── AssignmentOutcomeView.js
│   ├── controllers/
│   │   ├── ReviewerAssignmentController.js
│   │   └── InvitationController.js
│   ├── assets/
│   │   ├── css/
│   │   │   └── assign-reviewers.css
│   │   └── js/
│   │       └── assign-reviewers-page.js
│   └── index.html
└── tests/
    ├── acceptance/
    │   ├── uc06-assign-reviewers.acceptance.test.js
    │   └── uc07-review-invitation.acceptance.test.js
    └── unit/
        ├── models/
        └── controllers/
```

**Structure Decision**: Keep production code in `src/` with strict MVC boundaries (`src/models`, `src/views`, `src/controllers`) and separate static assets (`src/assets/css`, `src/assets/js`). Test code is isolated under `tests/` with explicit UC/AS mapping for acceptance coverage and targeted unit tests for model/controller logic.

## Complexity Tracking

No constitution violations or exceptions are required for this plan.
