# Quickstart: View Final Schedule (UC-15)

## 1. Prepare workspace

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
mkdir -p src/models src/views src/controllers src/services src/assets/css src/assets/js tests/acceptance tests/unit
```

## 2. Implement MVC modules

- Model: create `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/final-schedule-model.js` for publication-state rules, session validation, and conference/local time derivation.
- View: create `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/final-schedule-view.js` for published schedule rendering and unpublished notice rendering.
- Controller: create `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/final-schedule-controller.js` to fetch data, compose model/view state, and handle refresh behavior.
- Service: create `/home/m_srnic/ece493/lab2/ECE493Lab2/src/services/final-schedule-api.js` using `GET /api/final-schedule`.
- HTML/CSS/JS wiring: create `/home/m_srnic/ece493/lab2/ECE493Lab2/src/index.html`, `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/final-schedule.css`, and `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/app.js`.

## 3. Implement acceptance and unit tests

- Acceptance: map `Acceptance Tests/UC-15-AS.md` into `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-15-final-schedule.acceptance.test.js`.
- Unit: add model/controller/view tests under `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/`.
- Include explicit checks for:
  - published schedule visible to unauthenticated viewer
  - unpublished notice visible to unauthenticated viewer without login
  - author highlighting in published state
  - both conference and local time labels for published sessions
  - authenticated author reaches schedule outcome within 2 actions after login
  - no session payload rendering in unpublished state

## 4. Run verification and collect evidence

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npx vitest run \
  tests/unit/final-schedule-model.test.js \
  tests/unit/final-schedule-view.test.js \
  tests/unit/final-schedule-controller.test.js \
  tests/unit/final-schedule-api.test.js \
  tests/unit/viewer-context-model.test.js \
  tests/unit/assets/final-schedule-app-bootstrap.test.js \
  tests/unit/app.node.test.js \
  tests/integration/final-schedule-integration.test.js \
  tests/acceptance/uc-15-final-schedule.acceptance.test.js

npx vitest run \
  tests/unit/assets/login-app-bootstrap.test.js \
  tests/unit/assets/password-change-app-bootstrap.test.js \
  tests/unit/final-schedule-model.test.js \
  tests/unit/final-schedule-view.test.js \
  tests/unit/final-schedule-controller.test.js \
  tests/unit/final-schedule-api.test.js \
  tests/unit/viewer-context-model.test.js \
  tests/unit/assets/final-schedule-app-bootstrap.test.js \
  tests/unit/app.node.test.js \
  tests/integration/final-schedule-integration.test.js \
  tests/acceptance/uc-15-final-schedule.acceptance.test.js \
  --coverage.enabled=true \
  --coverage.provider=v8 \
  --coverage.reporter=text \
  --coverage.reporter=json-summary \
  --coverage.include=src/models/final-schedule-model.js \
  --coverage.include=src/models/viewer-context-model.js \
  --coverage.include=src/services/final-schedule-api.js \
  --coverage.include=src/views/final-schedule-view.js \
  --coverage.include=src/controllers/final-schedule-controller.js \
  --coverage.include=src/assets/js/app.js \
  --coverage.thresholds.branches=100 \
  --coverage.thresholds.functions=100 \
  --coverage.thresholds.lines=100 \
  --coverage.thresholds.statements=100
```

## 5. Traceability checklist before merge

- `Use Cases/UC-15.md` behavior mapped to implementation modules.
- `Acceptance Tests/UC-15-AS.md` scenarios implemented exactly as written.
- Production behavior uses HTML/CSS/JavaScript only.
- MVC boundaries remain separated by folder and responsibility.
- Coverage evidence for in-scope JS is recorded, with remediation notes if below 100%.

## 6. Stakeholder clarity protocol (SC-006)

- Sample at least 20 authenticated authors after their first final-schedule page view.
- Ask one fixed prompt: "Is the schedule availability state clear on first view?"
- Allowed responses: `Yes` (positive) or `No` (negative).
- Compute `clarity_rate = yes_count / total_responses`.
- Pass criterion: `clarity_rate >= 0.95`.
- Record total sample size, yes/no counts, and computed rate in `specs/001-unpublished-schedule-notice/checklists/schedule.md`.
