# Conference Management System — Acceptance Test Suite

## Use Case 1: Register Account — Acceptance Suite

**Given** the user is not logged in  
**When** the user submits valid registration details  
**Then** an account is created and a confirmation email is sent

**Given** required fields are missing  
**When** the form is submitted  
**Then** the system displays validation errors and does not create an account
