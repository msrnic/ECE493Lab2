# Implementation Plan: Registration Payment Flow

**Branch**: `001-registration-payment` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-payment/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-payment/spec.md`

## Summary

Deliver UC-17 payment registration behavior with strict HTML/CSS/JavaScript MVC separation:
attendees submit tokenized payment details, receive approved/declined/pending outcomes, get a
retry prompt after decline (with 5-in-15-minute limit and cooldown), and duplicate submissions
return the original result through idempotency instead of creating duplicate charges.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020+)
**Primary Dependencies**: Browser Fetch API, Web Crypto API for idempotency-key generation, payment gateway hosted-fields/tokenization SDK, Node.js tooling for Playwright/Vitest/c8
**Storage**: Backend API persistence for checkout session status, payment-attempt metadata, retry/cooldown state, and reconciliation logs; no raw cardholder data
**Testing**: Execute `Acceptance Tests/UC-17-AS.md` exactly; add unit tests for model/controller logic and integration tests for gateway adapter/reconciliation path with coverage reporting
**Target Platform**: Modern desktop and mobile browsers (latest Chrome, Firefox, Safari, Edge)
**Project Type**: web (MVC)
**Performance Goals**: Non-pending payment submit-to-outcome <=2s p95, pending/decline UI feedback <=1s p95, first successful completion <=2 minutes in usability scenarios
**Constraints**: Map all behavior to `Use Cases/UC-17.md` and `Acceptance Tests/UC-17-AS.md`, preserve MVC boundaries, enforce PCI DSS SAQ A tokenized handling, support idempotency, pending reconciliation, retry limit, and cooldown policy from FR-008 through FR-011
**Scale/Scope**: UC-17 only; 1 payment page flow with confirmation/retry messaging, 4 core
model objects plus shared validation/repository helpers, 3 controllers plus gateway client/router
bootstrap helpers, 2 views, and 4 API endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Evaluation (2026-02-08)

- [x] Every planned behavior maps to `Use Cases/UC-17.md` (FR-001 through FR-011).
- [x] Matching `Acceptance Tests/UC-17-AS.md` is identified for UC-17.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] MVC boundaries are defined with planned paths:
  `src/models/*.js`, `src/views/*.html`, `src/assets/css/*.css`, `src/controllers/*.js`.
- [x] Coverage strategy targets 100% line coverage for in-scope JavaScript.
- [x] No expected coverage below 100% at planning time; remediation template retained in case of
  measured shortfall.
- [x] Coverage below 95% is explicitly blocked without approved exception.
- [x] Regression plan includes running previously passing acceptance suites (UC-01 through UC-16)
  before merge in addition to UC-17 validation.

**Gate Result**: PASS

### Post-Phase 1 Re-Check (2026-02-08)

- [x] `research.md`, `data-model.md`, `contracts/openapi.yaml`, and `quickstart.md` keep all
  behavior mapped to UC-17 and UC-17-AS.
- [x] Contracts and model design preserve tokenized-only payment handling and no raw card data.
- [x] MVC module boundaries remain explicit and unchanged.
- [x] Coverage and regression requirements remain enforceable in implementation and CI.

**Gate Result**: PASS

## Traceability Mapping (Bidirectional)

### Forward Mapping (UC -> Requirements -> Modules -> Acceptance)

- UC-17 -> FR-001 through FR-011, NFR-001 through NFR-003 -> `src/models/*`,
  `src/controllers/*`, `src/views/*`, `src/assets/*` -> `Acceptance Tests/UC-17-AS.md`

### Reverse Mapping (Modules -> Requirements/UC)

- `src/models/payment-attempt-model.js` -> FR-002, FR-003, FR-006, FR-008, UC-17
- `src/models/retry-policy-model.js` -> FR-005, FR-010, UC-17
- `src/controllers/gateway-webhook-controller.js` -> FR-009, UC-17
- `src/assets/js/payment-view.js` -> FR-003, FR-004, FR-005, NFR-002, UC-17
- `tests/acceptance/uc17-performance-results.md` -> NFR-001, NFR-002, NFR-003, UC-17

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-payment/
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
│   │   ├── registration-session-model.js
│   │   ├── payment-attempt-model.js
│   │   ├── retry-policy-model.js
│   │   ├── reconciliation-event-model.js
│   │   ├── payment-validation.js
│   │   └── payment-repository.js
│   ├── controllers/
│   │   ├── payment-controller.js
│   │   ├── payment-status-controller.js
│   │   ├── gateway-webhook-controller.js
│   │   ├── gateway-client.js
│   │   └── payment-routes.js
│   ├── views/
│   │   ├── payment.html
│   │   └── confirmation.html
│   ├── assets/
│   │   ├── css/
│   │   │   └── payment.css
│   │   └── js/
│   │       └── payment-view.js
│   └── index.html
└── tests/
    ├── acceptance/
    │   └── uc17-registration-payment.acceptance.test.js
    ├── integration/
    │   └── gateway-webhook-controller.test.js
    ├── coverage/
    └── unit/
        ├── models/
        └── controllers/
```

**Structure Decision**: Use a single web app root with explicit MVC folders so model rules
(idempotency, retry policy, registration transition) are isolated from controllers and views.
Acceptance tests remain traceable to UC-17-AS under `tests/acceptance/`.

## Complexity Tracking

No constitution violations identified. Complexity tracking table not required for this plan.
