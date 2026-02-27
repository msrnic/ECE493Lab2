# Implementation Plan: Editor Review Visibility

**Branch**: `[001-view-paper-reviews]` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-paper-reviews/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-paper-reviews/spec.md`

## Summary

Implement UC-10 so assigned editors can view completed reviews for a selected paper, see a pending status when no completed reviews exist, view reviewer identities with each completed review, and create one-year audit records for every successful review-view access. Delivery is constrained to HTML for definition, CSS for style, and JavaScript for behavior within a strict Model-View-Controller architecture.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022), Node.js 20 LTS
**Primary Dependencies**: Browser DOM APIs, Fetch API, Express 5 REST routing, Jest 29, Supertest, c8 coverage tooling
**Storage**: Existing paper/review/editor-assignment persistence plus `review_access_audit` persistence with 365-day retention
**Testing**: Execute `Acceptance Tests/UC-10-AS.md` verbatim, add MVC unit/integration/performance tests, run scripted usability validation for SC-005, and enforce line coverage evidence with c8 and a 100% in-scope JavaScript target
**Target Platform**: Modern desktop and mobile browsers for UI; Node.js Linux runtime for API/controller execution
**Project Type**: web (MVC)
**Performance Goals**: Under 500 requests (70% authorized, 30% unavailable) with papers containing up to 100 reviews, keep `GET /api/papers/{paperId}/reviews` p95 latency at or below 5.0 seconds in CI
**Constraints**: Scope restricted to `Use Cases/UC-10.md` and `Acceptance Tests/UC-10-AS.md`; production behavior must remain in HTML/CSS/JavaScript; MVC boundaries must remain explicit; unauthorized requests must receive only the generic unavailable response
**Scale/Scope**: 1 editor review page, 1 review retrieval endpoint, 4 model modules, 2 controller modules, 1 HTML view, 1 CSS stylesheet, 1 client behavior script, and UC-10 acceptance/regression/performance/usability validation coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Research Gate Result: PASS

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan (N/A: no below-100% target planned).
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-paper-reviews/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── performance-report.md
├── usability-protocol.md
├── usability-results.md
├── contracts/
│   └── review-visibility.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── src/
│   ├── models/
│   │   ├── paper-model.js
│   │   ├── review-model.js
│   │   ├── editor-assignment-model.js
│   │   └── review-access-audit-model.js
│   ├── views/
│   │   └── editor-reviews.html
│   ├── controllers/
│   │   ├── review-page-controller.js
│   │   └── review-api-controller.js
│   └── assets/
│       ├── css/
│       │   └── editor-reviews.css
│       └── js/
│           └── editor-reviews.js
└── tests/
    ├── fixtures/
    │   └── review-visibility-fixtures.js
    ├── acceptance/
    │   └── uc-10-view-reviews.acceptance.test.js
    ├── integration/
    │   ├── review-api-controller.test.js
    │   └── review-api-performance.test.js
    └── unit/
        ├── review-model.test.js
        ├── editor-assignment-model.test.js
        └── review-access-audit-model.test.js
```

**Structure Decision**: A single web MVC layout is selected so `src/models` owns data and validation rules, `src/controllers` owns flow and request orchestration, `src/views` owns HTML structure, and `src/assets` holds isolated CSS style and client-side JavaScript behavior.

## Phase 0 Research Focus

- Validate best-practice handling for non-disclosing unauthorized responses.
- Validate review-completion filtering and pending status response shape.
- Validate audit retention design for one-year policy compliance.
- Validate MVC-aligned testing strategy that can prove acceptance behavior and 100% line coverage target.

## Phase 1 Design Outputs

- `data-model.md` defines entities, field constraints, relationships, and status transitions.
- `contracts/review-visibility.openapi.yaml` defines the review retrieval API contract for available, pending, and unavailable outcomes.
- `quickstart.md` defines implementation bootstrap, test execution, and manual validation steps aligned with UC-10-AS.
- `performance-report.md` and `usability-results.md` capture SC-002 and SC-005 validation evidence.

## Post-Design Constitution Check

### Post-Design Gate Result: PASS

- [x] Planned behavior remains mapped to `Use Cases/UC-10.md`.
- [x] Matching verification remains mapped to `Acceptance Tests/UC-10-AS.md`.
- [x] Contract and design artifacts preserve HTML/CSS/JavaScript stack and strict MVC layering.
- [x] Coverage and regression strategy still enforce 100% line target and block <95% without exception.
- [x] No constitution violations require complexity exceptions.

## Complexity Tracking

No constitution violations detected; no exception entries required.
