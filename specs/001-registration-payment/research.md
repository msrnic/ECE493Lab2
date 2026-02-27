# Phase 0 Research: Registration Payment Flow

## Decision 1: Tokenized gateway collection and PCI scope

- Decision: Use hosted payment fields/tokenization from the gateway so this system receives only
  a gateway token/reference and never raw cardholder data.
- Rationale: Satisfies FR-001 and FR-011 while keeping implementation in PCI DSS SAQ A scope.
  This reduces breach exposure and compliance burden.
- Alternatives considered: Direct card collection in app forms was rejected because it violates
  SAQ A constraints and expands compliance scope.

## Decision 2: Idempotency model for duplicate submissions

- Decision: Require `Idempotency-Key` for each payment submission and scope uniqueness to a
  registration checkout session. Replays with the same key return the original attempt result.
- Rationale: Enforces FR-008 and prevents duplicate charge/confirmation when users double-click or
  retry requests after network interruptions.
- Alternatives considered: Time-window deduplication without explicit idempotency keys was
  rejected because collisions and false positives are harder to control.

## Decision 3: Pending outcome reconciliation pattern

- Decision: Treat timeout/unknown gateway responses as `pending`, persist the attempt, and resolve
  to approved/declined through gateway webhook callback with polling fallback.
- Rationale: Implements FR-009 safely by avoiding premature retry while final outcome is unknown.
  Webhook-first design reduces polling load while preserving reliability.
- Alternatives considered: Immediate user retry on timeout was rejected because it risks duplicate
  charges and inconsistent registration state.

## Decision 4: Retry and cooldown enforcement

- Decision: Track declined attempt timestamps per checkout session using a sliding 15-minute
  window. Permit up to 5 declined retries; block the 6th and set a 15-minute cooldown.
- Rationale: Matches FR-010 precisely and keeps policy deterministic at edge boundaries.
- Alternatives considered: Daily cap or unlimited retry with CAPTCHA was rejected because it does
  not satisfy the required 5-in-15-minute + cooldown rule.

## Decision 5: MVC boundaries for HTML/CSS/JavaScript implementation

- Decision: Keep business rules and state transitions in models, user flow/orchestration in
  controllers, and rendering/styling in views + CSS assets.
- Rationale: Satisfies Constitution Principle III and the user requirement to implement behavior
  with HTML/CSS/JavaScript in MVC architecture.
- Alternatives considered: Embedding business rules directly in view scripts was rejected because
  it couples UI and domain logic and weakens testability.

## Decision 6: Verification and coverage strategy

- Decision: Execute `Acceptance Tests/UC-17-AS.md` as the authoritative end-to-end suite, add
  targeted unit/integration tests for idempotency, retry policy, and reconciliation, and enforce
  100% line coverage target for in-scope JavaScript with no planned exception.
- Rationale: Aligns with Constitution Principle II and FR-007 while providing direct evidence for
  high-risk payment edge cases.
- Alternatives considered: Acceptance-only testing was rejected because it can miss branch-level
  defects in model/controller logic.

## Clarification Resolution Status

All Technical Context clarifications are resolved for planning. No unresolved
clarification items remain.
