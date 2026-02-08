# Implementation Plan: Public User Registration

**Branch**: `001-user-registration` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`

## Summary

Deliver UC-01 registration as an HTML/CSS/JavaScript MVC implementation with a public registration view, registration controller flow, validation and throttling models, pending-account creation, confirmation-email delivery with retry queueing, and account activation on email confirmation.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020+)
**Primary Dependencies**: Browser Fetch API, Web Crypto API (idempotency key), Node.js 20 LTS runtime, Express-style HTTP routing, Playwright, Vitest, c8
**Storage**: Backend API persistence for `UserAccount`, `ConfirmationToken`, `RegistrationAttempt`, and `EmailOutboxJob` records
**Testing**: `Acceptance Tests/UC-01-AS.md` end-to-end scenarios in Playwright, model/controller unit tests in Vitest, line coverage with c8
**Target Platform**: Modern desktop/mobile browsers for UI + Node.js service runtime for registration API
**Project Type**: web (MVC)
**Performance Goals**: Registration submit path under 300ms p95 excluding third-party email latency; validation feedback under 100ms on client-side checks
**Constraints**: Must map all behavior to `Use Cases/UC-01.md` and `Acceptance Tests/UC-01-AS.md`, preserve MVC separation, and enforce 5 attempts per email per rolling 10 minutes
**Scale/Scope**: 1 registration page, 1 email-confirmation action, 5 core domain models, and 3 primary HTTP endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*
**Gate Status (Pre-Phase 0)**: PASS

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
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── registration.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── frontend/
│   ├── index.html
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   └── src/
│       ├── models/
│       ├── views/
│       └── controllers/
├── backend/
│   └── src/
│       ├── models/
│       ├── views/
│       ├── controllers/
│       └── routes/
└── tests/
    ├── acceptance/
    └── unit/
```

**Structure Decision**: MVC is split across frontend and backend JavaScript layers. Model modules own domain rules and persistence orchestration, View modules own HTML/CSS rendering and message templates, and Controller modules own request/interaction flow and response mapping.

## Complexity Tracking

No constitution violations are required for this plan.

## Phase 0 Research Summary

- All technical clarifications are resolved in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/research.md`.
- No `NEEDS CLARIFICATION` items remain.

## Post-Design Constitution Check

- **Gate Status (Post-Phase 1 Design)**: PASS
- [x] UC mapping remains explicit for registration, validation errors, duplicate-email handling, throttling, email retry, and confirmation activation under UC-01.
- [x] `Acceptance Tests/UC-01-AS.md` remains the authoritative acceptance target; supplemental tests only extend coverage depth.
- [x] Design artifacts keep production behavior in HTML/CSS/JavaScript and preserve MVC boundaries.
- [x] Contracts and data model define controller-model boundaries without view-layer business logic leakage.
- [x] Coverage plan remains 100% target with remediation required for any uncovered lines.
- [x] No gate failures; compliance exceptions are not needed.
