# Implementation Plan: Author Decision Notifications

**Branch**: `[001-notification-delivery-retry]` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-notification-delivery-retry/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-notification-delivery-retry/spec.md`

## Summary

Implement UC-12 notification delivery in an MVC web architecture using HTML/CSS/JavaScript: generate an email decision notification when a decision is finalized, perform exactly one automatic retry on initial delivery failure, prevent duplicate sends for the same finalized decision, and log unresolved failures for administrator-only visibility with 1-year retention.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022 for browser + Node.js 20 LTS runtime)
**Primary Dependencies**: Node.js runtime, Express-style routing/controllers, SMTP email adapter (Nodemailer-compatible), server-rendered HTML views with static CSS/JS assets
**Storage**: Backend relational persistence for notifications, delivery attempts, and unresolved failure records (1-year retention policy)
**Testing**: `Acceptance Tests/UC-12-AS.md`, regression run for previously passing acceptance suites, JavaScript unit/integration tests, and line-coverage reporting targeting 100%
**Target Platform**: Modern desktop/mobile browsers for admin UI plus Node.js service runtime
**Project Type**: web (MVC)
**Performance Goals**: Initial send attempt started within 30s of decision finalization; retry started within 60s of initial failure; admin unresolved-failure list queries p95 <300ms for 1-year retained records
**Constraints**: Map all behavior to `Use Cases/UC-12.md`; satisfy `Acceptance Tests/UC-12-AS.md`; email-only channel; exactly one automatic retry; unresolved logs visible to administrators only; HTML/CSS/JavaScript with strict MVC separation
**Scale/Scope**: UC-12 only; 1 notification per finalized decision/author; up to 2 delivery attempts per notification; 4 core models, 2 controllers, and 2 views (admin failure list/detail)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Result**: PASS
**Post-Phase 1 Gate Result**: PASS

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
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-notification-delivery-retry/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── notification-delivery-api.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── src/
│   ├── models/
│   │   ├── finalized-decision-model.js
│   │   ├── decision-notification-model.js
│   │   ├── delivery-attempt-model.js
│   │   └── unresolved-failure-model.js
│   ├── controllers/
│   │   ├── notification-controller.js
│   │   └── admin-failure-log-controller.js
│   ├── views/
│   │   ├── admin-failure-list.html
│   │   └── admin-failure-detail.html
│   ├── services/
│   │   ├── email-delivery-service.js
│   │   └── retry-scheduler-service.js
│   └── routes/
│       ├── notification-routes.js
│       └── admin-routes.js
├── public/
│   ├── css/
│   │   └── admin-failures.css
│   └── js/
│       └── admin-failures-controller.js
└── tests/
    ├── acceptance/
    ├── integration/
    └── unit/
```

**Structure Decision**: Keep all production code in a single MVC web application rooted at `/home/m_srnic/ece493/lab2/ECE493Lab2/src`, with HTML views in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views`, CSS in `/home/m_srnic/ece493/lab2/ECE493Lab2/public/css`, JavaScript behavior in controllers/services and `/home/m_srnic/ece493/lab2/ECE493Lab2/public/js`, and acceptance/unit/integration verification under `/home/m_srnic/ece493/lab2/ECE493Lab2/tests`.

## Complexity Tracking

No constitution violations or exceptions are planned.
