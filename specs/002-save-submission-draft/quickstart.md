# Quickstart: Save Paper Draft (UC-05)

## Purpose

Implement draft save, version history, restore, and retention behavior for `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-05.md` with HTML/CSS/JavaScript and strict MVC separation.

## Prerequisites

- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Feature branch: `002-save-submission-draft`
- Input artifacts:
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/plan.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/research.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/data-model.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`

## Implementation Steps (MVC)

1. Create source layout for MVC boundaries:
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js`

2. Implement model layer:
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-submission-model.js`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-version-model.js`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/draft-retention-policy.js`
   - Enforce optimistic lock checks, immutable version creation, and retention rules.

3. Implement controller layer:
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-controller.js`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/draft-version-controller.js`
   - Map UI events to API operations defined in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`.

4. Implement view layer:
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/draft-editor-view.js`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/draft-history-view.js`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/draft.css`
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/index.html`
   - Keep views free of business rules; render model/controller state only.

5. Wire page behavior:
   - `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/draft-page.js`
   - Connect save/load/history/restore UI actions to controllers.

6. Implement retention integration:
   - Trigger retention prune contract when final submission completes.
   - Confirm only latest draft version remains after finalize event.

## Contract-Driven API Checklist

- Implement `PUT /api/submissions/{submissionId}/draft` with `baseRevision` conflict checks.
- Implement `GET /api/submissions/{submissionId}/draft` for latest draft load.
- Implement `GET /api/submissions/{submissionId}/draft/versions` for version listing.
- Implement `GET /api/submissions/{submissionId}/draft/versions/{versionId}` for version detail.
- Implement `POST /api/submissions/{submissionId}/draft/versions/{versionId}/restore`.
- Implement `POST /api/submissions/{submissionId}/draft/retention/prune` for finalize retention.

## Validation Checklist

- Confirm all acceptance statements in `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md` pass.
- Confirm stale saves return `409` and do not mutate latest version.
- Confirm failed saves preserve previously successful draft.
- Confirm owner/admin can view and restore versions; unauthorized users are denied.
- Confirm post-final-submission pruning retains only latest version.
- Confirm in-scope JavaScript coverage reports target 100% line coverage; document any shortfall per constitution rules.

## Regression Expectations

- Re-run previously passing acceptance suites for implemented UCs to satisfy constitution regression safety.
- Block merge on regressions until resolved.
