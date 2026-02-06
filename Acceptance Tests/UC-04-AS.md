# Conference Management System — Acceptance Test Suite

## Use Case 4: Submit Paper — Acceptance Suite

**Given** the author is logged in  
**When** all required metadata and files are submitted  
**Then** the paper is stored and marked as submitted

**Given** file upload fails  
**When** submission is attempted  
**Then** the system prompts the author to retry
