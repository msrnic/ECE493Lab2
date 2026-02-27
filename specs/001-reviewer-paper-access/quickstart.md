# Quickstart: Reviewer Paper Access (UC-08)

## 1. Prerequisites

- Repository: `/home/m_srnic/ece493/lab2/ECE493Lab2`
- Feature branch: `001-reviewer-paper-access`
- Governance inputs:
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-08.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-08-AS.md`
  - `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/memory/constitution.md`

## 2. Implement MVC Skeleton

Create the planned structure:

```bash
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/src/models
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/src/views
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/src/services
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/css
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/controllers
mkdir -p /home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/models
```

## 3. Implement Models

Add models from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/data-model.md`:

- `reviewer-access-entitlement.model.js`
- `paper-file-bundle.model.js`
- `paper-access-attempt.model.js`
- `outage-retry-window.model.js`

Each model should enforce its validation and state-transition rules.

## 4. Implement Controllers and Views

- Controllers:
  - `reviewer-paper-access.controller.js`
  - `paper-file-request.controller.js`
  - `outage-retry.controller.js`
  - `access-records.controller.js`
- Views:
  - `reviewer-paper-access.view.js`
  - `access-denied.view.js`
  - `temporary-unavailable.view.js`
  - `access-records.view.js`

Controller rules to enforce:
- Re-check entitlement on every file request.
- Keep currently displayed content if revocation happens mid-session, but deny all new file requests.
- During temporary outages allow one immediate retry, then throttle repeated retries to one per 5 seconds per reviewer-paper.

## 5. Wire API Contracts

Implement endpoints from:

- `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-reviewer-paper-access/contracts/openapi.yaml`

Required behavior:
- `200` for granted access.
- `403` for revoked or unauthorized access.
- `503` for temporary outage with immediate retry.
- `429` for repeated outage retries exceeding the 5-second window.

## 6. Verify Acceptance + Coverage

Build tests that map directly to `UC-08-AS` and FR-001 through FR-011:

- Acceptance: `tests/acceptance/uc-08-as.test.js`
- Unit: `tests/unit/controllers/*`, `tests/unit/models/*`

Run project test and coverage commands (examples):

```bash
node --test /home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/**/*.test.js
node --test /home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc-08-as.test.js
```

Coverage gate:
- Target 100% line coverage for in-scope project-owned JavaScript.
- If below 100%, document uncovered lines and remediation.
- Coverage below 95% is blocked unless an approved exception exists.

## 7. Regression Safety

Before merge:

- Re-run `UC-08-AS` tests and previously passing acceptance suites.
- Confirm no existing acceptance suite regresses.
- Confirm traceability remains from UC-08 -> FRs -> code modules -> acceptance tests.
