# Quickstart: Reviewer Invitation Delivery (UC-07)

## Prerequisites

- Node.js 20+
- npm 10+
- Working directory: `/home/m_srnic/ece493/lab2/ECE493Lab2`

## 1. Start Service

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm install
npm run dev
```

## 2. Trigger Invitation Delivery

```bash
curl -X POST http://localhost:3000/api/reviewer-assignments/asg-1001/invitations \
  -H 'Content-Type: application/json' \
  -d '{"paperId":"paper-42","reviewerId":"rev-9"}'
```

## 3. Read Invitation Status

```bash
curl http://localhost:3000/api/review-invitations/inv-1001
```

Optional status view page:

- `http://localhost:3000/views/invitation-status/invitation-status.html?invitationId=inv-1001`

## 4. Record Delivery Callback and Retry Due

```bash
curl -X POST http://localhost:3000/api/review-invitations/inv-1001/delivery-events \
  -H 'Content-Type: application/json' \
  -d '{
    "attemptId":"att-1",
    "eventType":"failed",
    "failureReason":"SMTP timeout",
    "occurredAt":"2026-02-08T12:00:00Z"
  }'

curl -X POST http://localhost:3000/api/internal/review-invitations/retry-due \
  -H 'Content-Type: application/json' \
  -d '{"runAt":"2026-02-08T12:05:00Z"}'
```

## 5. Cancel On Assignment Removal

```bash
curl -X POST http://localhost:3000/api/reviewer-assignments/asg-1001/invitations/cancel \
  -H 'Content-Type: application/json' \
  -d '{"reason":"assignment_removed","occurredAt":"2026-02-08T12:06:00Z"}'
```

## 6. Query Failure Logs (RBAC)

```bash
curl http://localhost:3000/api/papers/paper-42/invitation-failure-logs?page=1&pageSize=20 \
  -H 'x-user-role: support'
```

Optional failure log view page:

- `http://localhost:3000/views/failure-log/failure-log.html?paperId=paper-42&role=support`

## 7. Reviewer Inbox + Decisions

```bash
curl http://localhost:3000/api/reviewer/invitations
curl -X POST http://localhost:3000/api/reviewer/invitations/inv-1001/accept
curl -X POST http://localhost:3000/api/reviewer/invitations/inv-1001/decline
```

## 8. Verification Commands

```bash
npx vitest run --coverage=false tests/acceptance/uc07-review-invitation.acceptance.test.js
npx vitest run --coverage=false tests/unit tests/integration
npm run test:coverage:c8
```
