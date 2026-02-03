# Conference Management System (CMS) — Use Cases

---

## Use Case 1: Register Account

**Goal in Context**: Allow a public user to create an account to access CMS features  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Public User  
**Secondary Actors**: Email Service  
**Trigger**: User selects “Register”  

## Success End Condition
* A new registered user account is created and activated

## Failed End Condition
* No account is created

## Preconditions
* User is not logged in

## Main Success Scenario
1. Public user selects the registration option
2. System displays registration form
3. User enters required details
4. User submits the form
5. System validates the information
6. System creates the account
7. System sends confirmation email

## Extensions
* **5a**: Invalid or missing information  
  * **5a1**: System displays validation errors

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Email verification timeout rules

---

## Use Case 2: Log In

**Goal in Context**: Allow a registered user to securely access their dashboard  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Registered User  
**Secondary Actors**: Authentication Service  
**Trigger**: User selects “Log In”  

## Success End Condition
* User is authenticated and logged in

## Failed End Condition
* User remains logged out

## Preconditions
* User has a registered account

## Main Success Scenario
1. User enters credentials
2. System validates credentials
3. System grants access to dashboard

## Extensions
* **2a**: Invalid credentials  
  * **2a1**: System displays error message

## Related Information
* **Priority**: High  
* **Frequency**: High  
* **Open Issues**: Account lockout policy

---

## Use Case 3: Change Password

**Goal in Context**: Allow users to update account credentials  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Registered User  
**Secondary Actors**: Authentication Service  
**Trigger**: User selects “Change Password”  

## Success End Condition
* Password is successfully updated

## Failed End Condition
* Password remains unchanged

## Preconditions
* User is logged in

## Main Success Scenario
1. User enters current password
2. User enters new password
3. System validates new password
4. System updates password

## Extensions
* **3a**: Incorrect current password  
  * **3a1**: System rejects change

## Related Information
* **Priority**: Medium  
* **Frequency**: Low  
* **Open Issues**: Password complexity rules

---

## Use Case 4: Submit Paper

**Goal in Context**: Allow authors to submit papers for review  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Author  
**Secondary Actors**: File Storage Service  
**Trigger**: Author selects “Submit Paper”  

## Success End Condition
* Paper is stored and marked as submitted

## Failed End Condition
* Paper is not submitted

## Preconditions
* Author is logged in

## Main Success Scenario
1. Author enters paper metadata
2. Author uploads paper files
3. System validates submission
4. System saves paper
5. System confirms submission

## Extensions
* **3a**: File upload fails  
  * **3a1**: System prompts retry

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: File size limits

---

## Use Case 5: Save Paper Draft

**Goal in Context**: Allow authors to save incomplete submissions  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Author  
**Trigger**: Author selects “Save Draft”  

## Success End Condition
* Draft is saved for later editing

## Failed End Condition
* Draft is not saved

## Preconditions
* Author has started a submission

## Main Success Scenario
1. Author enters partial submission data
2. Author selects save option
3. System stores draft

## Extensions
* **3a**: System error  
  * **3a1**: Draft is not saved

## Related Information
* **Priority**: Medium  
* **Frequency**: Moderate  
* **Open Issues**: Draft expiration policy

---

## Use Case 6: Assign Reviewers

**Goal in Context**: Ensure papers are reviewed by qualified reviewers  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Editor  
**Secondary Actors**: Reviewer  
**Trigger**: Editor selects paper for assignment  

## Success End Condition
* Reviewers are assigned to the paper

## Failed End Condition
* No reviewers are assigned

## Preconditions
* Paper is submitted

## Main Success Scenario
1. Editor selects a paper
2. Editor selects reviewers
3. System assigns reviewers
4. System notifies reviewers

## Extensions
* **2a**: Reviewer unavailable  
  * **2a1**: Editor selects alternate reviewer

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Conflict-of-interest detection

---

## Use Case 7: Receive Review Invitation

**Goal in Context**: Notify reviewers of assignments  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Reviewer  
**Secondary Actors**: Notification Service  
**Trigger**: Reviewer is assigned to a paper  

## Success End Condition
* Reviewer is notified

## Failed End Condition
* Reviewer is not informed

## Preconditions
* Reviewer is registered

## Main Success Scenario
1. System sends notification
2. Reviewer receives invitation

## Extensions
* **1a**: Notification delivery failure  
  * **1a1**: System retries

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Notification preferences

---

## Use Case 8: Access Assigned Paper

**Goal in Context**: Allow reviewers to read assigned submissions  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Reviewer  
**Trigger**: Reviewer selects assigned paper  

## Success End Condition
* Paper content is accessible

## Failed End Condition
* Paper cannot be accessed

## Preconditions
* Reviewer accepted assignment

## Main Success Scenario
1. Reviewer logs in
2. Reviewer selects paper
3. System displays paper files

## Extensions
* **3a**: Access revoked  
  * **3a1**: System denies access

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Access logging

---

## Use Case 9: Submit Review

