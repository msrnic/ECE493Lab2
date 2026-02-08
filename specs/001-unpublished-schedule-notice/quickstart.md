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
  - no session payload rendering in unpublished state

## 4. Run verification and collect evidence

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm test
npx c8 --reporter=text --reporter=lcov npm test
```

## 5. Traceability checklist before merge

- `Use Cases/UC-15.md` behavior mapped to implementation modules.
- `Acceptance Tests/UC-15-AS.md` scenarios implemented exactly as written.
- Production behavior uses HTML/CSS/JavaScript only.
- MVC boundaries remain separated by folder and responsibility.
- Coverage evidence for in-scope JS is recorded, with remediation notes if below 100%.
