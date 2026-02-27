# Quickstart: Review Submission Validation (UC-09)

## 1. Reference Inputs

- Spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/spec.md`
- Plan: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/plan.md`
- Research: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/research.md`
- Data model: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/data-model.md`
- Contract: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-review-submission-validation/contracts/review-submission.openapi.yaml`

## 2. Implement MVC Modules

Create planned modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/`:

- `models/review-submission-model.js`: required-field and whitespace validation logic
- `models/review-record-model.js`: one-time completion and persistence constraints
- `models/validation-feedback-model.js`: canonical missing-field response shape
- `views/templates/review-form.html`: HTML structure for review form
- `views/review-form-view.js`: rendering and field-level feedback display
- `assets/css/review-form.css`: form styling and validation error styles
- `controllers/review-submission-controller.js`: submit orchestration and retry handling
- `api/review-submission-routes.js`: status/read and submit endpoints from OpenAPI contract
- `assets/js/review-form-page.js`: page bootstrap wiring controller to view

## 3. API Behavior Checklist

- `GET /api/reviewer-assignments/{assignmentId}/review-status` returns `NOT_SUBMITTED` or `COMPLETED`.
- `POST /api/reviewer-assignments/{assignmentId}/review-submissions`:
  - returns `201` for first valid completion
  - returns `400` with `missingFields` for validation failures
  - returns `403` when reviewer access is revoked
  - returns `409` when already completed or when concurrent duplicate loses race
- Failed validation attempts do not create/update persistent draft records.

## 4. Acceptance and Coverage Verification

Run verification from `/home/m_srnic/ece493/lab2/ECE493Lab2` once implementation exists:

```bash
npm test -- --runInBand
npm run test:acceptance -- UC-09
npm run test:coverage
```

Validation expectations:

- Both scenarios in `Acceptance Tests/UC-09-AS.md` pass exactly as written.
- Unit/integration tests cover FR-003 whitespace checks, FR-007 resubmission rejection, and FR-009 concurrent-submit conflict behavior.
- JavaScript line coverage for in-scope UC-09 modules is 100%; if a gap appears, provide line-level rationale/remediation and keep accepted coverage at or above 95% unless exception-approved.

## 5. Manual Smoke Flow

1. Load review form for active reviewer-paper assignment.
2. Submit with missing required field and confirm completion request appears without persistence.
3. Fill missing fields and resubmit; confirm review becomes `COMPLETED`.
4. Attempt a second submit for same assignment; confirm conflict rejection and no record mutation.
5. Trigger two concurrent valid submits; confirm exactly one succeeds.
