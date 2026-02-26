# Implementation Plan: Public User Registration

**Branch**: `001-user-registration` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`

## Summary

Implement UC-01 registration end-to-end in a strict MVC web architecture using HTML/CSS/JavaScript. The feature will provide a public registration form, server-side validation (including password policy, duplicate-email checks, and throttling), pending account creation, and confirmation-email delivery with retry behavior when delivery initially fails.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020+)
**Primary Dependencies**: Browser DOM APIs, Fetch API, Node.js/Express HTTP layer, email provider adapter
**Storage**: Server-side persistence for UserAccount, EmailConfirmationToken, RegistrationAttempt, and EmailDeliveryJob records
**Testing**: Execute `Acceptance Tests/UC-01-AS.md` exactly as written, add unit/integration tests for models/controllers, and report line coverage for in-scope project-owned JavaScript
**Target Platform**: Modern desktop and mobile browsers
**Project Type**: web (MVC)
**Performance Goals**: Client-side validation feedback under 200ms p95; registration submit response under 1s p95 under normal load
**Constraints**: Scope must map to `Use Cases/UC-01.md` and `Acceptance Tests/UC-01-AS.md`, production behavior must remain in HTML/CSS/JavaScript, and MVC boundaries must remain explicit
**Scale/Scope**: UC scope: UC-01 only; UX scope: registration and confirmation views; planned implementation scope: 12-16 JavaScript modules across models, views, controllers, and browser assets

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

**Gate Status (Pre-Research)**: PASS

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/
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
│   ├── app.js
│   ├── server.js
│   ├── models/
│   │   ├── repository.js
│   │   ├── registration-validation.js
│   │   ├── email-normalization.js
│   │   ├── user-account-model.js
│   │   ├── email-confirmation-token-model.js
│   │   ├── confirmation-token-service.js
│   │   ├── registration-submission-model.js
│   │   ├── registration-attempt-model.js
│   │   └── email-delivery-job-model.js
│   ├── views/
│   │   ├── registration-view.js
│   │   └── registration-status-view.js
│   ├── controllers/
│   │   ├── registration-page-controller.js
│   │   ├── registration-controller.js
│   │   ├── confirmation-controller.js
│   │   └── email-delivery-service.js
│   ├── assets/
│   │   ├── css/
│   │   │   └── registration.css
│   │   └── js/
│   │       └── registration-form.js
│   └── index.html
└── tests/
    ├── acceptance/
    │   └── uc-01-registration.acceptance.test.js
    ├── integration/
    │   ├── register-page.contract.test.js
    │   ├── create-registration.contract.test.js
    │   ├── confirm-registration.contract.test.js
    │   └── registration-latency.test.js
    └── unit/
        ├── registration-controller.test.js
        ├── user-account-model.test.js
        ├── registration-attempt-model.test.js
        └── email-delivery-job-model.test.js
```

**Structure Decision**: Use `src/models`, `src/views`, and `src/controllers` as the only production logic layers so the constitution-mandated MVC separation is explicit and testable. Keep acceptance, integration, and unit coverage evidence in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests` and map it directly to UC-01/UC-01-AS.

## Performance & Usability Verification

- Measure `POST /api/registrations` latency in `tests/integration/registration-latency.test.js` and record p95 results in `specs/001-user-registration/checklists/registration.md`.
- Measure client-side validation timing using instrumentation in `src/assets/js/registration-form.js` and record p95 evidence in `specs/001-user-registration/checklists/registration.md`.
- Run first-time-user usability verification using the protocol documented in `specs/001-user-registration/quickstart.md`, including sample-size and first-attempt-success capture.
- Record SC-004 and SC-005 evidence in `specs/001-user-registration/checklists/registration.md` before marking UC-01 complete.

## Post-Design Constitution Re-Check

- [x] UC mapping remains limited to `Use Cases/UC-01.md`.
- [x] Acceptance mapping remains limited to `Acceptance Tests/UC-01-AS.md`.
- [x] Data model and contracts keep production behavior within HTML/CSS/JavaScript service boundaries.
- [x] Design artifacts preserve MVC separation (Models: state/rules, Views: rendering, Controllers: flow orchestration).
- [x] Coverage plan still targets 100% for in-scope JavaScript and blocks below 95% without approved exception.

**Gate Status (Post-Design)**: PASS

## Complexity Tracking

No constitution violations or exceptions are required for this plan.
