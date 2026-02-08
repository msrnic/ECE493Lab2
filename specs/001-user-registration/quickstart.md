# Quickstart: Public User Registration (UC-01)

## Paths

- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Feature docs: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration`
- Contract: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/contracts/registration.openapi.yaml`

## Prerequisites

- Node.js 20 LTS
- npm 10+

## 1. Install dependencies

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm install
```

## 2. Start the application in development mode

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm run dev
```

## 3. Exercise UC-01 registration flow manually

1. Open the registration page (`/register`).
2. Submit valid details and verify account is created in `pending` status.
3. Verify confirmation email is sent or queued with pending-delivery message.
4. Submit missing/invalid fields and verify validation errors with no account creation.
5. Submit duplicate email and verify explicit duplicate-email guidance.
6. Exceed 5 attempts in 10 minutes for the same email and verify temporary block messaging.
7. Confirm email token and verify account transitions from `pending` to `active`.

## 4. Run acceptance + coverage evidence

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm test && npm run lint
```

## 5. Verify contract compliance

- Compare implemented request/response payloads with:
- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-registration/contracts/registration.openapi.yaml`
- Ensure all `4xx` error conditions map to FR-006, FR-009, FR-010, and FR-012.
