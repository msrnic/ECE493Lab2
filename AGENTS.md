# ECE493Lab2 Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-08

## Active Technologies

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

HTML5, CSS3, JavaScript (ES2022 modules): Follow standard conventions

## Recent Changes

- 001-assign-reviewers: Added HTML5, CSS3, JavaScript (ES2022 modules) + Browser DOM APIs, Fetch API, server-side JavaScript REST services, JSON over HTTP
- 002-save-submission-draft: Added HTML5, CSS3, JavaScript (ES2020+) + Browser DOM APIs, Fetch API, FormData API, and the draft REST contract at `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/contracts/draft-api.openapi.yaml`
- 001-change-password: Added HTML5, CSS3, JavaScript (ES2020 modules) + Browser DOM and Fetch APIs; Node.js 20 + npm scripts; Jest + c8 coverage; Playwright acceptance automation
HTML5, CSS3, JavaScript (ES2020+): Follow standard conventions
- 001-user-login: Added HTML5, CSS3, JavaScript (ES2022, Node.js 20 runtime for server-side JavaScript) + Browser DOM APIs, Fetch API, Express 4.x auth endpoints, `express-session` for session state, `bcrypt` for password verification, Jest + Supertest + c8 for testing and line coverage
- 001-user-registration: Added HTML5, CSS3, JavaScript (ES2020+) + Browser DOM APIs, Fetch API, Node.js/Express HTTP layer, email provider adapter
<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
