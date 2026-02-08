# Implementation Plan: Change Account Password

**Branch**: `001-change-password` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/spec.md`
**Input**: Feature specification from `/specs/001-change-password/spec.md`

## Summary

Implement UC-03 password change for logged-in users using HTML for definition, CSS for style, and JavaScript for behavior under strict MVC boundaries. The flow verifies the current password, validates the new password against global policy plus a `new != current` rule, enforces throttling (`5` incorrect attempts in `10` minutes -> `10` minute block), updates credentials, invalidates other sessions, triggers a security notification, and records audit entries for every attempt.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020 modules)
**Primary Dependencies**: Browser DOM and Fetch APIs; Node.js 20 + npm scripts; Jest + c8 coverage; Playwright acceptance automation
**Storage**: Server-side credential/session/audit persistence via existing CMS APIs (no credential storage in browser)
**Testing**: Execute `Acceptance Tests/UC-03-AS.md` exactly; add model/controller unit tests and controller-model integration tests; enforce 100% line coverage target for in-scope JavaScript with remediation notes when below 100%, and no less than 95% without approved exception
**Target Platform**: Modern desktop and mobile browsers (latest two stable versions)
**Project Type**: web (MVC)
**Performance Goals**: Meet SC-002 by completing at least 95% of valid password changes within 30 seconds from submit to success feedback; keep client-side validation feedback under 200ms
**Constraints**: Scope limited to `Use Cases/UC-03.md` and `Acceptance Tests/UC-03-AS.md`; production behavior must remain in HTML/CSS/JavaScript; Model, View, and Controller concerns must remain separated
**Scale/Scope**: 1 password-change interaction flow, 1 controller, 6 supporting models/adapters (policy, credential, throttle, session, notification, audit), and 1 mapped acceptance suite

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
  - All planned behavior maps to `Use Cases/UC-03.md`.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
  - All verification maps to `Acceptance Tests/UC-03-AS.md`.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
  - HTML defines structure, CSS defines styling, JavaScript defines behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
  - Planned boundaries and paths are listed in Project Structure.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
  - No below-100% exception is planned at this stage.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.
  - Regression suite reruns are included in quickstart verification steps.

**Gate Status (Pre-Phase 0)**: PASS

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── password-change.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
Use Cases/
Acceptance Tests/
src/
├── models/
│   ├── password-change-model.js
│   ├── password-policy-model.js
│   ├── attempt-throttle-model.js
│   ├── session-model.js
│   ├── notification-model.js
│   └── audit-log-model.js
├── views/
│   ├── password-change-view.html
│   └── password-change-view.js
├── controllers/
│   └── password-change-controller.js
├── assets/
│   ├── css/
│   │   └── password-change.css
│   └── js/
│       └── app.js
└── index.html

tests/
├── acceptance/
│   └── uc03-change-password.acceptance.test.js
└── unit/
    ├── password-change-model.test.js
    ├── attempt-throttle-model.test.js
    └── password-change-controller.test.js
```

**Structure Decision**: The feature uses strict MVC. Models encapsulate password rules and integrations, Views own HTML/CSS rendering and feedback elements, and the Controller coordinates user interaction and flow control. This directly satisfies Constitution Principle III and the explicit user instruction for HTML/CSS/JavaScript with MVC.

## Phase 0 Research Plan

1. Validate how global password policy is applied together with `new != current`.
2. Select the throttling window strategy for incorrect current-password attempts.
3. Define integration sequencing for session invalidation, notification dispatch, and audit logging.
4. Define acceptance and coverage tooling approach for constitution compliance.

**Phase 0 Output**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/research.md`

## Phase 1 Design Plan

1. Extract entities and validation/state rules into `data-model.md`.
2. Define REST contract for user-facing password-change action in `contracts/password-change.openapi.yaml`.
3. Write quickstart implementation and verification flow in `quickstart.md`.
4. Run `.specify/scripts/bash/update-agent-context.sh codex`.

**Phase 1 Output**

- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/data-model.md`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/contracts/password-change.openapi.yaml`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-change-password/quickstart.md`
- Agent context file at `/home/m_srnic/ece493/lab2/ECE493Lab2/AGENTS.md`

## Post-Design Constitution Check (Re-evaluated)

- [x] UC traceability remains explicit (`UC-03`) across plan, research, data model, and contract.
- [x] Acceptance suite traceability remains explicit (`UC-03-AS`) for design and verification.
- [x] Planned stack remains HTML/CSS/JavaScript only for production-facing behavior.
- [x] MVC boundaries are explicit in structure and implementation sequencing.
- [x] Coverage plan still targets 100% in-scope JavaScript lines with documented governance thresholds.
- [x] No violations require constitution exceptions.

**Gate Status (Post-Phase 1 Design)**: PASS

## Complexity Tracking

No constitution violations or exceptions are required for this plan.
