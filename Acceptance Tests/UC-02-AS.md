# Conference Management System — Acceptance Test Suite

## Use Case 2: Log In — Acceptance Suite

**Given** valid credentials  
**When** the user logs in  
**Then** the user is authenticated and redirected to the dashboard

**Given** invalid credentials  
**When** login is attempted  
**Then** access is denied and an error message is shown
