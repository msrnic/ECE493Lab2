<!--
Sync Impact Report
- Version change: 1.0.0 -> 1.1.0
- Modified principles:
  - II. Acceptance Suites Define Done -> II. Acceptance Suites Define Done
    (coverage mandate expanded)
- Added sections:
  - None
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated: .specify/templates/plan-template.md
  - ✅ updated: .specify/templates/spec-template.md
  - ✅ updated: .specify/templates/tasks-template.md
  - ⚠ pending: .specify/templates/commands/*.md (directory not present)
  - ✅ updated: README.md
- Follow-up TODOs:
  - None
-->
# ECE493Lab2 Constitution

## Core Principles

### I. Use Cases Are the Sole Functional Source
All functional behavior MUST originate from files in `Use Cases/UC-XX.md`. Planning, specs,
tasks, and implementation notes MUST cite governing use case IDs. Behavior not described by a
use case MUST NOT be added unless the use case set is amended through Governance. Rationale:
this prevents scope drift and keeps delivery aligned with project requirements.

### II. Acceptance Suites Define Done
For every implemented use case `UC-XX`, the matching suite `Acceptance Tests/UC-XX-AS.md` MUST
be implemented and passed exactly as written. Supplemental tests MAY be added, but they MUST NOT
weaken, replace, or reinterpret acceptance expectations. Acceptance execution and companion tests
MUST target 100% line coverage for project-owned JavaScript tied to in-scope use cases. If 100%
is unattainable, teams MUST provide measured coverage, uncovered-line justification, and a
remediation plan; accepted coverage MUST be as close as possible to 100% and MUST NOT fall below
95% without a documented exception approved during compliance review. Rationale: acceptance suites
are the authoritative verification contract, and coverage evidence reduces hidden logic gaps.

### III. Web Stack and MVC Architecture Are Mandatory
Production-facing behavior MUST be implemented with HTML, CSS, and JavaScript. The architecture
MUST keep Model, View, and Controller concerns separate: Models manage state and rules, Views
render UI, and Controllers handle interaction flow. Cross-layer mixing is prohibited unless an
exception is documented and approved during compliance review. Rationale: strict boundaries keep
the system maintainable and testable.

### IV. End-to-End Traceability Is Required
Each feature specification and implementation plan MUST provide bidirectional mappings from
use cases to requirements, code modules, and acceptance suites. Task lists MUST label every item
with its governing use case and acceptance suite. If a use case lacks implementation or
verification mapping, release approval MUST fail. Rationale: traceability exposes coverage gaps
before delivery.

### V. Regression Safety Over Partial Progress
Changes MUST preserve pass status for previously satisfied acceptance suites unless a formal
amendment explicitly changes expected behavior. Any regression in prior passing suites blocks
merge until corrected or formally amended. Rationale: incremental delivery is valid only when
prior commitments remain intact.

## Implementation Constraints

- Canonical requirement sources are `Use Cases/` and `Acceptance Tests/`.
- Naming MUST follow `UC-XX.md` and `UC-XX-AS.md`, where `XX` identifies the same use case.
- Current baseline scope is `UC-01` through `UC-17`; newly added use cases MUST follow the same
  naming pattern and include matching acceptance suites.
- Implementation artifacts MUST remain within the HTML/CSS/JavaScript ecosystem and preserve an
  MVC-oriented module structure.

## Delivery Workflow & Quality Gates

1. Specification MUST enumerate targeted UC IDs and matching acceptance suites before design.
2. Planning MUST pass a constitution check for traceability, stack compliance, and MVC separation.
3. Task generation MUST include acceptance-verification tasks for each targeted use case.
4. Implementation MUST execute mapped acceptance suites and record pass/fail plus coverage evidence.
5. Review MUST reject merges lacking UC/AS mappings, MVC boundaries, acceptance evidence, or
   required coverage evidence and exceptions.

## Governance

This constitution overrides conflicting local process notes and templates. Amendments require
three items before merge: a written change proposal, explicit impact analysis on active
specs/tasks/templates, and maintainer approval.

Constitution versioning uses semantic versioning:
- MAJOR: incompatible principle removals/redefinitions or governance model changes.
- MINOR: new principle/section or materially expanded mandatory guidance.
- PATCH: wording clarifications, typo fixes, or non-semantic refinements.

Compliance review is mandatory in every plan and pull request. Reviewers MUST verify constitution
check results, acceptance pass status, and coverage evidence. Reviewers MUST reject non-compliant
work unless an approved, time-bounded exception is recorded in project documentation.

**Version**: 1.1.0 | **Ratified**: 2026-02-06 | **Last Amended**: 2026-02-06
