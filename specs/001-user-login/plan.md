# Implementation Plan: User Login Access

**Branch**: `001-user-login` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md`

## Summary

Implement UC-02 login flow using HTML for definition, CSS for styling, and JavaScript for behavior in an MVC architecture. Deliver a login page and dashboard access flow backed by JavaScript models/controllers that enforce invalid-credential messaging, five-attempt throttling (10-minute block), and failed-attempt reset on successful authentication, with acceptance and coverage evidence for UC-02-AS.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022, Node.js 20 runtime for server-side JavaScript)
**Primary Dependencies**: Browser DOM APIs, Fetch API, Express 4.x auth endpoints, `express-session` for session state, `bcrypt` for password verification, Jest + Supertest + c8 for testing and line coverage
**Storage**: Registered account records from project-owned account storage, server-side session store for authentication state, and failed-attempt tracker keyed by normalized email with `blockedUntil` timestamp
**Testing**: Execute `Acceptance Tests/UC-02-AS.md` scenarios as acceptance tests, plus unit tests for models/controllers and integration tests for auth endpoints; report JavaScript line coverage with c8 targeting 100%
**Target Platform**: Modern desktop and mobile browsers plus Node.js server runtime
**Project Type**: web (MVC)
**Performance Goals**: Login API response p95 <= 500 ms under expected lab load; valid login to dashboard <= 10 seconds per SC-002
**Constraints**: Map all behavior to `Use Cases/UC-02.md` and `Acceptance Tests/UC-02-AS.md`; keep HTML/CSS/JavaScript stack; preserve strict MVC separation; use generic invalid-credential messaging; enforce 5 failures -> 10-minute block per account
**Scale/Scope**: 1 in-scope use case (UC-02), 2 user-facing views, 2 UI controllers, 3-4 domain/server models, 1 authentication API surface

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Pre-Phase 0 Gate Review:

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

Post-Phase 1 Design Re-Check:

- [x] `research.md`, `data-model.md`, `contracts/openapi.yaml`, and `quickstart.md` preserve UC-02 to UC-02-AS traceability.
- [x] Designed modules keep Model (`src/models`, `server/models`), View (`src/views`, `src/index.html`, `src/assets/css`), and Controller (`src/controllers`, `server/controllers`) concerns separated.
- [x] Contract and model decisions enforce generic invalid credential errors, lockout behavior, and failed-attempt reset requirements.
- [x] Planned test and coverage workflow remains at 100% target and no gate exception is required.

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/
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
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── login.css
│   │   └── js/
│   │       └── app.js
│   ├── views/
│   │   ├── login-view.js
│   │   └── dashboard-view.js
│   ├── controllers/
│   │   ├── login-controller.js
│   │   └── session-controller.js
│   └── models/
│       ├── credential-submission-model.js
│       └── auth-session-model.js
├── server/
│   ├── app.js
│   ├── routes/
│   │   └── auth-routes.js
│   ├── controllers/
│   │   └── auth-controller.js
│   └── models/
│       ├── user-account-model.js
│       └── failed-login-tracker-model.js
└── tests/
    ├── acceptance/
    │   └── uc-02-login.acceptance.test.js
    ├── integration/
    │   └── auth-api.integration.test.js
    └── unit/
        ├── models/
        └── controllers/
```

**Structure Decision**: Use split MVC layers with browser-side MVC for UI and server-side MVC for authentication rules. This keeps HTML/CSS/JS responsibilities explicit and preserves testable boundaries for UC-02 acceptance and coverage obligations.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations identified for this feature.
