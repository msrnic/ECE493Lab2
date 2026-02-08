# Quickstart: UC-13 Schedule Generation

## Prerequisites
- Node.js 20 LTS
- Browser with ES2020 module support
- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`

## 1. Implement MVC Modules
- Models in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/`:
  - `GenerationRunModel.js`
  - `GeneratedScheduleModel.js`
  - `SessionAssignmentModel.js`
  - `ConflictFlagModel.js`
- Controllers in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/`:
  - `ScheduleGenerationController.js`
  - `ScheduleRunController.js`
  - `ScheduleReviewController.js`
- Views in `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/`:
  - `admin/schedule-generation.html`
  - `editor/schedule-conflicts.html`

## 2. Implement API Contract
Use `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-generate-session-schedule/contracts/schedule-generation.openapi.yaml` as the source of truth.
- `POST /api/schedule-runs`
- `GET /api/schedule-runs/{runId}`
- `GET /api/schedules`
- `GET /api/schedules/{scheduleId}`
- `GET /api/schedules/{scheduleId}/conflicts`

## 3. Validate Acceptance Behaviors (UC-13-AS)
1. Seed accepted papers and session slots.
2. Trigger generation as admin and confirm a schedule is produced.
3. Seed known rule violations and confirm conflicts are flagged.
4. Start one run and submit a second request; verify HTTP 409 with in-progress message.
5. Request conflicts as editor and verify full details are returned.
6. Execute multiple successful runs and verify version history with exactly one active schedule.

## 4. Validate Failure Handling
1. Remove accepted papers and trigger generation.
2. Verify failure outcome with clear reason and no new schedule version.

## 5. Run Test and Coverage Evidence
- Run acceptance suite mapped to UC-13 (`Acceptance Tests/UC-13-AS.md`).
- Run unit and integration tests for schedule models/controllers.
- Collect line coverage for in-scope JavaScript and target 100%.
- If coverage is below 100%, document line-level rationale and remediation plan.
- If coverage is below 95%, block merge until approved exception exists.
