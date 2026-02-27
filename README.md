# ECE493Lab2

Project files for the CMS Project in ECE 493 Lab 2.

## Implementation Baseline

- Functional requirements come from `Use Cases/UC-XX.md`.
- Acceptance criteria come from `Acceptance Tests/UC-XX-AS.md`.
- Acceptance validation must include coverage evidence targeting 100% line coverage for
  project-owned JavaScript (or documented exception as close to 100% as possible).
- Implementation stack is HTML, CSS, and JavaScript.
- Architecture is Model-View-Controller (MVC).
- All scoped use cases and acceptance suites must be implemented exactly as specified.

See `lab2/.specify/memory/constitution.md` for full governance and delivery rules.

## Registration Feature (UC-01)

### MVC Module Ownership

- Models (`src/models/`): Persistence gateway, validation, normalization, attempt throttling, token lifecycle, and state-transition models.
- Views (`src/views/`): Registration form rendering and registration outcome messaging.
- Controllers (`src/controllers/`): Page rendering, registration orchestration, confirmation orchestration, and email-delivery retry handling.
- Browser assets (`src/assets/`): Client-side validation, submission flow, and validation timing instrumentation.

### Entry Points

- App factory: `src/app.js`
- Runtime bootstrap: `src/server.js`
- Registration page: `GET /register`
- Registration API: `POST /api/registrations`
- Confirmation API: `GET /api/registrations/confirm?token=...`

### Test Layout

- Acceptance: `tests/acceptance/uc-01-registration.acceptance.test.js`
- Integration contracts: `tests/integration/*.test.js`
- Unit: `tests/unit/*.test.js`

## Login Feature (UC-02)

### MVC Module Ownership

- Models (`src/models/`): Credential normalization, authentication session state, and failed-login tracking.
- Views (`src/views/`): Login page rendering, dashboard page rendering, and login error-message resolution.
- Controllers (`src/controllers/`): Login request/session flow (browser), plus auth API handlers (server).
- Browser assets (`src/assets/`): Login bootstrap logic and styling.

### Entry Points

- Login page: `GET /login`
- Dashboard page (authenticated): `GET /dashboard`
- Login API: `POST /api/auth/login`
- Session API: `GET /api/auth/session`

### Test Layout

- Acceptance: `tests/acceptance/uc-02-login.acceptance.test.js`
- Integration contract: `tests/integration/auth-api.integration.test.js`
- Performance profile: `tests/integration/auth-api.performance.test.js`
- Unit:
  - `tests/unit/models/*.test.js`
  - `tests/unit/controllers/*.test.js`
  - `tests/unit/views/*.test.js`
  - `tests/unit/assets/*.test.js`

### Validation Commands

```bash
npm test
npm run lint
npm run test:acceptance:uc02
npm run test:integration:auth
npm run test:performance:auth
```
