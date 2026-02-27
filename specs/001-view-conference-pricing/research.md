# Phase 0 Research: View Conference Pricing

## Inputs

- Feature spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-view-conference-pricing/spec.md`
- Constitution: `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/memory/constitution.md`
- Governing requirements: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-16.md`, `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-16-AS.md`

## Research Tasks Dispatched

- Research JavaScript testing and coverage tooling that supports 100% line-coverage evidence for MVC modules.
- Find best practices for HTML/CSS/JavaScript MVC separation on a public pricing page.
- Research REST integration patterns for read-only pricing retrieval with user-initiated retry and no automatic retries.
- Find best practices for WCAG 2.1 AA and screen-reader validation on informational pricing-state messaging.
- Research reliable currency-display handling for a single configured conference currency without conversion.

## Decisions

### Testing and Coverage Tooling

- Decision: Use Vitest for unit tests, Playwright for acceptance browser flows, and c8 for JavaScript line-coverage reporting.
- Rationale: This stack supports fast module-level tests, realistic browser behavior validation, and measurable line coverage against UC-16 project-owned JavaScript.
- Alternatives considered: Jest + Puppeteer (larger maintenance footprint for this repository), Mocha + nyc (more manual setup than Vitest + c8).

### MVC Implementation Pattern

- Decision: Keep pricing logic in `src/models/pricing-model.js`, rendering in `src/views/pricing-view.html`, `src/views/pricing-view.js`, `src/views/styles/pricing.css`, and orchestration in `src/controllers/pricing-controller.js`.
- Rationale: This enforces constitution-required separation where Models hold retrieval/normalization rules, Views own markup/styling/render details, and Controllers manage interaction flow.
- Alternatives considered: Single-page script with mixed DOM/API logic (rejected due to cross-layer mixing and weaker testability), component framework abstraction (not required for this scope).

### API Pattern for Initial Load and Retry

- Decision: Use `GET /api/public/pricing` as the canonical read endpoint; controller invokes the same endpoint on first render and on explicit Try Again clicks.
- Rationale: Retry is a repeated read operation in REST, so a GET call remains semantically correct while preserving the no-auto-retry requirement.
- Alternatives considered: Dedicated retry endpoint (not needed because no server-side mutation), GraphQL query endpoint (added complexity for a single read use case).

### Accessibility Verification Approach

- Decision: Implement semantic heading/list/message structure and ARIA live-region messaging, then validate with axe-core plus keyboard/screen-reader checks in acceptance testing.
- Rationale: FR-009 requires WCAG 2.1 AA readability/contrast and perceivability; static semantics plus automated accessibility checks provide repeatable evidence.
- Alternatives considered: Manual-only accessibility review (insufficient repeatability), CSS-only adjustments without semantic ARIA signals (insufficient for assistive technologies).

### Currency and Discount Display Rules

- Decision: Format amounts with `Intl.NumberFormat` using only the configured conference currency and render discount values only when precomputed discount amounts are present in pricing configuration.
- Rationale: Satisfies FR-006 and FR-008 by preventing dynamic discount computation and per-user currency conversion.
- Alternatives considered: Per-locale currency conversion (violates FR-008), runtime discount-rule evaluation in controller/model (violates FR-006 scope).

## Clarification Resolution Status

All Technical Context unknowns are resolved by decisions above; no `NEEDS CLARIFICATION` items remain for Phase 1 design.
