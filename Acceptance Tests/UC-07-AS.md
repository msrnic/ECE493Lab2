# Conference Management System — Acceptance Test Suite

## Use Case 7: Receive Review Invitation — Acceptance Suite

**Given** a reviewer is assigned  
**When** notification is sent  
**Then** the reviewer receives the invitation

**Given** notification delivery fails  
**When** retry occurs  
**Then** the system logs the failure
