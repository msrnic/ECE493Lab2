# Conference Management System — Acceptance Test Suite

## Use Case 2: Log In — Acceptance Suite

**Given** valid credentials  
**When** the user logs in  
**Then** the user is authenticated and redirected to the dashboard

**Given** invalid credentials  
**When** login is attempted  
**Then** access is denied and an error message is shown

**Given** an account has reached 5 failed login attempts  
**When** login is attempted before 10 minutes have passed  
**Then** access is denied and a temporary-block message is shown

**Given** an account has prior failed login attempts  
**When** the user logs in with valid credentials  
**Then** authentication succeeds and the failed-attempt counter is reset
