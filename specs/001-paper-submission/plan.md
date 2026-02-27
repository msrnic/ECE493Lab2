# Implementation Plan: Author Paper Submission

**Branch**: `001-paper-submission` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/spec.md`

## Summary

Implement UC-04 paper submission with an HTML/CSS/JavaScript MVC stack: Views render the submission
workflow and feedback, Controllers orchestrate metadata capture/upload/validation/retry flow, and
Models enforce submission rules, duplicate protection, and persistence state transitions. Design
targets FR-001 through FR-015 with explicit mapping to `Use Cases/UC-04.md` and
`Acceptance Tests/UC-04-AS.md`.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2022)
**Primary Dependencies**: Browser File API, Fetch API, FormData, Node.js 20 LTS + Express 4,
multipart upload middleware, malware scanning adapter, session middleware
**Storage**: Relational persistence for submission metadata/status + object storage for uploaded files +
session-scoped temporary retry state
**Testing**: Execute `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-04-AS.md` scenarios
as written; add controller/model unit tests; enforce JS line coverage with `c8`/`nyc` at 100%
target and hard floor 95%
**Target Platform**: Modern desktop/mobile browsers (latest Chrome, Firefox, Safari, Edge)
**Project Type**: web (MVC)
**Performance Goals**: Validation feedback <2s p95, upload failure retry prompt <1s after failure
detection, successful end-to-end submit flow within SC-002 target (3 minutes user journey)
**Constraints**: Scope must remain mapped to UC-04; production behavior must use HTML/CSS/JavaScript;
MVC separation is mandatory; no regression in previously passing acceptance suites
**Scale/Scope**: 1 use case (UC-04), 1 primary submission view, 3 controller modules
(submission/upload/status), 4 model modules (submission/file/session/dedup), 3 repository modules,
2 service adapters, 1 session middleware module, and UC-04 acceptance + performance/usability
evidence with regression run of existing suites

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Phase 0 Gate Status**: PASS

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
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/
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
│   ├── config/
│   │   └── submission-config.js
│   ├── middleware/
│   │   └── session-auth.js
│   ├── services/
│   │   ├── storage-service.js
│   │   └── scan-service.js
│   ├── repositories/
│   │   ├── submission-repository.js
│   │   ├── file-repository.js
│   │   └── session-state-repository.js
│   ├── models/
│   │   ├── submission-model.js
│   │   ├── file-model.js
│   │   ├── session-state-model.js
│   │   └── deduplication-model.js
│   ├── views/
│   │   ├── submit-paper.html
│   │   ├── partials/
│   │   └── submit-paper-view.js
│   ├── controllers/
│   │   ├── submission-controller.js
│   │   ├── upload-controller.js
│   │   └── status-controller.js
│   └── assets/
│       ├── css/
│       │   └── submit-paper.css
│       └── js/
│           └── submit-paper-page.js
└── tests/
    ├── acceptance/
    │   ├── uc-04-submission.spec.js
    │   ├── uc-04-performance.spec.js
    │   └── uc-04-usability-protocol.md
    ├── unit/
    │   ├── models/
    │   └── controllers/
    │       └── session-auth.spec.js
    └── coverage/
```

**Structure Decision**: Adopt strict MVC under `/home/m_srnic/ece493/lab2/ECE493Lab2/src` with no
cross-layer business rules in views. Views render and emit events, controllers coordinate flow and
HTTP integration, and models own validation/state/duplicate logic.

## Phase 0 Research Summary

Research decisions are captured in
`/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/research.md`. All
technical-context unknowns were resolved with documented alternatives.

## Phase 1 Design Summary

- Data model defined in
  `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/data-model.md`.
- REST contract defined in
  `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/contracts/openapi.yaml`.
- Implementation/runbook documented in
  `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/quickstart.md`.

## Post-Design Constitution Check

**Post-Phase 1 Gate Status**: PASS

- [x] UC mapping remains explicit: FR-001..FR-015 -> UC-04.
- [x] Acceptance mapping remains explicit: FR-001..FR-015 -> UC-04-AS.
- [x] Stack remains HTML/CSS/JavaScript with MVC boundaries preserved.
- [x] Contracts and data model keep model/controller/view responsibilities separate.
- [x] Coverage strategy still targets 100% JS line coverage with remediation rule if below target.
- [x] Coverage floor of 95% remains enforced via CI gate.
- [x] Regression plan includes running all existing acceptance suites before merge.

## Complexity Tracking

No constitution violations or exception requests were identified in planning/design.

## MVC Boundary Audit Outcomes

- Models (`src/models/*`) contain validation rules, state transitions, and deduplication logic only.
- Controllers (`src/controllers/*`) orchestrate HTTP request flow and map model outcomes to responses.
- Views (`src/views/*`, `src/assets/js/*`) handle rendering/form serialization/status messaging only.
- No view modules import repositories or services directly.
- No controller stores business rules that duplicate model validation logic.
