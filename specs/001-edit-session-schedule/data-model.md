# Data Model: Edit Conference Schedule

## Entity: Schedule

- Description: Canonical conference schedule aggregate that editors modify.
- Fields:
  - `scheduleId` (string, UUID, required, immutable)
  - `version` (integer, required, increments by 1 on successful save)
  - `status` (enum: `draft`, `conflicted`, `ready_to_publish`, `published`)
  - `updatedAt` (string, ISO-8601 timestamp, required)
  - `updatedBy` (string, editor user ID, required on save)
- Validation Rules:
  - `version` must be >= 1.
  - `status=ready_to_publish` only when no unresolved conflicts exist.
  - `status=published` is blocked while unresolved conflicts exist (`FR-010`).

## Entity: SessionAssignment

- Description: Placement details for one session in a schedule.
- Fields:
  - `sessionId` (string, UUID, required, immutable)
  - `scheduleId` (string, UUID, required, foreign key -> `Schedule.scheduleId`)
  - `title` (string, required)
  - `startTime` (string, ISO-8601, required)
  - `endTime` (string, ISO-8601, required)
  - `roomId` (string, required)
  - `speakerIds` (array of string IDs, optional)
- Validation Rules:
  - `endTime` must be strictly after `startTime`.
  - `roomId` must reference a valid room.
  - Session must exist when save is attempted; missing session causes stale/unavailable block (`FR-007`).

## Entity: ConflictRecord

- Description: Persisted unresolved or resolved schedule conflict.
- Fields:
  - `conflictId` (string, UUID, required, immutable)
  - `scheduleId` (string, UUID, required, foreign key -> `Schedule.scheduleId`)
  - `conflictType` (enum: `time_overlap`, `room_collision`, `speaker_overlap`, `other`)
  - `sessionIds` (array of string session IDs, required, min length 2)
  - `status` (enum: `unresolved`, `resolved`)
  - `detectedAt` (string, ISO-8601 timestamp, required)
  - `lastUpdatedAt` (string, ISO-8601 timestamp, required)
- Validation Rules:
  - `status=unresolved` conflicts block publish/finalization (`FR-010`).
  - Unresolved conflicts may remain after override save and must be visibly flagged (`FR-009`).

## Entity: SaveAttempt

- Description: A request to persist schedule edits.
- Fields:
  - `saveAttemptId` (string, UUID, required, immutable)
  - `scheduleId` (string, UUID, required)
  - `expectedVersion` (integer, required)
  - `changes` (array of `SessionChange`, required, min length 1)
  - `result` (enum: `saved`, `warning_required`, `cancelled`, `stale_blocked`, `validation_failed`)
  - `createdAt` (string, ISO-8601 timestamp, required)
  - `editorId` (string, required)
- Validation Rules:
  - `expectedVersion` must match current `Schedule.version` or result is `stale_blocked` (`FR-007`).
  - If unresolved conflicts remain, result must be `warning_required` unless override flow is explicitly completed (`FR-005`, `FR-009`).

## Entity: OverrideAuditEntry

- Description: Immutable compliance record for override saves.
- Fields:
  - `auditEntryId` (string, UUID, required, immutable)
  - `scheduleId` (string, UUID, required)
  - `saveAttemptId` (string, UUID, required, foreign key -> `SaveAttempt.saveAttemptId`)
  - `editorId` (string, required)
  - `reason` (string, required, non-empty, trimmed)
  - `affectedConflictIds` (array of UUIDs, required, min length 1)
  - `savedVersion` (integer, required)
  - `createdAt` (string, ISO-8601 timestamp, required)
- Validation Rules:
  - `reason` must be non-empty and <= 500 characters (`FR-011`).
  - `editorId` must belong to authenticated Editor role.
  - `affectedConflictIds` must reference conflicts that were unresolved at save time.

## Relationships

- `Schedule` 1 -> many `SessionAssignment`
- `Schedule` 1 -> many `ConflictRecord`
- `Schedule` 1 -> many `SaveAttempt`
- `SaveAttempt` 0..1 -> 1 `OverrideAuditEntry`
- `OverrideAuditEntry` many -> many `ConflictRecord` (via `affectedConflictIds`)

## State Transitions

### Schedule lifecycle

1. `draft` -> `ready_to_publish`: successful save with zero unresolved conflicts.
2. `draft` -> `conflicted`: successful override save retains unresolved conflicts.
3. `conflicted` -> `ready_to_publish`: all conflicts resolved and saved.
4. `ready_to_publish` -> `published`: publish succeeds with no unresolved conflicts.
5. `conflicted` -> publish blocked (`FR-010`).

### Save attempt lifecycle

1. `created` -> `saved`: no unresolved conflicts and valid version.
2. `created` -> `warning_required`: unresolved conflicts found.
3. `warning_required` -> `cancelled`: editor cancels override.
4. `warning_required` -> `saved` with audit entry: editor confirms override with reason.
5. `created` -> `stale_blocked`: version/session availability mismatch.

## Traceability Mapping

- `FR-001`, `FR-002`, `FR-003`: `Schedule`, `SessionAssignment`, `SaveAttempt`
- `FR-004`, `FR-005`, `FR-006`: `ConflictRecord`, `SaveAttempt`
- `FR-007`: `SaveAttempt.expectedVersion`, stale-block result handling
- `FR-009`, `FR-011`: `OverrideAuditEntry`, override validation rules
- `FR-010`: `Schedule.status` + unresolved conflict guard
