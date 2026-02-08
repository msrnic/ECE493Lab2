# Data Model: Save Paper Draft (UC-05)

## Model Overview

This feature introduces versioned draft persistence for in-progress submissions. Every successful save produces an immutable draft version, and restore creates a new latest version from a prior snapshot.

## Entity: DraftSubmission

Represents the current draft container for one paper submission.

| Field | Type | Required | Rules / Validation |
|---|---|---|---|
| `submissionId` | string (UUID) | Yes | Unique ID of the paper submission. |
| `ownerUserId` | string (UUID) | Yes | Must match the author who owns the submission. |
| `status` | enum(`IN_PROGRESS`,`FINAL_SUBMITTED`) | Yes | `FINAL_SUBMITTED` blocks new saves for this feature scope. |
| `latestVersionId` | string (UUID) | No | Null until first successful save. |
| `latestRevision` | integer | Yes | Starts at `0`; increments by `1` on each successful save/restore. |
| `lastSavedAt` | timestamp | No | Updated only on successful save/restore. |
| `finalizedAt` | timestamp | No | Set when submission is finalized. |

Relationships:
- `DraftSubmission 1 -> many DraftVersion`
- `DraftSubmission 1 -> many DraftSaveAttempt`

State transitions:
- `IN_PROGRESS -> IN_PROGRESS`: successful save or restore (revision increments, latest version changes).
- `IN_PROGRESS -> FINAL_SUBMITTED`: final submission completes.
- `FINAL_SUBMITTED -> FINAL_SUBMITTED`: retention prune keeps latest version only.

## Entity: DraftVersion

Immutable snapshot created by successful save operations.

| Field | Type | Required | Rules / Validation |
|---|---|---|---|
| `versionId` | string (UUID) | Yes | Unique version identifier. |
| `submissionId` | string (UUID) | Yes | Must reference an existing `DraftSubmission`. |
| `revision` | integer | Yes | Must be unique per `submissionId`; equals `latestRevision` at creation. |
| `savedByUserId` | string (UUID) | Yes | Must be submission owner or authorized admin action. |
| `metadataSnapshot` | JSON object | Yes | Includes all entered submission metadata; schema-validated at save time. |
| `restoredFromVersionId` | string (UUID) | No | Set only when this version is created via restore. |
| `createdAt` | timestamp | Yes | Server-generated. |

Relationships:
- `DraftVersion many -> 1 DraftSubmission`
- `DraftVersion 1 -> many DraftFileReference`

Invariants:
- Versions are immutable after creation.
- Failed saves do not create versions.
- Restore creates a new version rather than mutating an old one.

## Entity: DraftFileReference

File descriptor records linked to a version snapshot.

| Field | Type | Required | Rules / Validation |
|---|---|---|---|
| `fileId` | string (UUID) | Yes | Unique file descriptor ID. |
| `versionId` | string (UUID) | Yes | Must reference an existing `DraftVersion`. |
| `fileName` | string | Yes | Non-empty; normalized for display. |
| `mimeType` | string | Yes | Must be an allowed upload type. |
| `sizeBytes` | integer | Yes | Must be positive and within upload limits. |
| `checksum` | string | Yes | Required for integrity checks. |
| `storageKey` | string | Yes | Object-storage locator. |
| `uploadedAt` | timestamp | Yes | Server-generated. |

Relationships:
- `DraftFileReference many -> 1 DraftVersion`

Validation rules:
- Duplicate `checksum + fileName` entries in the same version are disallowed unless explicitly supported.
- Missing binary object for a stored `storageKey` invalidates the save transaction.

## Entity: DraftSaveAttempt

Audit and user-feedback record for each save trigger.

| Field | Type | Required | Rules / Validation |
|---|---|---|---|
| `attemptId` | string (UUID) | Yes | Unique attempt identifier. |
| `submissionId` | string (UUID) | Yes | Must reference an existing `DraftSubmission`. |
| `actorUserId` | string (UUID) | Yes | User who triggered save. |
| `baseRevision` | integer | Yes | Client revision used for optimistic concurrency. |
| `outcome` | enum(`SUCCESS`,`FAILED_SYSTEM`,`FAILED_STALE`,`FAILED_AUTH`) | Yes | Captures save result for feedback and diagnostics. |
| `errorCode` | string | No | Required when outcome is failure. |
| `createdVersionId` | string (UUID) | No | Set when outcome is `SUCCESS`. |
| `attemptedAt` | timestamp | Yes | Server-generated. |

Relationships:
- `DraftSaveAttempt many -> 1 DraftSubmission`

Validation rules:
- `FAILED_STALE` must include current latest revision in response payload.
- Non-success outcomes must not mutate `DraftSubmission.latestVersionId`.

## Access Control Rules (Derived Model Constraints)

- Owner and conference administrator can view and restore versions.
- Non-owner and non-admin users must receive authorization failure.
- Save operations by stale revision are rejected and must not overwrite latest version.

## Retention Rules

- While `DraftSubmission.status = IN_PROGRESS`, retain all related `DraftVersion` rows.
- On transition to `FINAL_SUBMITTED`, keep only the newest `DraftVersion` and its linked `DraftFileReference` records.
- Prune operations must be idempotent.
