# Research: Change Account Password

## Scope

Feature: `001-change-password`  
Use case: `UC-03`  
Acceptance suite: `UC-03-AS`

## Decision 1: Keep production stack strictly HTML/CSS/JavaScript with MVC modules

- Decision: Implement production behavior with HTML for structure, CSS for presentation, and JavaScript for behavior, split into `src/models`, `src/views`, and `src/controllers`.
- Rationale: The constitution requires HTML/CSS/JavaScript and MVC separation; this also matches the user constraint and minimizes architectural drift.
- Alternatives considered:
  - React SPA with component-based state management (rejected: adds framework complexity outside current constraints).
  - Server-rendered templates with mixed inline scripts (rejected: weaker MVC separation and harder behavior testing).

## Decision 2: Enforce password policy through a model layer adapter

- Decision: Use `password-policy-model.js` to validate new passwords against the existing global policy and enforce `newPassword != currentPassword`.
- Rationale: Centralizes security rules in the Model layer and keeps Controller logic focused on orchestration.
- Alternatives considered:
  - Validate only in Controller (rejected: mixes orchestration with policy logic).
  - Validate only on backend response (rejected: delayed user feedback and weaker client-side UX).

## Decision 3: Use rolling-window throttling for incorrect current-password attempts

- Decision: Track incorrect current-password attempts per user in a rolling 10-minute window and block further attempts for 10 minutes after 5 failures.
- Rationale: This exactly matches FR-012 while reducing abuse potential compared with fixed-interval counters.
- Alternatives considered:
  - Fixed-window counter reset each 10 minutes (rejected: edge effects around boundaries).
  - Exponential backoff per attempt (rejected: does not match specified threshold rule).

## Decision 4: Sequence success side effects as credential update -> session invalidation -> notification -> audit finalize

- Decision: On successful change, update credentials first, invalidate other sessions while preserving current session, queue security notification, and persist attempt audit details.
- Rationale: Guarantees account safety first while preserving required side effects (FR-010, FR-011, FR-013).
- Alternatives considered:
  - Invalidate sessions before credential update (rejected: can create inconsistent states if credential update fails).
  - Send notification before session invalidation (rejected: security posture should be completed before signaling success).

## Decision 5: Record audit entries for all outcomes and surface audit-write degradation operationally

- Decision: Create an audit entry for every attempt outcome (`updated`, `rejected`, `blocked`). If audit persistence is degraded, keep user-facing attempt result correct and attach an operational alert flag for follow-up.
- Rationale: Meets FR-013 and the edge case requiring outcome accuracy even during audit storage disruption.
- Alternatives considered:
  - Fail the user operation when audit write fails (rejected: conflicts with edge-case requirement).
  - Skip logging on rejected attempts (rejected: violates FR-013).

## Decision 6: Standardize API outcomes with explicit rejection codes

- Decision: Define a single password-change endpoint with response codes for success, validation failures, incorrect current password, temporary block, and auth/session errors.
- Rationale: Keeps the View/Controller contract predictable and directly testable against UC-03-AS scenarios.
- Alternatives considered:
  - Multiple specialized endpoints (rejected: unnecessary complexity for one user action).
  - Generic error-only responses (rejected: weak traceability and weaker user feedback specificity).

## Decision 7: Coverage strategy uses acceptance + unit tests with 100% line target

- Decision: Map acceptance tests directly to `UC-03-AS` and supplement with model/controller unit tests; enforce 100% line coverage target on in-scope JavaScript via `c8`, with governance handling for any gap.
- Rationale: Satisfies constitution Principle II and FR-009 coverage requirements.
- Alternatives considered:
  - Acceptance tests only (rejected: insufficient isolation for controller/model edge cases).
  - Unit tests only (rejected: does not prove use-case acceptance behavior end-to-end).

## Clarification Resolution Status

All technical-context clarifications for this feature are resolved in this document. No `NEEDS CLARIFICATION` markers remain.
