# Conference Management System — Acceptance Test Suite

## Use Case 8: Access Assigned Paper — Acceptance Suite

**Given** the reviewer accepted the assignment  
**When** the paper is selected  
**Then** the paper content is displayed

**Given** access is revoked  
**When** the paper is accessed  
**Then** access is denied

**Given** the reviewer session expires before file retrieval  
**When** the reviewer requests paper files  
**Then** re-authentication is required and protected files are not displayed

**Given** an authorized reviewer requests files during a temporary outage  
**When** the request is processed  
**Then** the system returns temporary-unavailable and allows one immediate retry

**Given** repeated temporary-outage retries after the immediate retry  
**When** retries are sent within 5 seconds for the same reviewer-paper pair  
**Then** the system throttles requests to at most one request every 5 seconds

**Given** a reviewer is already viewing paper content and access is revoked  
**When** the reviewer requests any additional file  
**Then** the new request is denied and already displayed content remains visible

**Given** successful or denied file access attempts exist  
**When** a paper editor or support/admin user views access-attempt records  
**Then** access outcomes are visible

**Given** an authenticated user who is not paper editor or support/admin  
**When** the user attempts to view access-attempt records  
**Then** access is denied

**Given** a user session is expired before access-attempt retrieval  
**When** the user requests access-attempt records  
**Then** re-authentication is required and no protected records are displayed
