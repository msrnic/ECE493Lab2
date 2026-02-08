# Research: Public User Registration (UC-01)

## Scope

- Governing use case: `Use Cases/UC-01.md`
- Governing acceptance suite: `Acceptance Tests/UC-01-AS.md`
- Constitution constraints applied: HTML/CSS/JavaScript only, strict MVC boundaries, 100% line coverage target

## Decision 1: MVC module split across frontend and backend JavaScript

- Decision: Use separate `models/`, `views/`, and `controllers/` directories in both frontend and backend code paths.
- Rationale: Keeps validation and business rules in model modules, UI rendering in view modules, and event/request orchestration in controllers, satisfying constitution principle III.
- Alternatives considered: Single-page monolithic script (rejected due to cross-layer mixing), MVVM framework-first architecture (rejected to keep stack minimal and direct for UC-01).

## Decision 2: Registration and confirmation exposed as REST endpoints

- Decision: Define `GET /register`, `POST /api/v1/registrations`, and `POST /api/v1/registrations/confirm`.
- Rationale: Maps directly to user actions in UC-01 and keeps controller boundaries explicit; OpenAPI contract supports acceptance and integration testing.
- Alternatives considered: GraphQL mutation-only design (rejected because UC-01 flows are straightforward resource actions and REST is simpler for acceptance mapping).

## Decision 3: Duplicate-email protection through canonicalization plus uniqueness constraint

- Decision: Normalize email as `trim().toLowerCase()` before lookup/persistence and enforce a unique email constraint in the account model.
- Rationale: Prevents casing/whitespace variants from bypassing FR-009 duplicate checks.
- Alternatives considered: Case-sensitive equality checks (rejected because they allow duplicates), client-side-only duplicate checks (rejected because server remains source of truth).

## Decision 4: Throttling strategy for FR-010

- Decision: Track per-email attempt timestamps and block the 6th+ attempt inside a rolling 10-minute window with HTTP `429`.
- Rationale: Exactly matches FR-010 while being deterministic and easy to test with clock control.
- Alternatives considered: Global IP-only throttling (rejected because requirement is per email), fixed bucket reset windows (rejected because rolling window matches requirement wording better).

## Decision 5: Pending account lifecycle with token confirmation

- Decision: Create accounts in `pending` state and transition to `active` only after a valid, unconsumed confirmation token is submitted.
- Rationale: Implements FR-011 and keeps activation rule entirely in model state transition logic.
- Alternatives considered: Immediate activation on registration (rejected by clarification/FR-011), confirmation-link-only GET endpoint (rejected in favor of explicit POST confirmation contract for API testability).

## Decision 6: Email failure recovery via outbox and retry schedule

- Decision: On email send failure after account creation, persist an `EmailOutboxJob` in `retry_pending` state and return success with pending-delivery notice.
- Rationale: Satisfies FR-008 while preserving account creation and enabling eventual delivery retries.
- Alternatives considered: Rolling back account creation on email failure (rejected because FR-008 requires retaining pending account), no retry queue (rejected because automatic retries are required).

## Decision 7: Coverage and regression strategy

- Decision: Treat `UC-01-AS` as mandatory acceptance baseline; add unit tests for model/controller branches and enforce c8 100% line coverage goal with exception handling floor at 95%.
- Rationale: Aligns directly with constitution principle II and FR-007.
- Alternatives considered: Acceptance-only testing (rejected because it risks uncovered domain branches), lower default coverage threshold (rejected by constitution).

## Clarification Closure

- Remaining `NEEDS CLARIFICATION` items: None.
