# Conference Management System — Acceptance Test Suite

## Use Case 12: Notify Author of Decision — Acceptance Suite

**Given** a finalized decision  
**When** notification is sent  
**Then** the author receives the decision

**Given** notification fails  
**When** retry is triggered  
**Then** the system logs the failure

**Given** retry fails
**When** unresolved failure is recorded
**Then** record includes timestamp, submission ID, author ID, failure reason, attempt number, and final delivery status

**Given** a non-administrator
**When** they request unresolved failure records
**Then** access is denied

**Given** an unresolved failure record
**When** it is queried within 1 year
**Then** it remains accessible to administrators
