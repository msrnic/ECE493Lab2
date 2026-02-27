# Conference Management System — Acceptance Test Suite

## Use Case 11: Make Paper Decision — Acceptance Suite

**Given** reviews are available  
**When** the editor selects a decision  
**Then** the decision is stored

**Given** the decision is deferred  
**When** saved  
**Then** the paper remains undecided

**Given** a final decision was already saved  
**When** an editor attempts to change it in this workflow  
**Then** the system rejects the change and directs the editor to the override workflow

**Given** two editors submit conflicting final decisions nearly simultaneously  
**When** the first final save succeeds  
**Then** later conflicting saves are rejected and the first saved final decision remains unchanged

**Given** the editor is not assigned to the paper or its track  
**When** the editor attempts to record a decision  
**Then** the system denies the request

**Given** the editor submits a final outcome outside Accept, Reject, or Revise  
**When** the save request is processed  
**Then** the system rejects the request as invalid

**Given** required reviews become unavailable before save  
**When** the editor attempts to save  
**Then** the system denies decision recording

**Given** a save attempt fails  
**When** the system returns the failure response  
**Then** the editor is clearly told the decision was not recorded and can retry

**Given** a decision action succeeds or is denied  
**When** the action processing completes  
**Then** an audit entry is stored with editor, paper, action, outcome, and timestamp

**Given** audit persistence fails during decision processing  
**When** the save attempt completes  
**Then** the decision is treated as not recorded and the editor can retry
