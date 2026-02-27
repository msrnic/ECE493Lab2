# Quickstart: Implement UC-17 Registration Payment

## Goal

Implement `Use Cases/UC-17.md` with strict HTML/CSS/JavaScript MVC separation and verify
`Acceptance Tests/UC-17-AS.md` plus coverage requirements.

## Prerequisites

- Node.js 20+ and npm 10+
- Gateway sandbox credentials that support hosted/tokenized checkout and webhook callbacks
- Auth/session fixture data for a logged-in attendee at the payment step

## 1. Prepare MVC file layout

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
mkdir -p src/models src/controllers src/views src/assets/css src/assets/js
mkdir -p tests/acceptance tests/unit/models tests/unit/controllers
```

## 2. Implement model layer first

- Add session and attempt state rules in `src/models/registration-session-model.js`.
- Add payment attempt lifecycle and idempotency checks in `src/models/payment-attempt-model.js`.
- Add retry/cooldown logic in `src/models/retry-policy-model.js`.
- Add pending reconciliation event handling in `src/models/reconciliation-event-model.js`.

## 3. Implement controller orchestration

- `src/controllers/payment-controller.js`:
  accept tokenized submissions, apply idempotency, call gateway adapter, persist outcome.
- `src/controllers/payment-status-controller.js`:
  expose attempt/session status for pending polling and confirmation rendering.
- `src/controllers/gateway-webhook-controller.js`:
  verify signature, reconcile pending attempts, finalize outcome transitions.

## 4. Implement HTML/CSS/JS view layer

- `src/views/payment.html`: hosted payment fields container, submit CTA, retry messaging region.
- `src/views/confirmation.html`: approved state confirmation and complete registration summary.
- `src/assets/css/payment.css`: payment flow styling and cooldown/pending state presentation.
- `src/assets/js/payment-view.js`: view-only event wiring and DOM updates (no business rules).

## 5. Wire API behavior to contract

- Implement endpoints in `specs/001-registration-payment/contracts/openapi.yaml`.
- Ensure duplicate submit requests with same `sessionId + Idempotency-Key` return original result.
- Block retries while attempt is pending and during cooldown.
- Ensure only approved outcomes transition registration to `complete`.

## 6. Verify acceptance and coverage

```bash
cd /home/m_srnic/ece493/lab2/ECE493Lab2
npm test -- tests/acceptance/uc17-registration-payment.acceptance.test.js
npm run test:coverage
```

Verification criteria:
- `Acceptance Tests/UC-17-AS.md` scenarios pass exactly as written.
- Coverage for in-scope JavaScript targets 100%; below 95% is blocked without exception.
- No storage, processing, or transmission of raw cardholder data is observed.

## 7. Regression pass before merge

- Re-run previously passing acceptance suites for UC-01 through UC-16.
- Confirm no behavioral regression outside UC-17 scope.
