# Conference Management System — Acceptance Test Suite

## Use Case 13: Generate Conference Schedule — Acceptance Suite

**Given** accepted papers exist  
**When** schedule generation is initiated  
**Then** a schedule is produced

**Given** conflicts are detected  
**When** generating  
**Then** conflicts are flagged

**Given** a generation run is already in progress  
**When** another generation request is submitted  
**Then** the request is rejected with a clear in-progress message

**Given** conflicts are detected  
**When** generation completes  
**Then** a schedule is still produced and all conflicts are flagged

**Given** an editor requests schedule conflicts  
**When** the editor is authorized  
**Then** full violation details are returned

**Given** accepted papers are missing  
**When** schedule generation is initiated  
**Then** generation fails with a clear reason

**Given** two successful generation runs exist  
**When** schedule versions are listed  
**Then** exactly one version is marked latest active
