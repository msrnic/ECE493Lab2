# Conference Management System — Acceptance Test Suite

## Use Case 3: Change Password — Acceptance Suite

**Given** the user is logged in  
**When** a valid current password and new password are provided  
**Then** the password is updated successfully

**Given** the current password is incorrect  
**When** a change is attempted  
**Then** the password remains unchanged and an error is displayed

**Given** a user has multiple active sessions  
**When** a valid password change succeeds from one active session  
**Then** all other active sessions are invalidated and the initiating session remains active

**Given** a valid password change succeeds  
**When** the success response is finalized  
**Then** a security notification is generated for the affected account

**Given** five incorrect current-password submissions occur within a rolling 10-minute window  
**When** another password-change attempt is submitted before 10 minutes elapse  
**Then** the attempt is blocked, no credential update occurs, and a temporary-block message is displayed

**Given** a password-change attempt completes with either success or rejection  
**When** the attempt outcome is committed  
**Then** a matching security audit entry is recorded for that attempt
