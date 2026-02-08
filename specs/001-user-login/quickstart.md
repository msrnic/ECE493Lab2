# Quickstart: User Login Access (UC-02)

## Goal

Implement and verify UC-02 login behavior using HTML/CSS/JavaScript with MVC separation.

## Governing References

- Use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-02.md`
- Acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-02-AS.md`
- Feature spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md`
- Plan: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/plan.md`
- API contract: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/contracts/openapi.yaml`

## 1. Create MVC Skeleton

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
mkdir -p src/views src/controllers src/models src/assets/css src/assets/js
mkdir -p server/routes server/controllers server/models
mkdir -p tests/acceptance tests/integration tests/unit/models tests/unit/controllers
```

## 2. Implement View Layer (HTML + CSS)

- Define login markup in `src/index.html`.
- Keep styling in `src/assets/css/login.css`.
- Do not place authentication rules in HTML or CSS.

## 3. Implement Model Layer (JavaScript)

- Front-end models:
  - `src/models/credential-submission-model.js`
  - `src/models/auth-session-model.js`
- Server models:
  - `server/models/user-account-model.js`
  - `server/models/failed-login-tracker-model.js`
- Enforce:
  - normalized email handling
  - lockout after 5 failed attempts for 10 minutes
  - failed-attempt reset immediately after successful login

## 4. Implement Controller Layer (JavaScript)

- Front-end controllers:
  - `src/controllers/login-controller.js`
  - `src/controllers/session-controller.js`
- Server controllers/routes:
  - `server/controllers/auth-controller.js`
  - `server/routes/auth-routes.js`
- Wire these endpoints:
  - `POST /api/auth/login`
  - `GET /api/auth/session`

## 5. Enforce Requirement-Critical Responses

- Invalid credentials always return `Invalid email or password.`.
- Temporary lockout returns `429` with retry metadata.
- Successful login authenticates session and enables dashboard access.

## 6. Verify Acceptance and Coverage

- Implement acceptance tests for both scenarios in `Acceptance Tests/UC-02-AS.md`.
- Add unit and integration tests for model/controller logic and endpoint behaviors.
- Run tests and coverage (example command set once scripts exist):

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm test
npx c8 --reporter=text --reporter=lcov npm test
```

## 7. Compliance Checklist Before Merge

- UC-02 behaviors map to implementation modules and tests.
- UC-02-AS scenarios pass exactly as written.
- JavaScript line coverage for in-scope code is 100%, or documented remediation exists and remains >=95% unless exception approved.
- MVC boundaries remain intact: Models manage rules/state, Views render UI, Controllers handle flow.
