# Quickstart: Reviewer Assignment Workflow (UC-06, UC-07)

## 1. Prerequisites

- Node.js 20+ and npm 10+
- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Use case references:
  - `Use Cases/UC-06.md`
  - `Use Cases/UC-07.md`
- Acceptance references:
  - `Acceptance Tests/UC-06-AS.md`
  - `Acceptance Tests/UC-07-AS.md`

## 2. Create MVC skeleton

Create planned feature files:

- `src/models/PaperSubmissionModel.js`
- `src/models/ReviewerModel.js`
- `src/models/ReviewerAssignmentModel.js`
- `src/models/ReviewInvitationModel.js`
- `src/views/AssignReviewersView.js`
- `src/views/AssignmentOutcomeView.js`
- `src/controllers/ReviewerAssignmentController.js`
- `src/controllers/InvitationController.js`
- `src/assets/css/assign-reviewers.css`
- `src/assets/js/assign-reviewers-page.js`
- `src/index.html`

## 3. Implement core flow

1. Load submitted papers from `GET /papers?state=submitted`.
2. Load reviewer candidates from `GET /papers/{paperId}/reviewer-candidates`.
3. Create assignment attempt with `POST /papers/{paperId}/assignment-attempts`.
4. For unavailable/COI selections, replace reviewers with `PATCH /papers/{paperId}/assignment-attempts/{attemptId}/selections/{selectionId}`.
5. Confirm with `POST /papers/{paperId}/assignment-attempts/{attemptId}/confirm` and handle `409` stale confirmation.
6. Render assignment outcome and invitation statuses from `/papers/{paperId}/assignment-outcomes/{attemptId}`.

## 4. Implement invitation retry behavior

- Dispatch invitation per assignment.
- Retry failed invitations every 5 minutes.
- Stop after 3 retries.
- Keep reviewer assignment active when invitation reaches terminal failure and mark follow-up required.

## 5. Validate acceptance and coverage

Add automated tests mapped to acceptance suites:

- `tests/acceptance/uc06-assign-reviewers.acceptance.test.js`
- `tests/acceptance/uc07-review-invitation.acceptance.test.js`

Recommended script targets:

- `npm run test:acceptance`
- `npm run test:unit`
- `npm run coverage`

Coverage gate:

- Target 100% line coverage for in-scope project-owned JavaScript.
- If below 100%, document uncovered lines and remediation; below 95% requires approved exception.

## 6. Regression check

Before merge, verify previously passing acceptance suites still pass unchanged.
