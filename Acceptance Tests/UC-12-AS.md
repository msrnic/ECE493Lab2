# Conference Management System — Acceptance Test Suite

## Use Case 12: Notify Author of Decision — Acceptance Suite

**Given** a finalized decision  
**When** notification is sent  
**Then** the author receives the decision

**Given** notification fails  
**When** retry is triggered  
**Then** the system logs the failure
