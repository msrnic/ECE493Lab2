# Data Model: Editor Review Visibility

## Entity: Paper

- Purpose: Submission selected by an editor for review visibility.
- Fields:
  - `paperId` (string, required, immutable)
  - `trackId` (string, required)
  - `title` (string, required)
  - `currentState` (enum: `submitted`, `under_review`, `decisioned`; required)
- Validation:
  - `paperId` must reference an existing paper record.
  - `trackId` must reference a valid track.
- Relationships:
  - One `Paper` has many `Review` records.
  - One `Paper` is viewable by many editors through `EditorAssignment`.

## Entity: Review

- Purpose: Reviewer evaluation attached to a paper.
- Fields:
  - `reviewId` (string, required, immutable)
  - `paperId` (string, required, foreign key to `Paper.paperId`)
  - `reviewerId` (string, required)
  - `reviewerName` (string, required)
  - `status` (enum: `draft`, `in_progress`, `submitted`; required)
  - `overallScore` (number, optional until submitted)
  - `comments` (string, optional until submitted)
  - `submittedAt` (datetime, required when `status=submitted`)
- Validation:
  - Only `status=submitted` qualifies as completed review output.
  - `submittedAt` must be present when status is `submitted`.
- State Transitions:
  - `draft -> in_progress -> submitted`
  - `submitted` is terminal for UC-10 visibility purposes.

## Entity: EditorAssignment

- Purpose: Authorization mapping between editors and papers/tracks.
- Fields:
  - `assignmentId` (string, required, immutable)
  - `editorId` (string, required)
  - `paperId` (string, optional)
  - `trackId` (string, optional)
  - `assignmentScope` (enum: `paper`, `track`; required)
- Validation:
  - Exactly one scope target must be present:
    - `assignmentScope=paper` requires `paperId` and forbids `trackId`.
    - `assignmentScope=track` requires `trackId` and forbids `paperId`.
- Relationships:
  - Many assignments can map one editor to many papers/tracks.

## Entity: ReviewVisibilityResult (View Model)

- Purpose: Deterministic response payload for the editor review request.
- Fields:
  - `paperId` (string, required)
  - `status` (enum: `available`, `pending`; required)
  - `reviews` (array of `ReviewSummary`, required)
- Validation:
  - `status=available` requires `reviews.length >= 1`.
  - `status=pending` requires `reviews.length = 0`.

## Entity: ReviewSummary

- Purpose: Completed-review projection returned to authorized editors.
- Fields:
  - `reviewId` (string, required)
  - `reviewerId` (string, required)
  - `reviewerName` (string, required)
  - `overallScore` (number, required)
  - `comments` (string, required)
  - `submittedAt` (datetime, required)
- Validation:
  - Every summary must originate from a `Review` with `status=submitted`.

## Entity: ReviewAccessAuditEntry

- Purpose: Compliance/audit record for successful review visibility access.
- Fields:
  - `auditId` (string, required, immutable)
  - `editorId` (string, required)
  - `paperId` (string, required)
  - `accessedAt` (datetime, required, immutable)
  - `retentionUntil` (datetime, required; computed as `accessedAt + 365 days`)
- Validation:
  - Record only on successful authorized access.
  - `retentionUntil` must be exactly one year from `accessedAt`.
- Lifecycle:
  - `recorded -> retained -> purged` (purged once `retentionUntil` is exceeded).
