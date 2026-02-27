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

### Validation Commands

```bash
npm test
npm run lint
```
