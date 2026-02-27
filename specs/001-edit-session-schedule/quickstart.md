# Quickstart: Edit Conference Schedule (UC-14)

## Goal

Implement and validate schedule editing with conflict warnings, explicit override saves, stale-state blocking, and publish/finalization blocking while unresolved conflicts remain.

## Prerequisites

- Node.js 20+
- npm 10+
- Access to project root: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Authenticated Editor test user

## 1) Implement MVC UI modules

1. Create model modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models`:
   - `schedule-model.js`
   - `conflict-model.js`
   - `override-audit-model.js`
2. Create view modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views`:
   - `edit-schedule-view.js`
   - `conflict-warning-view.js`
3. Create controller modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers`:
   - `edit-schedule-controller.js`
   - `save-attempt-controller.js`
   - `publish-guard-controller.js`
4. Keep layer responsibilities strict:
   - HTML defines structure.
   - CSS defines visual style.
   - JavaScript defines behavior and flow control.

## 2) Implement API behavior from contract

Use `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-edit-session-schedule/contracts/openapi.yaml` as the source contract for:

- `GET /api/schedules/{scheduleId}`
- `POST /api/schedules/{scheduleId}/save-attempts`
- `POST /api/schedules/{scheduleId}/override-saves`
- `POST /api/schedules/{scheduleId}/publish-attempts`

## 3) Enforce domain rules

1. Validate save attempts against current schedule version.
2. Return conflict warning payloads before any conflicting save.
3. Require override reason and persist override audit metadata.
4. Block publish/finalization when unresolved conflicts remain.
5. Keep unsaved edits in client state after stale-save responses.

## 4) Verify acceptance behavior

1. Execute acceptance checks mapped to `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-14-AS.md`.
2. Add controller/model unit tests and API contract tests for save, override, stale, and publish-block paths.
3. Generate coverage report targeting 100% line coverage for in-scope JavaScript.

## 5) Suggested command sequence

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm install
npm test
npx c8 --reporter=text --reporter=html npm test
```

If repository scripts differ, map equivalent commands while keeping acceptance and coverage requirements unchanged.
