# Implementation Plan: Reviewer Paper Access

**Branch**: `[001-reviewer-paper-access]` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/spec.md`

## Summary

Implement UC-08 reviewer paper access using HTML/CSS/JavaScript and strict MVC separation. The design enforces entitlement checks on every paper-file request, returns explicit outcomes for revoked and temporary-unavailable states, throttles repeated temporary-outage retries to one request per 5 seconds per reviewer-paper, and records all outcomes for authorized editor/support/admin review.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 modules)
**Primary Dependencies**: Browser DOM APIs, Fetch API, FormData API, Node.js `node:test` for automated tests, Istanbul/c8-compatible line-coverage reporting
**Storage**: Server-side persistent data for reviewer-paper entitlement and access-attempt records; client keeps only transient UI state in memory
**Testing**: Acceptance tests mapped to `Acceptance Tests/UC-08-AS.md` in `tests/acceptance/uc-08-as.test.js`, SC-002 timing validation in `tests/acceptance/uc-08-performance.test.js`, and unit tests for models/controllers/views (including outage retry control) in `tests/unit/`; coverage report for in-scope JavaScript tied to UC-08
**Target Platform**: Modern desktop and mobile browsers (Chrome, Firefox, Safari, Edge)
**Project Type**: web (MVC)
**Performance Goals**: Meet SC-002 via measured p95 over >=100 authorized selection-to-render events (<=3 seconds) and SC-008/SC-011 (post-revocation requests denied on next request)
**Constraints**: Map all planned behavior to the governed current text of `Use Cases/UC-08.md` and `Acceptance Tests/UC-08-AS.md`; enforce revocation at access time on each request; temporary outages must support immediate retry plus 1-per-5-second throttle for repeated retries; production-facing behavior must remain HTML/CSS/JavaScript with MVC boundaries preserved
**Scale/Scope**: UC-08 only; 2 user-facing views (reviewer paper-access screen and access-record viewer), 4 controllers, 4 models, 4 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

**Gate Result (Pre-Research)**: PASS

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── openapi.yaml
└── tasks.md                # Phase 2 output; not created in this command
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── src/
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── reviewer-paper-access.css
│   │   └── js/
│   │       └── app.js
│   ├── models/
│   │   ├── reviewer-access-entitlement.model.js
│   │   ├── paper-file-bundle.model.js
│   │   ├── paper-access-attempt.model.js
│   │   └── outage-retry-window.model.js
│   ├── views/
│   │   ├── reviewer-paper-access.view.js
│   │   ├── access-denied.view.js
│   │   ├── temporary-unavailable.view.js
│   │   └── access-records.view.js
│   ├── controllers/
│   │   ├── reviewer-paper-access.controller.js
│   │   ├── paper-file-request.controller.js
│   │   ├── outage-retry.controller.js
│   │   └── access-records.controller.js
│   └── services/
│       └── paper-access-api.service.js
└── tests/
    ├── acceptance/
    │   ├── uc-08-as.test.js
    │   └── uc-08-performance.test.js
    └── unit/
        ├── controllers/
        ├── models/
        └── views/
```

**Structure Decision**: Use a single `src/` MVC web app with explicit model/view/controller modules and a thin service layer for API calls. This preserves constitution-mandated MVC boundaries while keeping reviewer access, outage handling, and access-record viewing traceable to UC-08 requirements.

## Phase Outputs

- Phase 0 research artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/research.md`
- Phase 1 design artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/data-model.md`
- Phase 1 contract artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/contracts/openapi.yaml`
- Phase 1 quickstart artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/quickstart.md`

## Post-Design Constitution Check

- [x] Planned behavior-to-use-case mapping remains UC-08 only; FR-001 through FR-011 remain traceable.
- [x] `Acceptance Tests/UC-08-AS.md` (current governed revision) remains the authoritative acceptance suite with no reinterpretation.
- [x] Planned implementation stack remains HTML/CSS/JavaScript only for production-facing behavior.
- [x] MVC boundaries remain explicit in planned paths (`src/models`, `src/views`, `src/controllers`).
- [x] Contract and data model preserve per-request entitlement checks and revocation behavior.
- [x] Coverage plan continues targeting 100% line coverage for in-scope project-owned JavaScript.
- [x] SC-002 measurement method and artifact paths are defined (`tests/acceptance/uc-08-performance.test.js`, `tests/acceptance/uc-08-performance.md`).
- [x] No coverage exception below 100% is planned; if needed later, remediation details are required.
- [x] Regression plan includes rerunning previously passing acceptance suites before merge.

**Gate Result (Post-Design)**: PASS

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | Not applicable | Constitution constraints are satisfied without exceptions |
