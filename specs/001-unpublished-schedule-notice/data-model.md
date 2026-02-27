# Data Model: View Final Schedule (UC-15)

## Entity: ViewerContext

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `isAuthenticated` | boolean | Yes | Indicates whether the current viewer is logged in. |
| `viewerRole` | enum(`anonymous`, `author`, `other`) | Yes | Role used to decide personalization behavior. |
| `authorId` | string \| null | No | Present only when authenticated viewer is an author. |

### Validation Rules

- `viewerRole=anonymous` requires `isAuthenticated=false` and `authorId=null`.
- `viewerRole=author` requires `isAuthenticated=true` and non-empty `authorId`.

## Entity: FinalSchedule

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | enum(`published`, `unpublished`) | Yes | Publication state controlling visibility behavior. |
| `conferenceTimeZone` | string (IANA TZ) | Yes when `status=published` | Conference canonical time zone (for example `America/Toronto`). |
| `generatedAt` | string (`date-time`) | Yes | Server timestamp for payload generation. |
| `sessions` | `ScheduleSession[]` | Yes when `status=published` | Full conference sessions shown to viewers when published. |
| `notice` | `ScheduleAvailabilityNotice` | Yes when `status=unpublished` | Unpublished-state message metadata. |

### Validation Rules

- `status=published` requires `sessions` and `conferenceTimeZone`; `notice` must be absent.
- `status=unpublished` requires `notice`; `sessions` must be absent (FR-005).

### State Transitions

| From | To | Trigger |
|------|----|---------|
| `unpublished` | `published` | Conference organizer publishes finalized schedule. |
| `published` | `unpublished` | Conference organizer retracts or reopens schedule publication. |

## Entity: ScheduleSession

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | Yes | Stable session identifier. |
| `title` | string | Yes | Session/presentation title. |
| `startTimeUtc` | string (`date-time`) | Yes | Canonical UTC start timestamp. |
| `endTimeUtc` | string (`date-time`) | Yes | Canonical UTC end timestamp. |
| `room` | string | Yes | Venue/room display label. |
| `track` | string | No | Optional track/stream grouping. |
| `authorIds` | string[] | Yes | Author IDs associated with the session. |
| `isCurrentAuthorSession` | boolean | Yes | Derived personalization flag for authenticated authors. |
| `conferenceTimeLabel` | string | Derived | Formatted conference-time text displayed in view. |
| `localTimeLabel` | string | Derived | Formatted local-time text displayed in view. |

### Validation Rules

- `endTimeUtc` must be later than `startTimeUtc`.
- `isCurrentAuthorSession=true` only when `viewerRole=author` and `authorId` is in `authorIds`.
- `conferenceTimeLabel` and `localTimeLabel` must be generated for every published session (FR-008).

## Entity: ScheduleAvailabilityNotice

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | Yes | Machine-readable notice code (`SCHEDULE_UNPUBLISHED`). |
| `message` | string | Yes | Viewer-facing message that final schedule is not available yet. |

### Validation Rules

- `message` must be non-empty and understandable without login context.
- Notice must be returned to unauthenticated and authenticated viewers equally when `status=unpublished`.

## Relationships

- `FinalSchedule` has one `ViewerContext` per request.
- `FinalSchedule` has many `ScheduleSession` when published.
- `FinalSchedule` has one `ScheduleAvailabilityNotice` when unpublished.
- `ViewerContext(authorId)` drives derivation of `ScheduleSession.isCurrentAuthorSession`.
