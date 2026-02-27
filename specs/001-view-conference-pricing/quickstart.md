# Quickstart: View Conference Pricing (UC-16)

## Inputs

- Spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/spec.md`
- Plan: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/plan.md`
- Research: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/research.md`
- Data model: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/data-model.md`
- Contract: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/contracts/pricing-api.openapi.yaml`

## 1. Implement MVC Files

Create and wire the planned MVC modules:

- `/home/m_srnic/ece493/lab2/ECE493Lab2/src/models/pricing-model.js`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/pricing-view.html`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/pricing-view.js`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/src/views/styles/pricing.css`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/src/controllers/pricing-controller.js`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/src/assets/js/pricing-page.js`

Implementation rules:

- HTML defines structure and semantic landmarks/messages.
- CSS handles styling/contrast/readability.
- JavaScript handles data retrieval, state transitions, and retry behavior.
- Controller triggers model retrieval on load and on user Try Again only.

## 2. Implement Contract Endpoints

Implement endpoints from `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/contracts/pricing-api.openapi.yaml`:

- `GET /pricing`
- `GET /api/public/pricing`

Behavior requirements:

- Return displayed pricing with configured conference currency only.
- Return missing-pricing message when no configuration exists.
- Return temporary-unavailability message + retry flag on transient retrieval failure.

## 3. Add Tests and Coverage Evidence

Create tests:

- `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/acceptance/uc16-pricing.spec.js`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/pricing-model.test.js`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/pricing-view.test.js`
- `/home/m_srnic/ece493/lab2/ECE493Lab2/tests/unit/pricing-controller.test.js`

Run verification commands from `/home/m_srnic/ece493/lab2/ECE493Lab2`:

```bash
npx vitest run
npx playwright test tests/acceptance/uc16-pricing.spec.js
npx c8 --reporter=text --reporter=lcov npx vitest run
```

## 4. Validate Acceptance and Constitution Gates

- Confirm scenarios in `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-16-AS.md` pass exactly as written.
- Confirm no regressions in previously passing acceptance suites.
- Record line coverage for in-scope JavaScript and document any uncovered lines with remediation if coverage is not 100%.
- Verify WCAG 2.1 AA contrast/readability and screen-reader perceivability for pricing details and status messages.
