# Quickstart: Change Account Password (UC-03)

## Goal

Implement and verify the password-change feature using HTML/CSS/JavaScript with strict MVC boundaries, fully traceable to `UC-03` and `UC-03-AS`.

## Prerequisites

- Node.js 20+
- npm
- Existing authenticated user/session test fixtures

## 1. Create MVC scaffolding

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
mkdir -p src/models src/views src/controllers src/assets/css src/assets/js tests/acceptance tests/unit
```

## 2. Implement Model layer

- Add `src/models/password-policy-model.js` to enforce global policy plus `new != current`.
- Add `src/models/password-change-model.js` to coordinate credential update request payloads.
- Add `src/models/attempt-throttle-model.js` to enforce `5 failures in 10 minutes -> 10-minute block`.
- Add `src/models/session-model.js`, `src/models/notification-model.js`, and `src/models/audit-log-model.js` adapters for required side effects.

## 3. Implement View layer

- Add `src/views/password-change-view.html` for form definition and feedback placeholders.
- Add `src/assets/css/password-change.css` for presentation only.
- Add `src/views/password-change-view.js` for DOM rendering helpers and state display updates.

## 4. Implement Controller layer

- Add `src/controllers/password-change-controller.js` to:
  - Read form input from View.
  - Call Model validation and submission methods.
  - Handle success, rejection, throttled states, and retry flow.
  - Trigger View feedback updates without embedding business rules.

## 5. Wire entry point

- Add `src/assets/js/app.js` to bootstrap the password-change controller on page load.
- Ensure `src/index.html` loads the CSS and JS assets in a non-inline, maintainable way.

## 6. Implement acceptance and unit tests

- Acceptance:
  - `tests/acceptance/uc03-change-password.acceptance.test.js` must implement scenarios from `Acceptance Tests/UC-03-AS.md` exactly.
- Unit:
  - `tests/unit/password-change-model.test.js`
  - `tests/unit/attempt-throttle-model.test.js`
  - `tests/unit/password-change-controller.test.js`

## 7. Verify quality gates

Run project test and coverage commands (adapt names to package scripts in this repo):

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm run test:acceptance -- tests/acceptance/uc03-change-password.acceptance.test.js
npm run test:unit
npm run coverage
```

## 8. Regression and compliance checklist

- Re-run previously passing acceptance suites before merge.
- Confirm coverage evidence is recorded and near 100%; document any uncovered lines and remediation.
- Block merge if coverage falls below 95% without approved compliance exception.
- Confirm all artifacts and code references map back to `UC-03` and `UC-03-AS`.
