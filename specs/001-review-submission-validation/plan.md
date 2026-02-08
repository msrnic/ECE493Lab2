# Implementation Plan: Review Submission Validation

**Branch**: `[001-review-submission-validation]` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/spec.md`

## Summary

Implement UC-09 review submission in strict MVC using HTML for definition, CSS for style, and JavaScript for behavior. The feature adds model-level required-field validation (including whitespace-only checks), controller-managed submission flow, and REST contracts that enforce access checks, reject resubmission after completion, and resolve concurrent submissions with a first-successful-submit rule while preserving entered values only within the active form session.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022), Node.js 20
**Primary Dependencies**: Express 4 (API routing), Vanilla DOM APIs (view rendering/events), Ajv 8 (shared validation schema), Vitest + Supertest + c8 (unit/integration/coverage)
**Storage**: Existing persistent review record store keyed by reviewer-paper assignment; failed validation remains transient in browser session and is not persisted
**Testing**: Acceptance validation against `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-09-AS.md`, plus JavaScript unit tests (model/controller), API integration tests, and coverage reporting targeting 100% line coverage
**Target Platform**: Modern desktop and mobile browsers for UI; Linux-hosted Node.js runtime for API
**Project Type**: web (MVC)
**Performance Goals**: Missing-field feedback shown in <100ms p95 after submit attempt; successful/failed submit response in <500ms p95 under normal load; duplicate concurrent submits resolved in one request round-trip
**Constraints**: Must trace all behavior to `UC-09` and `UC-09-AS`; production-facing code must be HTML/CSS/JavaScript; strict MVC separation is required; no anonymity-policy changes; no persistent draft writes on validation failure
**Scale/Scope**: 1 use case (UC-09), 1 review form page/view, 1 submission controller, 3 model modules (submission payload, persisted review record, validation feedback), 2 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Evaluation

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

### Post-Phase 1 Design Re-check

- [x] Every designed behavior in `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` maps to `Use Cases/UC-09.md`.
- [x] `Acceptance Tests/UC-09-AS.md` remains the authoritative done criteria for this feature.
- [x] Designed implementation remains HTML/CSS/JavaScript only for production-facing behavior.
- [x] MVC file boundaries are explicit and maintain separation of concerns.
- [x] Coverage plan still targets 100% JS line coverage for in-scope modules.
- [x] No planned coverage exception below 100%; if a gap appears, remediation evidence is required and must stay >=95% unless approved.
- [x] No coverage-below-95% exception is requested.
- [x] Regression verification includes rerunning existing passing acceptance suites before merge.

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── review-submission.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/
/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/
/home/m_srnic/ece493/lab2/ECE493Lab2/src/
├── models/
│   ├── review-submission-model.js
│   ├── review-record-model.js
│   └── validation-feedback-model.js
├── views/
│   ├── review-form-view.js
│   └── templates/
│       └── review-form.html
├── controllers/
│   └── review-submission-controller.js
├── api/
│   └── review-submission-routes.js
├── assets/
│   ├── css/
│   │   └── review-form.css
│   └── js/
│       └── review-form-page.js
└── index.html

/home/m_srnic/ece493/lab2/ECE493Lab2/tests/
├── acceptance/
│   └── uc-09-submit-review.acceptance.test.js
├── integration/
│   └── review-submission-api.integration.test.js
└── unit/
    ├── models/
    └── controllers/
```

**Structure Decision**: Use a single web MVC layout where models encapsulate validation/state rules, views own HTML rendering and feedback display, and controllers orchestrate submit flow and endpoint interaction. CSS is isolated under `assets/css`, and API route handling remains separated from view logic to preserve constitution-mandated boundaries.

## Complexity Tracking

No constitution violations or exemptions are planned.
