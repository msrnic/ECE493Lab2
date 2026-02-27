# Phase 0 Research: User Login Access (UC-02)

## Scope

- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-02.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-02-AS.md`
- Feature spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/001-user-login/spec.md`

## Research Tasks Dispatched

1. Research best-practice MVC boundaries for a JavaScript web login flow using HTML/CSS/JS.
2. Research per-account throttling pattern for 5 failed attempts with a 10-minute block window.
3. Research secure authentication endpoint behavior that preserves generic invalid-credential messaging.
4. Research integration pattern between front-end controllers and server auth endpoints.
5. Research test and coverage strategy for 100% line coverage of in-scope JavaScript.

## Findings

### 1. MVC Layering for Login Flow

- Decision: Implement browser-side MVC for UI interaction and server-side MVC for authentication/lockout rules, with both layers in JavaScript.
- Rationale: This keeps HTML for structure, CSS for style, and JavaScript for behavior while preserving constitutional separation of concerns.
- Alternatives considered: Single-layer front-end-only login logic (rejected because it weakens credential and lockout enforcement), server-rendered monolith with mixed templates/controllers (rejected because boundaries become less explicit).

### 2. Authentication Session Strategy

- Decision: Use server-managed session state and session cookie (`HttpOnly`; `Secure` in non-local environments), with session checks exposed via `GET /api/auth/session`.
- Rationale: Server sessions support reliable logged-in/logged-out state and simplify redirect behavior for already-authenticated users.
- Alternatives considered: JWT in browser storage (rejected for this scope due to additional token lifecycle complexity), client-only in-memory auth flag (rejected because it cannot securely represent authenticated state).

### 3. Failed Login Throttle Strategy

- Decision: Track failed attempts by normalized email; after 5 failures set `blockedUntil = now + 10 minutes`; reject attempts with `429` during active block; reset counter immediately on successful login.
- Rationale: Directly satisfies FR-008 and FR-010 while preserving deterministic lockout behavior.
- Alternatives considered: Progressive delays without full block (rejected because requirement calls for explicit block), IP-based throttling only (rejected because requirement is account-focused).

### 4. Invalid Credential Error Handling

- Decision: Return identical `401` response payload (`Invalid email or password.`) for all invalid-credential states that are not lockout.
- Rationale: Meets FR-005 and avoids account-enumeration leakage.
- Alternatives considered: Distinct "email not found" vs "wrong password" messages (rejected due to information leakage and requirement mismatch).

### 5. API Integration Pattern

- Decision: Front-end `login-controller` submits JSON credentials to `POST /api/auth/login`, then transitions view state to dashboard route on success.
- Rationale: Clear controller-to-controller integration keeps view logic minimal and provides stable contract test points.
- Alternatives considered: HTML form post with full-page reload only (rejected because it reduces testability and fine-grained controller flow control), GraphQL mutation (rejected as unnecessary for single-action scope).

### 6. Testing and Coverage Strategy

- Decision: Use acceptance tests mapped to UC-02-AS plus unit/integration tests for models and controllers; generate line coverage with c8 and require 100% for in-scope JavaScript (document remediation if below 100%; block below 95%).
- Rationale: Aligns directly with Constitution Principle II and FR-007.
- Alternatives considered: Acceptance-only tests (rejected because insufficient line-level evidence), statement-only coverage without line mapping (rejected due to constitution requirement).

## Clarification Resolution Status

All technical-context clarifications are resolved. No `NEEDS CLARIFICATION` markers remain for this feature plan.
