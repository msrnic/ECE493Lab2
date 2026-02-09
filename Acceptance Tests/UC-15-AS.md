# Conference Management System — Acceptance Test Suite

## Use Case 15: View Final Schedule — Acceptance Suite

**Given** the schedule is published  
**When** any viewer opens the final schedule view  
**Then** the full final schedule is displayed

**Given** the schedule is published and the viewer is an authenticated author with assigned sessions  
**When** the author views the schedule  
**Then** the author sessions are visibly highlighted and each displayed session includes conference-time and local-time labels

**Given** the schedule is unpublished  
**When** any viewer accesses the final schedule view  
**Then** the system displays an unpublished notice and displays zero schedule entries
