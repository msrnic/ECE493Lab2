# Implementation Plan: View Final Schedule

**Branch**: `001-unpublished-schedule-notice` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-unpublished-schedule-notice/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-unpublished-schedule-notice/spec.md`

## Summary

Implement UC-15 so any viewer can open the final schedule route, see a clear unpublished notice when publication status is `unpublished`, and see the full schedule when status is `published`. For authenticated authors, the same published schedule view highlights their assigned session(s). Time values are rendered in both conference and browser-local time zones. The implementation remains in HTML/CSS/JavaScript and separates Model, View, and Controller layers.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2023 modules)
**Primary Dependencies**: Browser DOM APIs, Fetch API, `Intl.DateTimeFormat` for time-zone formatting, Node.js 20 test tooling (`vitest`, `jsdom`, `c8`)
**Storage**: Read-only retrieval from existing conference API endpoints; no new persistence introduced by this feature
**Testing**: Automated checks mapped to `Acceptance Tests/UC-15-AS.md`, unit tests for model/controller/view logic, and `c8` line coverage evidence targeting 100% for in-scope JavaScript
**Target Platform**: Modern desktop and mobile browsers (latest Chrome, Firefox, Safari, Edge)
**Project Type**: web (MVC)
**Performance Goals**: Initial render of published schedule or unpublished notice in <= 1.0s p95 after API response; local/conference time formatting for 300 sessions in <= 100ms p95 on baseline laptop browser
**Constraints**: Must map to `Use Cases/UC-15.md` and `Acceptance Tests/UC-15-AS.md`; production behavior restricted to HTML/CSS/JavaScript; strict MVC boundaries; unpublished state must not expose schedule entries
**Scale/Scope**: UC-15 only; one schedule page; one schedule controller; one schedule model with supporting view-model transforms; one primary schedule view

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

**Gate Result (Pre-Phase 0)**: PASS

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-unpublished-schedule-notice/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── final-schedule.openapi.yaml
└── tasks.md                  # Phase 2 output; not generated in this command
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── src/
│   ├── models/
│   │   ├── final-schedule-model.js
│   │   └── viewer-context-model.js
│   ├── views/
│   │   └── final-schedule-view.js
│   ├── controllers/
│   │   └── final-schedule-controller.js
│   ├── services/
│   │   └── final-schedule-api.js
│   ├── assets/
│   │   ├── css/
│   │   │   └── final-schedule.css
│   │   └── js/
│   │       └── app.js
│   └── index.html
└── tests/
    ├── acceptance/
    │   └── uc-15-final-schedule.acceptance.test.js
    └── unit/
        ├── final-schedule-model.test.js
        ├── final-schedule-controller.test.js
        └── final-schedule-view.test.js
```

**Structure Decision**: Use a root-level MVC web layout where controllers orchestrate schedule flow, models own publication and time-zone transformation rules, and views handle markup rendering and styling hooks. Acceptance and unit tests live under `/tests` to align with constitution traceability and coverage gates.

## Post-Design Constitution Check

- [x] `Use Cases/UC-15.md` is the sole functional source and all planned behavior maps back to UC-15.
- [x] `Acceptance Tests/UC-15-AS.md` is mapped to acceptance verification in `/tests/acceptance/uc-15-final-schedule.acceptance.test.js`.
- [x] Stack remains HTML/CSS/JavaScript with no non-web production runtime introduced.
- [x] MVC boundaries are explicit in `/src/models`, `/src/views`, `/src/controllers`.
- [x] Traceability artifacts exist across `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `contracts/final-schedule.openapi.yaml`.
- [x] Coverage strategy remains 100% line coverage target with measured evidence via `c8`; any shortfall requires documented remediation.
- [x] Regression safety is preserved by requiring previously passing UC acceptance suites to stay green in CI.

**Gate Result (Post-Design)**: PASS

## Complexity Tracking

No constitution violations or exceptions are anticipated for this feature plan.