**Goal in Context**: Capture reviewer evaluation  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Reviewer  
**Trigger**: Reviewer submits review form  

## Success End Condition
* Review is stored and marked complete

## Failed End Condition
* Review is not submitted

## Preconditions
* Reviewer has access to paper

## Main Success Scenario
1. Reviewer fills review form
2. Reviewer submits form
3. System validates input
4. System saves review

## Extensions
* **3a**: Missing required fields  
  * **3a1**: System requests completion

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Review anonymity

---

## Use Case 10: View Reviews

**Goal in Context**: Allow editors to evaluate feedback  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Editor  
**Trigger**: Editor selects paper reviews  

## Success End Condition
* All completed reviews are visible

## Failed End Condition
* Reviews cannot be viewed

## Preconditions
* Reviews have been submitted

## Main Success Scenario
1. Editor selects a paper
2. System displays associated reviews

## Extensions
* **2a**: No reviews submitted  
  * **2a1**: System displays status

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Review weighting

---

## Use Case 11: Make Paper Decision

**Goal in Context**: Decide acceptance or rejection  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Editor  
**Trigger**: Editor records decision  

## Success End Condition
* Decision is stored

## Failed End Condition
* Decision is not recorded

## Preconditions
* Reviews are available

## Main Success Scenario
1. Editor reviews evaluations
2. Editor selects decision
3. System saves decision

## Extensions
* **2a**: Decision deferred  
  * **2a1**: Paper remains undecided

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Appeal process

---

## Use Case 12: Notify Author of Decision

**Goal in Context**: Inform authors of outcomes  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Author  
**Secondary Actors**: Notification Service  
**Trigger**: Decision is finalized  

## Success End Condition
* Author receives notification

## Failed End Condition
* Author is not informed

## Preconditions
* Decision exists

## Main Success Scenario
1. System generates notification
2. System sends notification
3. Author receives message

## Extensions
* **2a**: Delivery failure  
  * **2a1**: System retries

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Notification timing

---

## Use Case 13: Generate Conference Schedule

**Goal in Context**: Automatically organize sessions  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Administrator  
**Trigger**: Administrator initiates scheduling  

## Success End Condition
* Schedule is generated

## Failed End Condition
* Schedule generation fails

## Preconditions
* Accepted papers exist

## Main Success Scenario
1. Administrator initiates process
2. System assigns sessions
3. System generates schedule

## Extensions
* **2a**: Conflict detected  
  * **2a1**: System flags issue

## Related Information
* **Priority**: Medium  
* **Frequency**: Low  
* **Open Issues**: Optimization rules

---

## Use Case 14: Edit Conference Schedule

**Goal in Context**: Resolve conflicts manually  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Editor  
**Trigger**: Editor selects schedule edit  

## Success End Condition
* Schedule is updated

## Failed End Condition
* Changes are not saved

## Preconditions
* Schedule exists

## Main Success Scenario
1. Editor selects session
2. Editor modifies schedule
3. System saves changes

## Extensions
* **3a**: Conflict remains  
  * **3a1**: System warns editor

## Related Information
* **Priority**: Medium  
* **Frequency**: Low  
* **Open Issues**: Versioning

---

## Use Case 15: View Final Schedule

**Goal in Context**: Inform authors of presentation times  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Author  
**Trigger**: Schedule is published  

## Success End Condition
* Author views schedule

## Failed End Condition
* Schedule unavailable

## Preconditions
* Schedule is finalized

## Main Success Scenario
1. Author logs in
2. Author views schedule

## Extensions
* **2a**: Schedule unpublished  
  * **2a1**: System displays notice

## Related Information
* **Priority**: Medium  
* **Frequency**: Moderate  
* **Open Issues**: Time zone display

---

## Use Case 16: View Conference Pricing

**Goal in Context**: Allow users to decide on attendance  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Public User  
**Trigger**: User views pricing page  

## Success End Condition
* Pricing information is displayed

## Failed End Condition
* Pricing unavailable

## Preconditions
* Pricing is configured

## Main Success Scenario
1. User navigates to pricing page
2. System displays pricing details

## Extensions
* **2a**: Pricing not set  
  * **2a1**: System displays message

## Related Information
* **Priority**: Medium  
* **Frequency**: High  
* **Open Issues**: Discount rules

---

## Use Case 17: Pay Registration Fee

**Goal in Context**: Complete attendee registration  
**Scope**: Conference Management System  
**Level**: User Goal  
**Primary Actor**: Attendee  
**Secondary Actors**: Payment Gateway  
**Trigger**: Attendee selects payment option  

## Success End Condition
* Payment is completed and registration confirmed

## Failed End Condition
* Registration is incomplete

## Preconditions
* Attendee is logged in

## Main Success Scenario
1. Attendee enters payment details
2. System processes payment
3. Payment is approved
4. System confirms registration

## Extensions
* **2a**: Payment declined  
  * **2a1**: System prompts retry

## Related Information
* **Priority**: High  
* **Frequency**: Moderate  
* **Open Issues**: Refund policy
