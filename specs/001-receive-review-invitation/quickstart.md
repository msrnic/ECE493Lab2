# Quickstart: Reviewer Invitation Delivery (UC-07)

## Prerequisites

- Node.js 20+
- npm 10+
- Working directory: `/home/m_srnic/ece493/lab2/ECE493Lab2`

## 1. Verify Planned MVC Structure

Ensure implementation follows constitution rule III:

- Model files under `src/models/`
- View files under `src/views/` (`.html` structure, `.css` styling, `.js` behavior)
- Controller files under `src/controllers/`

## 2. Run the Feature Locally (After Implementation)

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm install
npm run dev
```

## 3. Exercise Core Invitation Flow

Trigger invitation dispatch when a reviewer assignment exists:

```bash
curl -X POST http://localhost:3000/api/reviewer-assignments/asg-1001/invitations \
  -H 'Content-Type: application/json' \
  -d '{"paperId":"paper-42","reviewerId":"rev-9"}'
```

Check invitation status:

```bash
curl http://localhost:3000/api/review-invitations/inv-1001
```

## 4. Exercise Retry and Failure Logging

Record a failed attempt callback:

```bash
curl -X POST http://localhost:3000/api/review-invitations/inv-1001/delivery-events \
  -H 'Content-Type: application/json' \
  -d '{
    "attemptId":"att-1",
    "eventType":"failed",
    "failureReason":"SMTP timeout",
    "occurredAt":"2026-02-08T12:00:00Z"
  }'
```

Run due retries:

```bash
curl -X POST http://localhost:3000/api/internal/review-invitations/retry-due \
  -H 'Content-Type: application/json' \
  -d '{"runAt":"2026-02-08T12:05:00Z"}'
```

Query failure logs as authorized editor/support/admin:

```bash
curl http://localhost:3000/api/papers/paper-42/invitation-failure-logs?page=1&pageSize=20 \
  -H 'Authorization: Bearer <token>'
```

## 5. Exercise Assignment-Removal Cancellation

```bash
curl -X POST http://localhost:3000/api/reviewer-assignments/asg-1001/invitations/cancel \
  -H 'Content-Type: application/json' \
  -d '{"reason":"assignment_removed","occurredAt":"2026-02-08T12:06:00Z"}'
```

Expected: invitation transitions to `canceled` and no further retries are created.

## 6. Validate Acceptance + Coverage

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm test
npx c8 --reporter=text --reporter=lcov npm test
```

Pass criteria:

- `Acceptance Tests/UC-07-AS.md` scenarios pass exactly as written
- In-scope JavaScript line coverage is 100%, or documented remediation if below 100%
- Coverage below 95% is blocked unless approved exception exists
