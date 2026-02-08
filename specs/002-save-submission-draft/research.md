# Research: Save Paper Draft (UC-05)

## Scope

- Feature spec: `/home/m_srnic/ece493/lab2/ECE493Lab2/specs/002-save-submission-draft/spec.md`
- Governing use case: `/home/m_srnic/ece493/lab2/ECE493Lab2/Use Cases/UC-05.md`
- Governing acceptance suite: `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md`
- Constitution: `/home/m_srnic/ece493/lab2/ECE493Lab2/.specify/memory/constitution.md`

## Research Decisions

### 1) Concurrent Save Conflict Handling

- Decision: Use optimistic concurrency with a required `baseRevision` on every save and restore call; reject stale requests with HTTP `409 Conflict`, return latest version metadata, and require client reload before another save.
- Rationale: This preserves newer data, matches FR-008 stale-save rejection, and avoids blocking active editing sessions.
- Alternatives considered: Last-write-wins was rejected because it can overwrite newer drafts. Pessimistic locking was rejected because it creates long-lived locks and poor UX for multi-session editing.

### 2) Draft Versioning Strategy

- Decision: Create an immutable `DraftVersion` snapshot on every successful save. Restoring an old version creates a new latest version that references the restored source version.
- Rationale: This satisfies FR-009 version history and restore requirements while keeping auditability and rollback safety.
- Alternatives considered: Mutable single-row draft storage with no immutable history was rejected because it cannot guarantee version restore integrity.

### 3) File and Metadata Snapshot Storage

- Decision: Save metadata and uploaded file descriptors together per version. Keep file binaries in object storage and persist stable file references (id, checksum, storage key, size, MIME type) in the version snapshot.
- Rationale: This satisfies FR-002 by preserving full draft content while avoiding large binary blobs in primary relational records.
- Alternatives considered: Base64-encoding files in JSON snapshots was rejected due to storage bloat and parsing overhead. Metadata-only snapshotting was rejected because FR-002 requires file preservation.

### 4) Retention Lifecycle After Final Submission

- Decision: Keep all versions while submission state is `IN_PROGRESS`. After final submission, trigger a retention prune operation that keeps only the latest draft version and removes older ones.
- Rationale: Directly satisfies FR-010 and clarifies transition behavior tied to final submission.
- Alternatives considered: Time-based expiration policy was rejected because FR-010 is state-based, not time-based. Keeping all versions forever was rejected because it violates FR-010.

### 5) API Contract Style and Transport

- Decision: Use REST endpoints with JSON responses and `multipart/form-data` request bodies for save operations that include file uploads.
- Rationale: This is straightforward for browser-based MVC controllers, supports attachments naturally, and keeps endpoint responsibilities explicit.
- Alternatives considered: GraphQL was rejected because multipart upload handling and optimistic-lock semantics add unnecessary complexity for this scope. Browser-local storage only was rejected because drafts must remain available across sessions/devices.

### 6) Authorization Model for View/Restore

- Decision: Enforce role checks at controller and API layers; only submission owner and conference administrator can list, view, or restore draft versions. All other actors receive `403 Forbidden`.
- Rationale: This directly satisfies FR-011 and prevents unauthorized draft version access.
- Alternatives considered: UI-only checks were rejected because client-only checks are bypassable. Owner-only policy was rejected because admins must also be allowed.

### 7) Testing and Coverage Strategy

- Decision: Implement acceptance tests mapped to `/home/m_srnic/ece493/lab2/ECE493Lab2/Acceptance Tests/UC-05-AS.md`, plus model/controller unit tests and API integration tests. Enforce 100% line coverage target for in-scope JavaScript and document any shortfall with line-level rationale and remediation plan; below 95% is blocked.
- Rationale: Aligns with Constitution Principle II and FR-007.
- Alternatives considered: Acceptance-only testing was rejected because it is insufficient for edge-case logic and coverage evidence.

## Clarification Resolution Status

All Technical Context clarifications for this feature are resolved by the decisions above. No unresolved `NEEDS CLARIFICATION` items remain for Phase 1 design.
