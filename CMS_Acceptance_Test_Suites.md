# CMS Acceptance Test Suites

This document defines **acceptance test suites** for each of the 17 Conference Management System (CMS) use cases.
Each suite specifies **acceptance criteria** that must be satisfied for the use case to be considered complete.

---

## Use Case 1: Register Account — Acceptance Suite

**Given** the user is not logged in  
**When** the user submits valid registration details  
**Then** an account is created and a confirmation email is sent

**Given** required fields are missing  
**When** the form is submitted  
**Then** the system displays validation errors and does not create an account

---

## Use Case 2: Log In — Acceptance Suite

**Given** valid credentials  
**When** the user logs in  
**Then** the user is authenticated and redirected to the dashboard

**Given** invalid credentials  
**When** login is attempted  
**Then** access is denied and an error message is shown

---

## Use Case 3: Change Password — Acceptance Suite

**Given** the user is logged in  
**When** a valid current password and new password are provided  
**Then** the password is updated successfully

**Given** the current password is incorrect  
**When** a change is attempted  
**Then** the password remains unchanged and an error is displayed

---

## Use Case 4: Submit Paper — Acceptance Suite

**Given** the author is logged in  
**When** all required metadata and files are submitted  
**Then** the paper is stored and marked as submitted

**Given** file upload fails  
**When** submission is attempted  
**Then** the system prompts the author to retry

---

## Use Case 5: Save Paper Draft — Acceptance Suite

**Given** a paper submission is in progress  
**When** the author saves the draft  
**Then** the submission state is preserved

**Given** a system error occurs  
**When** saving the draft  
**Then** the draft is not saved and an error message is displayed

---

## Use Case 6: Assign Reviewers — Acceptance Suite

**Given** a submitted paper  
**When** reviewers are selected  
**Then** reviewers are assigned and notified

**Given** a reviewer is unavailable  
**When** assignment is attempted  
**Then** the editor is prompted to select an alternative

---

## Use Case 7: Receive Review Invitation — Acceptance Suite

**Given** a reviewer is assigned  
**When** notification is sent  
**Then** the reviewer receives the invitation

**Given** notification delivery fails  
**When** retry occurs  
**Then** the system logs the failure

---

## Use Case 8: Access Assigned Paper — Acceptance Suite

**Given** the reviewer accepted the assignment  
**When** the paper is selected  
**Then** the paper content is displayed

**Given** access is revoked  
**When** the paper is accessed  
**Then** access is denied

---

## Use Case 9: Submit Review — Acceptance Suite

**Given** a completed review form  
**When** submitted  
**Then** the review is saved and marked complete

**Given** required fields are missing  
**When** submission is attempted  
**Then** the system requests completion

---

## Use Case 10: View Reviews — Acceptance Suite

**Given** reviews exist  
**When** the editor requests them  
**Then** all completed reviews are displayed

**Given** no reviews exist  
**When** requested  
**Then** the system indicates reviews are pending

---

## Use Case 11: Make Paper Decision — Acceptance Suite

**Given** reviews are available  
**When** the editor selects a decision  
**Then** the decision is stored

**Given** the decision is deferred  
**When** saved  
**Then** the paper remains undecided

---

## Use Case 12: Notify Author of Decision — Acceptance Suite

**Given** a finalized decision  
**When** notification is sent  
**Then** the author receives the decision

**Given** notification fails  
**When** retry is triggered  
**Then** the system logs the failure

---

## Use Case 13: Generate Conference Schedule — Acceptance Suite

**Given** accepted papers exist  
**When** schedule generation is initiated  
**Then** a schedule is produced

**Given** conflicts are detected  
**When** generating  
**Then** conflicts are flagged

---

## Use Case 14: Edit Conference Schedule — Acceptance Suite

**Given** a generated schedule  
**When** edits are made  
**Then** the schedule is updated

**Given** conflicts persist  
**When** saving  
**Then** the system warns the editor

---

## Use Case 15: View Final Schedule — Acceptance Suite

**Given** the schedule is published  
**When** the author views it  
**Then** the schedule is displayed

**Given** the schedule is unpublished  
**When** accessed  
**Then** the system displays a notice

---

## Use Case 16: View Conference Pricing — Acceptance Suite

**Given** pricing is configured  
**When** the pricing page is viewed  
**Then** pricing information is displayed

**Given** pricing is missing  
**When** accessed  
**Then** an informational message is shown

---

## Use Case 17: Pay Registration Fee — Acceptance Suite

**Given** valid payment details  
**When** payment is submitted  
**Then** registration is confirmed

**Given** payment is declined  
**When** processed  
**Then** the attendee is notified and may retry
