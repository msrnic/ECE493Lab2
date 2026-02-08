# Conference Management System — Acceptance Test Suite

## Use Case 1: Register Account — Acceptance Suite

**Given** the user is not logged in  
**When** the user submits valid registration details  
**Then** an account is created in `pending` state and a confirmation email is sent or queued for
retry

**Given** required fields are missing  
**When** the form is submitted  
**Then** the system displays validation errors and does not create an account

**Given** a pending account with a valid confirmation token  
**When** the user submits the confirmation token  
**Then** the account transitions to `active`

**Given** the submitted email is already registered  
**When** the user submits registration details  
**Then** the system rejects registration and displays "Email already registered" with
login/reset-password guidance

**Given** there have already been 5 registration attempts for the same email in the last
10 minutes  
**When** the user submits another registration attempt for that email  
**Then** the system blocks the request and returns temporary-block feedback with retry guidance

**Given** initial confirmation email delivery fails after valid registration  
**When** registration processing completes  
**Then** the account remains `pending`, retry delivery is queued, and the user is informed that
email delivery is pending
