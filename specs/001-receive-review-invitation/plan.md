# Implementation Plan: Reviewer Invitation Delivery

**Branch**: `[001-receive-review-invitation]` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/spec.md`

## Summary

Implement UC-07 invitation delivery with strict MVC separation using HTML/CSS/JavaScript:
controllers orchestrate invitation creation, retry, cancellation, and failure-log access;
models enforce status transitions and invitation uniqueness; views expose invitation status and
role-restricted failure evidence for editors/support/admin users.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022; Node.js 20 for server-side controllers/jobs)
**Primary Dependencies**: Vanilla JS modules, browser Fetch/DOM APIs, Node.js timers for retry scheduling, OpenAPI 3.1 for API contracts
**Storage**: Backend API persistence for `ReviewInvitation`, `DeliveryAttempt`, and `FailureLogEntry` records with a unique active invitation constraint per reviewer-paper assignment
**Testing**: Execute `Acceptance Tests/UC-07-AS.md`; add unit tests for models/controllers and integration tests for retry cadence, cancellation, and RBAC; coverage with `c8` targeting 100% (>=95% only with approved exception)
**Target Platform**: Modern desktop/mobile browsers for operational views plus Node.js service runtime
**Project Type**: web (MVC)
**Performance Goals**: >=95% invitation deliveries complete within 2 minutes of assignment confirmation (SC-002); retry scheduler runs at 5-minute cadence with <=15-second drift
**Constraints**: Scope is only `Use Cases/UC-07.md` and `Acceptance Tests/UC-07-AS.md`; production behavior must stay in HTML/CSS/JavaScript; preserve MVC boundaries; prevent regression in previously passing acceptance suites
**Scale/Scope**: 1 in-scope use case (UC-07), 3 core models, 2 controllers, 2 UI views, and one retry worker loop

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] Every planned behavior maps to `Use Cases/UC-07.md` (FR-001 through FR-011).
- [x] Matching suite `Acceptance Tests/UC-07-AS.md` is identified for all in-scope behavior.
- [x] Implementation remains within HTML/CSS/JavaScript for production-facing behavior.
- [x] MVC boundaries are defined with planned paths under `src/models`, `src/views`, and `src/controllers`.
- [x] Coverage strategy targets 100% line coverage for in-scope JavaScript.
- [x] No expected sub-100% coverage is planned; if it occurs, line-level rationale/remediation will be documented.
- [x] Coverage below 95% is blocked unless a documented compliance exception is approved.
- [x] Regression plan includes running previously passing acceptance suites before merge.

## Project Structure

### Documentation (this feature)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/
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
│   │   ├── review-invitation.model.js
│   │   ├── delivery-attempt.model.js
│   │   └── failure-log-entry.model.js
│   ├── views/
│   │   ├── invitation-status/
│   │   │   ├── invitation-status.html
│   │   │   ├── invitation-status.css
│   │   │   └── invitation-status.js
│   │   └── failure-log/
│   │       ├── failure-log.html
│   │       ├── failure-log.css
│   │       └── failure-log.js
│   ├── controllers/
│   │   ├── invitation.controller.js
│   │   └── failure-log.controller.js
│   └── services/
│       └── invitation-retry.worker.js
└── tests/
    ├── acceptance/
    ├── integration/
    └── unit/
```

**Structure Decision**: Use a single web MVC codebase where HTML defines view structure, CSS
defines presentation, JavaScript defines behavior, and retry orchestration lives in controller/
service modules to prevent cross-layer mixing.

## Phase 0 Research Status

- Output artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/research.md`
- All clarification points for retry policy implementation, uniqueness enforcement, and failure-log authorization are resolved in research.

## Phase 1 Design Status

- Output artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/data-model.md`
- Output artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/contracts/openapi.yaml`
- Output artifact: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-receive-review-invitation/quickstart.md`
- Agent context update command: `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/scripts/bash/update-agent-context.sh codex`

## Post-Design Constitution Check

- [x] UC mapping remains limited to UC-07 and matches all planned endpoints/models.
- [x] `UC-07-AS` assertions are covered by contract + model/controller responsibilities.
- [x] HTML/CSS/JavaScript + MVC layering remains explicit in structure and quickstart steps.
- [x] Coverage and regression enforcement are preserved in verification plan.

## Complexity Tracking

No constitution violations or exceptions are currently required.
