# Quickstart: Author Decision Notifications (UC-12)

## 1. Prerequisites

- Repository root: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Feature branch: `001-notification-delivery-retry`
- Runtime: Node.js 20+ and npm
- Governing documents:
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-12.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-12-AS.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/memory/constitution.md`

## 2. Create MVC Skeleton

1. Create model files under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/`:
   - `finalized-decision-model.js`
   - `decision-notification-model.js`
   - `delivery-attempt-model.js`
   - `unresolved-failure-model.js`
2. Create controllers under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/`:
   - `notification-controller.js`
   - `admin-failure-log-controller.js`
3. Create views under `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/`:
   - `admin-failure-list.html`
   - `admin-failure-detail.html`
4. Add styling to `/home/m_srnic/ece493/lab2/ECE493Lab2/public/css/admin-failures.css`.
5. Add browser behavior to `/home/m_srnic/ece493/lab2/ECE493Lab2/public/js/admin-failures-controller.js`.

## 3. Implement Feature Flow

1. Implement FR-001 to FR-003 in `notification-controller.js`:
   - On finalized decision trigger, create one `DecisionNotification` and attempt email delivery.
2. Implement FR-005 to FR-008:
   - Detect failed initial delivery.
   - Trigger exactly one retry (attempt 2 only).
   - Enforce dedupe key to prevent duplicate sends.
3. Implement FR-007/FR-010/FR-013:
   - Persist unresolved failure record with mandatory fields and 1-year retention timestamp.
4. Implement FR-012:
   - Restrict failure-log routes and pages to administrators.

## 4. Align to Contract

- Implement endpoints defined in `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-notification-delivery-retry/contracts/notification-delivery-api.yaml`.
- Ensure internal endpoints require service credentials.
- Ensure admin endpoints require authenticated administrator role.

## 5. Verification

1. Run acceptance scenarios from `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-12-AS.md`.
2. Run regression acceptance suites for previously passing use cases.
3. Run unit/integration tests for retry, dedupe, and admin authorization boundaries.
4. Generate JavaScript line coverage and target 100%; if below 100%, document uncovered lines and remediation plan; below 95% requires approved exception.

## 6. Evidence to Capture

- Acceptance pass/fail logs for UC-12 and regression suites.
- Coverage report for all UC-12-scoped JavaScript modules.
- Sample unresolved failure record showing required FR-010 fields.
- Authorization test evidence showing non-admin denial and admin access success.
