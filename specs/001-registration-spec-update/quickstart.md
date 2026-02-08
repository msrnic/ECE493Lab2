# Quickstart: User Registration Requirement Clarifications (UC-01)

## Paths

- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Feature docs: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-spec-update`
- Plan: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-spec-update/plan.md`
- Data model: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-spec-update/data-model.md`
- Contract: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-spec-update/contracts/registration.openapi.yaml`

## Prerequisites

- Node.js 20 LTS
- npm 10+

## 1. Install dependencies

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm install
```

## 2. Start application services

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm run dev
```

## 3. Validate primary registration flow (UC-01)

1. Open `/register` as a logged-out user.
2. Submit valid full name, unique email, and compliant password.
3. Verify account is created in `pending` status and confirmation-required feedback is shown.
4. Verify confirmation email is marked `sent` or `retry_pending`.

## 4. Validate clarified error and recovery behavior

1. Submit blank required fields and verify each error item is typed `missing`.
2. Submit malformed values and verify each error item is typed `invalid`.
3. Submit duplicate email and verify explicit duplicate-email guidance.
4. Trigger 6th attempt inside rolling 10-minute window and verify throttle message includes remaining time and exact unblock timestamp.
5. Simulate network interruption and re-submit with same `Idempotency-Key` within 15 minutes; verify original outcome replay and no additional account creation.
6. Confirm with invalid, expired, and reused tokens; verify account remains `pending` and recovery guidance is returned.
7. Exhaust email retry schedule and verify terminal delivery failure + successful recovery via `POST /api/v1/registrations/resend-confirmation`.

## 5. Run acceptance and coverage checks

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm test && npm run lint
```

## 6. Verify API contract alignment

- Validate implementation against:
- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-registration-spec-update/contracts/registration.openapi.yaml`
- Confirm status-code mapping for `201/200/403/409/422/429` (registration), `200/400/410/409` (confirmation), and `202/404/409` (resend confirmation).
