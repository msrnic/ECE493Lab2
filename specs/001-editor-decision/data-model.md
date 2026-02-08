# Data Model: Editor Decision Recording

**Feature**: `001-editor-decision`  
**Use Case**: `UC-11`  
**Acceptance Suite**: `UC-11-AS`

## Entity: PaperDecision

Represents the decision state persisted for a paper.

| Field | Type | Required | Validation / Rules |
|---|---|---|---|
| `paperId` | string | Yes | Must reference an existing paper |
| `trackId` | string | Yes | Must reference the paper's assigned track |
| `decisionStatus` | enum(`UNDECIDED`, `FINAL`) | Yes | `FINAL` allowed only after successful final decision save |
| `finalOutcome` | enum(`ACCEPT`, `REJECT`, `REVISE`) or null | Conditional | Required when `decisionStatus=FINAL`; must be null when undecided |
| `finalizedByEditorId` | string or null | Conditional | Required when `decisionStatus=FINAL` |
| `finalizedAt` | timestamp or null | Conditional | Required when `decisionStatus=FINAL` |
| `decisionVersion` | integer | Yes | Starts at 1 and increments on each successful save to support concurrency checks |

## Entity: EvaluationSnapshot

Represents review availability data used as a precondition for save.

| Field | Type | Required | Validation / Rules |
|---|---|---|---|
| `evaluationId` | string | Yes | Unique evaluation identifier |
| `paperId` | string | Yes | Must match target paper |
| `reviewerId` | string | Yes | Must reference existing reviewer |
| `recommendation` | string | Yes | Existing recommendation taxonomy |
| `submittedAt` | timestamp | Yes | Must be present for evaluations counted as available |
| `status` | enum(`SUBMITTED`, `WITHDRAWN`) | Yes | Save precondition requires submitted evaluations |

## Entity: EditorAssignment

Defines whether an editor is authorized to act on a paper.

| Field | Type | Required | Validation / Rules |
|---|---|---|---|
| `assignmentId` | string | Yes | Unique assignment identifier |
| `editorId` | string | Yes | Must reference current authenticated editor |
| `paperId` | string or null | Optional | Direct paper assignment path |
| `trackId` | string or null | Optional | Track assignment path |
| `role` | enum(`EDITOR`, `SENIOR_EDITOR`) | Yes | Must be an editorial role |
| `active` | boolean | Yes | Must be true for authorization |

Authorization rule: editor is allowed if there is an active assignment matching `paperId` or matching `trackId` of the paper.

## Entity: DecisionCommand

Incoming command payload for decision save operations.

| Field | Type | Required | Validation / Rules |
|---|---|---|---|
| `action` | enum(`DEFER`, `FINAL`) | Yes | Action type for this save |
| `finalOutcome` | enum(`ACCEPT`, `REJECT`, `REVISE`) or null | Conditional | Required for `FINAL`; forbidden for `DEFER` |
| `expectedVersion` | integer | Yes | Must equal current `decisionVersion`; mismatch returns conflict |
| `idempotencyKey` | string or null | Optional | Used to safely handle retry submissions |

## Entity: DecisionAuditEntry

Audit record for every successful or denied decision action.

| Field | Type | Required | Validation / Rules |
|---|---|---|---|
| `auditId` | string | Yes | Unique audit identifier |
| `paperId` | string | Yes | Target paper |
| `editorId` | string | Yes | Acting editor |
| `actionAttempted` | enum(`DEFER`, `FINAL`) | Yes | Mirrors incoming action |
| `outcome` | enum(`SUCCESS_DEFER`, `SUCCESS_FINAL`, `DENIED_UNASSIGNED`, `DENIED_IMMUTABLE`, `DENIED_CONFLICT`, `DENIED_PRECONDITION`, `DENIED_INVALID`) | Yes | Required outcome classification |
| `reason` | string or null | Optional | Human-readable context for denied outcomes |
| `occurredAt` | timestamp | Yes | Server-generated action timestamp |

## Relationships

- `PaperDecision (1) -> (N) EvaluationSnapshot`
- `PaperDecision (1) -> (N) DecisionAuditEntry`
- `PaperDecision (N) -> (1) EditorAssignment` (resolved by paper or track match for acting editor)

## State Transitions

1. `UNDECIDED` + `DEFER` save -> `UNDECIDED` (paper remains undecided).
2. `UNDECIDED` + `FINAL(ACCEPT|REJECT|REVISE)` save -> `FINAL` with immutable `finalOutcome`.
3. `FINAL` + any new decision command -> rejected (`DENIED_IMMUTABLE`), no state change.
4. Concurrent conflicting `FINAL` writes: first successful request commits state; later requests fail conflict check and are audited as denied.
