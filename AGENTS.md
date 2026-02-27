# ECE493Lab2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-08

## Active Technologies

- HTML5, CSS3, JavaScript (ES2020+; Node.js 20 LTS runtime for server-side JavaScript) + Browser DOM APIs, Fetch API, Node.js HTTP runtime, Express.js routing, JSON schema validation for request payloads (001-generate-session-schedule)
- HTML5, CSS3, JavaScript (ES2022 for browser + Node.js 20 LTS runtime) + Node.js runtime, Express-style routing/controllers, SMTP email adapter (Nodemailer-compatible), server-rendered HTML views with static CSS/JS assets (001-notification-delivery-retry)
- HTML5, CSS3, JavaScript (ES2022) + Browser DOM APIs, Fetch API, server-side JavaScript HTTP handlers, JSON payload validation (001-editor-decision)
- HTML5, CSS3, JavaScript (ES2022), Node.js 20 LTS + Browser DOM APIs, Fetch API, Express 5 REST routing, Jest 29, Supertest, c8 coverage tooling (001-view-paper-reviews)
- HTML5, CSS3, JavaScript (ES2022), Node.js 20 + Express 4 (API routing), Vanilla DOM APIs (view rendering/events), Ajv 8 (shared validation schema), Vitest + Supertest + c8 (unit/integration/coverage) (001-review-submission-validation)
- HTML5, CSS3, JavaScript (ES2022 modules) + Browser DOM APIs, Fetch API, FormData API, Node.js `node:test` for automated tests, Istanbul/c8-compatible line-coverage reporting (001-reviewer-paper-access)
- HTML5, CSS3, JavaScript (ES2022; Node.js 20 for server-side controllers/jobs) + Vanilla JS modules, browser Fetch/DOM APIs, Node.js timers for retry scheduling, OpenAPI 3.1 for API contracts (001-receive-review-invitation)
- HTML5, CSS3, JavaScript (ES2022 modules) + Browser DOM APIs, Fetch API, server-side JavaScript REST services, JSON over HTTP (001-assign-reviewers)
- HTML5, CSS3, JavaScript (ES2020+) + Browser DOM APIs, Fetch API, FormData API, and the draft REST contract at `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml` (002-save-submission-draft)
- HTML5, CSS3, JavaScript (ES2022) + Browser File API, Fetch API, FormData, Node.js 20 LTS + Express 4, (001-paper-submission)
- Relational persistence for submission metadata/status + object storage for uploaded files + (001-paper-submission)
- HTML5, CSS3, JavaScript (ES2020 modules) + Browser DOM and Fetch APIs; Node.js 20 + npm scripts; Jest + c8 coverage; Playwright acceptance automation (001-change-password)
- HTML5, CSS3, JavaScript (ES2022, Node.js 20 runtime for server-side JavaScript) + Browser DOM APIs, Fetch API, Express 4.x auth endpoints, `express-session` for session state, `bcrypt` for password verification, Jest + Supertest + c8 for testing and line coverage (001-user-login)
- Registered account records from project-owned account storage, server-side session store for authentication state, and failed-attempt tracker keyed by normalized email with `blockedUntil` timestamp (001-user-login)
- HTML5, CSS3, JavaScript (ES2020+) + Browser DOM APIs, Fetch API, Node.js/Express HTTP layer, email provider adapter (001-user-registration)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

HTML5, CSS3, JavaScript (ES2022), Node.js 20 LTS: Follow standard conventions

## Recent Changes

- 001-generate-session-schedule: Added HTML5, CSS3, JavaScript (ES2020+; Node.js 20 LTS runtime for server-side JavaScript) + Browser DOM APIs, Fetch API, Node.js HTTP runtime, Express.js routing, JSON schema validation for request payloads
- 001-notification-delivery-retry: Added HTML5, CSS3, JavaScript (ES2022 for browser + Node.js 20 LTS runtime) + Node.js runtime, Express-style routing/controllers, SMTP email adapter (Nodemailer-compatible), server-rendered HTML views with static CSS/JS assets
- 001-editor-decision: Added HTML5, CSS3, JavaScript (ES2022) + Browser DOM APIs, Fetch API, server-side JavaScript HTTP handlers, JSON payload validation
- 001-view-paper-reviews: Added HTML5, CSS3, JavaScript (ES2022), Node.js 20 LTS + Browser DOM APIs, Fetch API, Express 5 REST routing, Jest 29, Supertest, c8 coverage tooling
- 001-review-submission-validation: Added HTML5, CSS3, JavaScript (ES2022), Node.js 20 + Express 4 (API routing), Vanilla DOM APIs (view rendering/events), Ajv 8 (shared validation schema), Vitest + Supertest + c8 (unit/integration/coverage)
- 001-reviewer-paper-access: Added HTML5, CSS3, JavaScript (ES2022 modules) + Browser DOM APIs, Fetch API, FormData API, Node.js `node:test` for automated tests, Istanbul/c8-compatible line-coverage reporting
- 001-receive-review-invitation: Added HTML5, CSS3, JavaScript (ES2022; Node.js 20 for server-side controllers/jobs) + Vanilla JS modules, browser Fetch/DOM APIs, Node.js timers for retry scheduling, OpenAPI 3.1 for API contracts
- 001-assign-reviewers: Added HTML5, CSS3, JavaScript (ES2022 modules) + Browser DOM APIs, Fetch API, server-side JavaScript REST services, JSON over HTTP
- 002-save-submission-draft: Added HTML5, CSS3, JavaScript (ES2020+) + Browser DOM APIs, Fetch API, FormData API, and the draft REST contract at `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`
- 001-change-password: Added HTML5, CSS3, JavaScript (ES2020 modules) + Browser DOM and Fetch APIs; Node.js 20 + npm scripts; Jest + c8 coverage; Playwright acceptance automation
HTML5, CSS3, JavaScript (ES2020+): Follow standard conventions
- 001-user-login: Added HTML5, CSS3, JavaScript (ES2022, Node.js 20 runtime for server-side JavaScript) + Browser DOM APIs, Fetch API, Express 4.x auth endpoints, `express-session` for session state, `bcrypt` for password verification, Jest + Supertest + c8 for testing and line coverage
- 001-user-registration: Added HTML5, CSS3, JavaScript (ES2020+) + Browser DOM APIs, Fetch API, Node.js/Express HTTP layer, email provider adapter
<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
