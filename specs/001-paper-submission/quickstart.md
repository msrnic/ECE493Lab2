# Quickstart: Author Paper Submission (UC-04)

## 1. Navigate to Project Root

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
```

## 2. Create MVC Skeleton

```bash
mkdir -p src/models src/views/partials src/controllers src/assets/css src/assets/js
mkdir -p tests/acceptance tests/unit/models tests/unit/controllers tests/coverage
```

## 3. Implement Planned Modules

- Models:
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/submission-model.js`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/file-model.js`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/session-state-model.js`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/deduplication-model.js`
- Controllers:
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/submission-controller.js`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/upload-controller.js`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/status-controller.js`
- Views and assets:
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper.html`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/submit-paper-view.js`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css/submit-paper.css`,
  `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/submit-paper-page.js`

## 4. Implement API from Contract

Use `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-paper-submission/contracts/openapi.yaml`
to implement:

- `POST /api/v1/submissions`
- `POST /api/v1/submissions/{submissionId}/files`
- `POST /api/v1/submissions/{submissionId}/validate`
- `POST /api/v1/submissions/{submissionId}/submit`
- `GET /api/v1/submissions/{submissionId}`

## 5. Run Acceptance and Coverage Gates

- Execute UC-04 acceptance behavior exactly as written in
  `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-04-AS.md`.
- Run regression checks for previously passing acceptance suites in
  `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/`.
- Enforce project-owned JavaScript line coverage:
  - Target: `100%`
  - Hard floor: `95%` (requires approved exception if lower)

## 6. Verify Traceability Before Merge

- Ensure FR-001..FR-014 map to UC-04 and UC-04-AS in specs, tasks, code comments, and tests.
- Confirm MVC boundaries remain intact:
  - Models own rules/state
  - Views own rendering
  - Controllers own interaction flow
