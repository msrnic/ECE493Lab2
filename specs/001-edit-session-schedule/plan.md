# Implementation Plan: Edit Conference Schedule

**Branch**: `001-edit-session-schedule` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/spec.md`

## Summary

Implement `UC-14` session schedule editing with save-time conflict validation, explicit override confirmation, stale-state blocking with unsaved edit retention, and publish/finalization blocking while unresolved conflicts exist. The implementation stays in HTML/CSS/JavaScript and enforces strict MVC boundaries across models (state/rules), views (UI rendering), and controllers (interaction flow).

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022)
**Primary Dependencies**: Browser DOM APIs, Fetch API, Node.js 20 runtime, Express.js 5 API layer, Jest + c8 for JavaScript coverage reporting
**Storage**: Backend API persistence for schedules, schedule version metadata, unresolved conflicts, and override audit entries
**Testing**: `Acceptance Tests/UC-14-AS.md` plus unit tests for models/controllers, API contract tests against `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/contracts/openapi.yaml`, and line coverage via c8
**Target Platform**: Modern desktop and mobile browsers (latest-2 Chrome, Firefox, Safari, Edge)
**Project Type**: web (MVC)
**Performance Goals**: Save validation response <= 2 seconds p95; conflict warning render <= 200 ms p95 after response; publish/finalization guard response <= 1 second p95
**Constraints**: Must map behavior to `UC-14` and `UC-14-AS`, keep production behavior in HTML/CSS/JavaScript, separate MVC layers, require explicit override reason with audit metadata, and preserve previously passing acceptance suites
**Scale/Scope**: One in-scope use case (`UC-14`), one schedule edit flow, three core model modules, three controller modules, two view modules, and four primary API actions (schedule fetch, save attempt, override save, publish attempt)

### Phase 0 Research Inputs (Resolved)

- Conflict detection rule set and data payload shape at save time.
- Concurrency strategy for stale schedule saves after concurrent editor updates.
- Override audit log schema (actor, timestamp, reason, affected conflicts).
- Enforcement point for publish/finalization blocking when unresolved conflicts remain.
- MVC module boundaries for UI and API interaction code.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Phase 0 Gate Review: PASS

- [x] Every planned behavior maps to one or more `Use Cases/UC-XX.md` files.
- [x] Matching `Acceptance Tests/UC-XX-AS.md` suites are identified for all in-scope UCs.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] Model, View, and Controller boundaries are defined with planned file paths.
- [x] Coverage strategy targets 100% line coverage for in-scope project-owned JavaScript.
- [x] Any expected coverage below 100% includes measured baseline, line-level rationale, and remediation plan.
- [x] Coverage below 95% is blocked unless a documented exception is approved in compliance review.
- [x] Regression plan preserves passing status of previously completed UC acceptance suites.

### Traceability and Boundary Evidence

- In-scope use case mapping: `UC-14` -> `FR-001` through `FR-011` in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/spec.md`.
- Acceptance mapping: all scenarios map to `UC-14-AS`.
- MVC module boundaries:
  - Models: `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/schedule-model.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/conflict-model.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/override-audit-model.js`
  - Views: `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/edit-schedule-view.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/conflict-warning-view.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/edit-schedule.css`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/index.html`
  - Controllers: `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/edit-schedule-controller.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/save-attempt-controller.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/publish-guard-controller.js`
  - API routes/services: `/home/m_srnic/ece493/lab2/ECE493Lab2/backend/routes/schedules.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/backend/routes/saves.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/backend/routes/publish.js`, `/home/m_srnic/ece493/lab2/ECE493Lab2/backend/services/schedule-service.js`
- Regression safety: run the previously passing acceptance suite baseline listed in `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/baseline-suites.md` before merge, in addition to `UC-14-AS`.

### Post-Phase 1 Gate Re-Check: PASS

- `research.md` resolves all Phase 0 questions.
- `data-model.md` covers schedule, conflicts, save attempts, and override audits with validation rules.
- `/contracts/openapi.yaml` defines REST contracts for save attempt, override save, and publish blocking.
- `quickstart.md` provides implementation and verification steps aligned to constitution requirements.
- No constitution violations or exceptions are required for this plan.

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/
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
├── backend/
│   ├── routes/
│   └── services/
├── src/
│   ├── models/
│   ├── views/
│   ├── controllers/
│   ├── assets/
│   │   ├── css/
│   │   └── js/
│   └── index.html
└── tests/
    ├── acceptance/
    ├── contract/
    └── unit/
```

**Structure Decision**: Use a web MVC module under `/home/m_srnic/ece493/lab2/ECE493Lab2/src` for client behavior plus an Express API layer under `/home/m_srnic/ece493/lab2/ECE493Lab2/backend` that implements `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/contracts/openapi.yaml`. This preserves clear Model/View/Controller ownership while keeping traceability to `UC-14` and `UC-14-AS`.

## Complexity Tracking

No constitution violations were identified, so no complexity exceptions are required.
