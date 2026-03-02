# Quickstart: Editor Decision Recording (UC-11)

This quickstart covers implementation and verification for `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-editor-decision`.

## 1. Prerequisites

- JavaScript project tooling available (Node.js 20+ and npm).
- Access to `Use Cases/UC-11.md` and `Acceptance Tests/UC-11-AS.md`.
- Backend data access for papers, evaluations, assignments, and audit records.

## 2. Implement MVC Modules

- Model layer (`src/models/`):
  - `decision-model.js` for decision rules (allowed outcomes, immutability, first-write-wins checks).
  - `decision-audit-model.js` for required audit entry creation.
- View layer (`src/views/`):
  - `editor-decision-view.js` for rendering evaluations, decision controls, and save outcome messages.
  - `src/index.html` plus `src/assets/css/editor-decision.css` for structure and styling.
- Controller layer (`src/controllers/`):
  - `editor-decision-controller.js` for load/save orchestration and retry handling.

## 3. Implement API Contracts

Create endpoints from `contracts/editor-decision.openapi.yaml`:

- `GET /api/papers/{paperId}/decision-workflow`
- `POST /api/papers/{paperId}/decisions`

Required write-time checks:

- Reviews are available (`FR-008`).
- Editor is assigned to paper or track (`FR-011`).
- Final outcome is one of `ACCEPT|REJECT|REVISE` (`FR-012`).
- First successful final save is immutable (`FR-009`, `FR-010`).
- Audit entry exists for every successful and denied action (`FR-013`).

## 4. Validate Acceptance Behavior

Execute acceptance scenarios exactly as written in `Acceptance Tests/UC-11-AS.md`:

- Final decision is stored when reviews are available.
- Deferred save keeps paper undecided.

Add targeted tests for spec edge scenarios:

- Final decision change attempt is rejected.
- Conflicting concurrent final saves reject late request.
- Unassigned editor write attempt is denied.
- Failed save response is clearly non-success and supports retry.

## 5. Run Test and Coverage Checks

Command sequence:

```bash
npm run test:acceptance:uc11
npm run test:integration:decision
npm test
npm run lint
```

Coverage gate:

- Target 100% line and branch coverage for in-scope JavaScript.
- Below 95% is blocked unless a documented compliance exception is approved.

## 6. Regression Safety Check

Before merge, verify previously passing acceptance suites remain green to satisfy constitution regression gates.

## 7. Verification Evidence

- Date executed: 2026-03-02
- Full test run (`npm test`): PASS
  - 152 test files, 596 tests passing
  - Coverage: 100% statements, 100% branches, 100% functions, 100% lines
- Lint run (`npm run lint`): PASS
