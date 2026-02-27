# Quickstart: Public User Registration

## Scope

- Feature branch: `001-user-registration`
- Spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/spec.md`
- Use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-01.md`
- Acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-01-AS.md`

## 1. Implement MVC Modules

1. Create model modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models`:
   - `user-account-model.js`
   - `registration-attempt-model.js`
   - `email-delivery-job-model.js`
2. Create view modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views`:
   - `registration-view.js`
   - `registration-status-view.js`
3. Create controller modules under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers`:
   - `registration-controller.js`
   - `confirmation-controller.js`
4. Keep production behavior in HTML/CSS/JavaScript only.

## 2. Implement Contracted Endpoints

1. Serve `GET /register` for the public form view.
2. Implement `POST /api/registrations` with:
   - Required field validation
   - Password policy checks
   - Duplicate-email rejection (`409`)
   - Per-email throttling (`429` after 5 attempts/10 minutes)
   - Pending account creation (`201`)
   - Email send or retry queue outcome
3. Implement `GET /api/registrations/confirm?token=...` for pending-to-active activation.

## 3. Verify Core Flows Quickly

### Successful registration

```bash
curl -i -X POST http://localhost:3000/api/registrations \
  -H 'Content-Type: application/json' \
  -d '{
    "fullName": "Test User",
    "email": "test.user@example.com",
    "password": "StrongPass!2026",
    "confirmPassword": "StrongPass!2026"
  }'
```

Expected: `201`, `status: pending`, and `emailDelivery` of `sent` or `queued_retry`.

### Missing/invalid field handling

```bash
curl -i -X POST http://localhost:3000/api/registrations \
  -H 'Content-Type: application/json' \
  -d '{"fullName":"","email":"bad","password":"weak","confirmPassword":"weak"}'
```

Expected: `422` with field-level validation errors and no account creation.

### Duplicate email

Submit the same normalized email twice. Expected second response: `409` with explicit
`Email already registered` guidance.

### Throttling

Submit >5 attempts for same normalized email within 10 minutes. Expected: `429` and temporary
block messaging.

### Confirmation activation

Use confirmation token URL from email job. Expected: account transitions from `pending` to
`active`.

## 4. Run Implementation and Test Commands

```bash
npm install
npm test
npm run lint
```

- `npm test` executes unit, integration, and acceptance suites with enforced 100% branch coverage.
- `npm run lint` must pass with zero errors before merge.

## 5. Endpoint Contract Verification

- `tests/integration/register-page.contract.test.js` verifies `GET /register`.
- `tests/integration/create-registration.contract.test.js` verifies `POST /api/registrations` (`201/409/422/429`).
- `tests/integration/confirm-registration.contract.test.js` verifies `GET /api/registrations/confirm` (`200/400/410`).
- `tests/integration/registration-latency.test.js` verifies server p95 (`<=1000ms`) and client validation p95 (`<=200ms`).

## 6. Usability Protocol (SC-004, SC-005)

1. Recruit at least 10 first-time participants who have not seen the registration flow before.
2. Provide one task only: create an account using the registration page without assistance.
3. Measure:
   - First-attempt completion success (target: at least 90%).
   - Completion time from form-visible to successful `201` response (target: at least 90% of successful attempts in 2 minutes or less).
4. Record participant-level outcomes in `specs/001-user-registration/checklists/registration.md`.

## 7. Regression Safety

- Re-run previously passing acceptance suites after UC-01 changes.
- Reject merge on any regression unless behavior was formally amended.
