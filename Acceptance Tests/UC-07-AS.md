# Conference Management System — Acceptance Test Suite

## Use Case 7: Receive Review Invitation — Acceptance Suite

**Given** a reviewer is assigned  
**When** notification is sent  
**Then** the reviewer receives the invitation

**Given** notification delivery fails  
**When** retry occurs  
**Then** the system logs the failure

**Given** notification delivery fails
**When** retry scheduling starts
**Then** retries run every 5 minutes up to 3 retries

**Given** all retries fail
**When** retry limit is reached
**Then** the invitation is marked failed and flagged for manual follow-up

**Given** reviewer assignment is removed while retries are pending
**When** cancellation is processed
**Then** invitation is marked canceled and no further retries run

**Given** an unauthorized authenticated user requests failure logs
**When** access is evaluated
**Then** access is denied

**Given** the same reviewer-paper assignment is reprocessed
**When** invitation dispatch is triggered
**Then** no duplicate active invitation is created
