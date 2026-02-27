# Phase 1 Data Model: Conference Schedule Generation

## Entity: AcceptedPaper
- Description: Paper eligible for scheduling after acceptance.
- Fields:
  - `paperId` (string, required, immutable)
  - `title` (string, required)
  - `trackId` (string, required)
  - `durationMinutes` (integer, required, >0)
  - `authorIds` (string[], required, min length 1)
  - `preferenceTags` (string[], optional)
  - `status` (enum: `accepted`, required)
- Validation rules:
  - Only records with `status=accepted` enter generation input.
  - Missing required scheduling metadata triggers generation failure reason (FR-006).

## Entity: SessionSlot
- Description: Conference slot available for assignment.
- Fields:
  - `sessionSlotId` (string, required, immutable)
  - `trackId` (string, required)
  - `roomId` (string, required)
  - `startAt` (datetime, required)
  - `endAt` (datetime, required)
  - `capacity` (integer, required, >0)
- Validation rules:
  - `endAt` must be later than `startAt`.
  - Slot must exist and be open for assignment during generation.

## Entity: GenerationRun
- Description: One administrator-initiated attempt to generate a schedule.
- Fields:
  - `runId` (string, required, immutable)
  - `initiatedByUserId` (string, required)
  - `initiatedByRole` (enum: `admin`, required)
  - `requestedAt` (datetime, required)
  - `startedAt` (datetime, optional)
  - `completedAt` (datetime, optional)
  - `status` (enum: `requested`, `in_progress`, `completed`, `failed`, `rejected`, required)
  - `failureReason` (string, optional)
  - `inProgressMessage` (string, optional)
  - `generatedScheduleId` (string, optional)
- Validation rules:
  - Only one run may be `in_progress` at any time (FR-011).
  - Non-admin initiators are rejected.
  - If no accepted papers exist, run transitions to `failed` with explicit reason (FR-006).

## Entity: GeneratedSchedule
- Description: Versioned schedule output for a successful run.
- Fields:
  - `scheduleId` (string, required, immutable)
  - `runId` (string, required, unique)
  - `versionNumber` (integer, required, monotonic increasing)
  - `isActive` (boolean, required)
  - `createdAt` (datetime, required)
  - `createdByUserId` (string, required)
  - `assignmentCount` (integer, required, >=0)
  - `conflictCount` (integer, required, >=0)
- Validation rules:
  - Exactly one schedule may have `isActive=true` (FR-013).
  - Every successful run creates exactly one new schedule version (FR-003, FR-013).

## Entity: SessionAssignment
- Description: Mapping of one accepted paper to one session slot in a generated schedule.
- Fields:
  - `assignmentId` (string, required, immutable)
  - `scheduleId` (string, required)
  - `paperId` (string, required)
  - `sessionSlotId` (string, required)
  - `orderInSlot` (integer, required, >=1)
  - `createdAt` (datetime, required)
- Validation rules:
  - `paperId` and `sessionSlotId` must reference existing entities.
  - A paper may have only one assignment per schedule version.

## Entity: ConflictFlag
- Description: Recorded scheduling rule violation generated during a run.
- Fields:
  - `conflictFlagId` (string, required, immutable)
  - `runId` (string, required)
  - `scheduleId` (string, required)
  - `violationType` (enum: `assignment_conflict`, `optimization_mismatch`, `preference_mismatch`, `metadata_violation`, required)
  - `ruleId` (string, required)
  - `paperId` (string, required)
  - `sessionSlotId` (string, optional)
  - `severity` (enum: `info`, `warning`, `critical`, required)
  - `details` (string, required)
  - `dedupKey` (string, required)
  - `createdAt` (datetime, required)
- Validation rules:
  - Unique `(runId, dedupKey)` to prevent duplicates (FR-008).
  - Must include violation type and impacted assignment references (FR-007).
  - Visible to administrators and editors (FR-007, FR-012).

## Relationships
- `GenerationRun (1) -> (0..1) GeneratedSchedule`.
- `GeneratedSchedule (1) -> (0..*) SessionAssignment`.
- `GeneratedSchedule (1) -> (0..*) ConflictFlag`.
- `AcceptedPaper (1) -> (0..*) SessionAssignment` across versions.
- `SessionSlot (1) -> (0..*) SessionAssignment` across versions.
- `GenerationRun (1) -> (0..*) ConflictFlag`.

## State Transitions

### GenerationRun
1. `requested -> in_progress` when lock acquired and prerequisites pass.
2. `requested -> rejected` when another run is already `in_progress` (FR-011).
3. `in_progress -> completed` when schedule is created and version stored.
4. `in_progress -> failed` when prerequisites/processing fail (FR-006).

### GeneratedSchedule Activation
1. New successful run creates next `versionNumber` with `isActive=true`.
2. Previously active version transitions to `isActive=false` atomically.
3. Failed/rejected runs do not create schedule versions.
