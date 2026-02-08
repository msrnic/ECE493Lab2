# Data Model: Author Paper Submission (UC-04)

## Entity: PaperSubmission

Represents one author submission action sequence and its lifecycle.

| Field | Type | Required | Notes |
|---|---|---|---|
| `submissionId` | UUID | Yes | Primary identifier |
| `authorId` | UUID/String | Yes | Authenticated author reference |
| `actionSequenceId` | UUID/String | Yes | Groups one intentional submission action; used for dedup guard |
| `status` | Enum | Yes | `draft`, `upload_failed`, `validation_failed`, `scan_failed`, `save_failed`, `submitted` |
| `title` | String | Yes | Required metadata |
| `abstract` | String | Yes | Required metadata |
| `authorList` | Array<String> | Yes | Must include at least one author |
| `keywords` | Array<String> | No | Optional metadata |
| `confirmationCode` | String | No | Set only when `status=submitted` |
| `sessionId` | String | Yes | Active session scope for retry preservation |
| `createdAt` | DateTime | Yes | Audit field |
| `updatedAt` | DateTime | Yes | Audit field |

Validation rules:
- Must belong to an authenticated author session.
- Required metadata fields (`title`, `abstract`, `authorList`) must be non-empty before submit.
- Duplicate finalization blocked when another `submitted` record exists for same
  `actionSequenceId`.

## Entity: SubmissionFile

Represents an uploaded file tied to a `PaperSubmission`.

| Field | Type | Required | Notes |
|---|---|---|---|
| `fileId` | UUID | Yes | Primary identifier |
| `submissionId` | UUID | Yes | FK to `PaperSubmission` |
| `category` | Enum | Yes | `manuscript`, `supplementary` |
| `originalFilename` | String | Yes | User-supplied name |
| `mimeType` | String | Yes | Checked against allowed conference policy |
| `sizeBytes` | Integer | Yes | Checked against configured max size |
| `storageKey` | String | Yes | Object storage or persisted file reference |
| `uploadStatus` | Enum | Yes | `uploaded`, `upload_failed` |
| `scanStatus` | Enum | Yes | `pending`, `passed`, `failed` |
| `uploadedAt` | DateTime | Yes | Upload timestamp |

Validation rules:
- File type and size must satisfy conference-configured policy (FR-008).
- Final submit requires at least one required file category present.
- Final submit requires all required files with `scanStatus=passed` (FR-013).

## Entity: SessionSubmissionState

Tracks retry-preserved state scoped to the active author session.

| Field | Type | Required | Notes |
|---|---|---|---|
| `sessionId` | String | Yes | Active session key |
| `submissionId` | UUID | Yes | Current in-progress submission |
| `preservedMetadata` | JSON/Object | Yes | Last valid metadata snapshot |
| `preservedFileIds` | Array<UUID> | Yes | Valid uploaded files preserved for retry |
| `expiresAt` | DateTime | Yes | Session-end invalidation point |

Validation rules:
- Exists only while session remains active (FR-012, FR-014).
- Cleared when session ends or author re-authentication is required.

## Entity: SubmissionOutcome (View Model)

User-visible result for each submission attempt.

| Field | Type | Required | Notes |
|---|---|---|---|
| `submissionId` | UUID | Yes | Submission reference |
| `outcome` | Enum | Yes | `submitted`, `rejected`, `retry_required` |
| `message` | String | Yes | Confirmation/error/retry text |
| `retryAllowed` | Boolean | Yes | True while active session allows retry |
| `validationErrors` | Array<Object> | No | Field-specific correction guidance |

## Relationships

- `PaperSubmission 1 -> N SubmissionFile`
- `PaperSubmission 1 -> 1 SessionSubmissionState` (active-session view; logical one-to-one)
- `PaperSubmission 1 -> N SubmissionOutcome` (each attempt can generate an outcome event)

## State Transitions

`draft` -> `validation_failed`  
Condition: Required metadata/files missing or invalid.

`draft` -> `upload_failed`  
Condition: File upload fails (UC-04 extension 3a/3a1).

`draft` -> `scan_failed`  
Condition: File scan fails before finalization.

`draft` -> `save_failed`  
Condition: Validation + upload + scan pass, but persistence fails (FR-011).

`draft` -> `submitted`  
Condition: Validation pass + file rules pass + scan pass + save succeeds.

`upload_failed|validation_failed|scan_failed|save_failed` -> `draft`  
Condition: Author retries within active session with preserved metadata/valid files.

`submitted` -> terminal  
Condition: Same action sequence cannot finalize again; new intentional sequence requires new
`actionSequenceId`.
