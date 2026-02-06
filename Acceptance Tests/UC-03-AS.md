# Conference Management System — Acceptance Test Suite

## Use Case 3: Change Password — Acceptance Suite

**Given** the user is logged in  
**When** a valid current password and new password are provided  
**Then** the password is updated successfully

**Given** the current password is incorrect  
**When** a change is attempted  
**Then** the password remains unchanged and an error is displayed
