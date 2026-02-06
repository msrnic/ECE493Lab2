# Conference Management System — Acceptance Test Suite

## Use Case 5: Save Paper Draft — Acceptance Suite

**Given** a paper submission is in progress  
**When** the author saves the draft  
**Then** the submission state is preserved

**Given** a system error occurs  
**When** saving the draft  
**Then** the draft is not saved and an error message is displayed
