# Implementation Plan: Save Paper Draft

**Branch**: `002-save-submission-draft` | **Date**: 2026-02-08 | **Spec**: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/spec.md`
**Input**: Feature specification from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/spec.md`

## Summary

Deliver UC-05 draft save/resume behavior using HTML, CSS, and JavaScript under strict MVC boundaries. The feature adds optimistic-concurrency draft saves, immutable version history, role-based version view/restore access (submission owner and conference administrator), explicit failure feedback, and post-final-submission retention pruning to the latest version only.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript (ES2020+)
**Primary Dependencies**: Browser DOM APIs, Fetch API, FormData API, and the draft REST contract at `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`
**Storage**: Server-side persistence for versioned draft metadata and file references with optimistic locking by revision number
**Testing**: Acceptance validation from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md`, model/controller unit tests, draft API integration tests, and JS line coverage reporting targeting 100%
**Target Platform**: Modern desktop and mobile browsers
**Project Type**: web (MVC)
**Performance Goals**: Draft save confirmation p95 <= 2s for metadata-only drafts and <= 5s for drafts with attachments up to 25MB; latest draft load/version listing/restore p95 <= 1s excluding file transfer
**Constraints**: All behavior must trace to `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-05.md`, satisfy `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md`, remain in HTML/CSS/JavaScript for production behavior, and preserve MVC separation
**Scale/Scope**: 1 submission editor view and 1 draft history view; 3 model modules; 2 controllers; 2 views; 6 draft-related REST operations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Research Gate Result**: PASS

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
/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── draft-api.openapi.yaml
└── tasks.md
```

### Source Code (repository root)

```text
/home/m_srnic/ece493/lab2/ECE493Lab2/
├── Use Cases/
├── Acceptance Tests/
├── src/
│   ├── models/
│   │   ├── draft-submission-model.js
│   │   ├── draft-version-model.js
│   │   └── draft-retention-policy.js
│   ├── views/
│   │   ├── draft-editor-view.js
│   │   └── draft-history-view.js
│   ├── controllers/
│   │   ├── draft-controller.js
│   │   └── draft-version-controller.js
│   ├── assets/
│   │   ├── css/
│   │   │   └── draft.css
│   │   └── js/
│   │       └── draft-page.js
│   └── index.html
└── tests/
    ├── acceptance/
    │   └── uc-05-draft-save.acceptance.test.js
    └── unit/
        ├── models/
        └── controllers/
```

**Structure Decision**: Use a root-level MVC web layout at `/home/m_srnic/ece493/lab2/ECE493Lab2/src` with explicit separation: models own draft state/rules, views own DOM/CSS rendering, and controllers own event flow and API orchestration. This directly satisfies Constitution Principle III and keeps UC-05 traceability explicit.

## Phase 0: Research Output

Research tasks were completed in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/research.md` for conflict control, version-history persistence, file snapshot handling, retention pruning behavior, API contract shape, and coverage strategy. All clarification points are resolved; no `NEEDS CLARIFICATION` items remain.

## Phase 1: Design & Contracts Output

- Data model: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/data-model.md`
- API contract: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`
- Implementation and validation guide: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/quickstart.md`
- Agent context update command: `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/scripts/bash/update-agent-context.sh codex`

## Constitution Check (Post-Design)

**Post-Design Gate Result**: PASS

- [x] Planned behavior remains mapped to `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-05.md`.
- [x] Acceptance verification remains mapped to `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md`.
- [x] Contracts and quickstart keep production behavior in HTML/CSS/JavaScript.
- [x] MVC boundaries are explicit in planned source paths and responsibilities.
- [x] Coverage plan continues to target 100% line coverage for in-scope project-owned JavaScript.
- [x] Coverage below 95% remains blocked without documented compliance approval.
- [x] Regression strategy preserves prior acceptance pass status by rerunning completed suites.

## Complexity Tracking

No constitution violations are planned, so no exceptions are required.
