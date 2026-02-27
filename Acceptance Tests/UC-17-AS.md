# Conference Management System — Acceptance Test Suite

## Use Case 17: Pay Registration Fee — Acceptance Suite

**Given** valid payment details  
**When** payment is submitted  
**Then** registration is confirmed

**Given** payment is declined  
**When** processed  
**Then** the attendee is notified and may retry

**Given** gateway returns timeout/unknown for a submitted attempt  
**When** the attendee checks status before reconciliation  
**Then** the attempt is pending and retry is blocked until final outcome is resolved

**Given** the same checkout session and Idempotency-Key are submitted twice  
**When** the second request is processed  
**Then** the original attempt result is returned and no second charge/confirmation is created

**Given** 5 declined retries occurred within 15 minutes  
**When** the attendee submits a 6th retry before cooldown expiry  
**Then** the submission is blocked and cooldown messaging is shown

**Given** a registration payment submission  
**When** payment data is handled by the system  
**Then** only tokenized gateway references are present and no raw cardholder data is stored, processed, or transmitted
