# Conference Management System — Acceptance Test Suite

## Use Case 5: Save Paper Draft — Acceptance Suite

### Scenario 1: Save Draft Success

**Given** a paper submission is in progress with partial metadata  
**When** the author saves the draft  
**Then** the latest draft state is preserved and a success confirmation is displayed

### Scenario 2: Save Includes Files

**Given** a paper submission is in progress with uploaded files and metadata  
**When** the author saves the draft  
**Then** the saved draft version preserves both metadata and file references

### Scenario 3: Repeated Save Creates Version History

**Given** an author has already saved a draft  
**When** the author edits content and saves again  
**Then** a new latest version is created and previous versions remain available

### Scenario 4: System Error During Save

**Given** a system error occurs  
**When** the author saves the draft  
**Then** no new draft version is stored and an explicit retry message is displayed

### Scenario 5: Failed Save Preserves Prior Version

**Given** a previously saved draft exists  
**When** a later save attempt fails  
**Then** the previously saved draft remains available and unchanged

### Scenario 6: Stale Save Rejected

**Given** the same draft is open in two sessions and one session saves newer changes  
**When** the other session attempts to save older state  
**Then** the system rejects the stale save and requires reload of the latest draft

### Scenario 7: Resume Latest Draft

**Given** a saved draft exists  
**When** the author returns later to edit  
**Then** the system loads the latest successfully saved draft by default

### Scenario 8: Restore Prior Version

**Given** multiple draft versions exist  
**When** the author restores an earlier version  
**Then** the selected version is restored as a new latest immutable version

### Scenario 9: Authorized Version Access

**Given** a submission owner or conference administrator requests draft history  
**When** the user views or restores draft versions  
**Then** the system allows the action

### Scenario 10: Unauthorized Version Access

**Given** a user is neither submission owner nor conference administrator  
**When** that user attempts to view or restore draft versions  
**Then** the system denies the action

### Scenario 11: Retention Prune After Final Submission

**Given** a submission has multiple draft versions and is finalized  
**When** retention pruning runs  
**Then** only the latest draft version remains
