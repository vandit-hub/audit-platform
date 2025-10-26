# Task 8: Manual Testing

**Duration:** 3-4 hours

## Overview

This task involves comprehensive manual testing with different user roles to verify RBAC enforcement and functionality.

## Prerequisites

- [ ] Development server is running (`npm run dev`)
- [ ] Database is seeded with test data (`npm run db:seed`)
- [ ] All previous tasks (1-7) are completed

## Test Setup

### Test Credentials

Use these credentials from the seeded database:

- **CFO**: `cfo@example.com` / `cfo123`
- **CXO Team**: `cxo@example.com` / `cxo123`
- **Audit Head**: `audithead@example.com` / `audithead123`
- **Auditor**: `auditor@example.com` / `auditor123`
- **Auditee**: `auditee@example.com` / `auditee123`
- **Guest**: `guest@example.com` / `guest123`

---

## Test 1: AUDITOR Role

### Setup
1. Login as `auditor@example.com`
2. Navigate to `/agent-chat`

### Test Cases

#### TC 1.1: Basic Question
- **Action**: Ask "How many observations do I have?"
- **Expected Result**:
  - Agent responds with count
  - Count only includes observations from assigned audits
  - Response is clear and conversational

#### TC 1.2: Filter by Status
- **Action**: Ask "Show me my draft observations"
- **Expected Result**:
  - Agent lists draft observations
  - Only shows observations from assigned audits
  - Includes basic details (risk, status, plant)

#### TC 1.3: Filter by Risk Category
- **Action**: Ask "How many high-risk observations do I have?"
- **Expected Result**:
  - Agent returns count of Category A observations
  - Only counts observations from assigned audits

#### TC 1.4: No Results
- **Action**: Ask "Show me observations from audit XYZ999" (invalid audit ID)
- **Expected Result**:
  - Agent politely indicates no observations found
  - Doesn't show error or crash

### RBAC Verification for AUDITOR
- [ ] Cannot see observations from unassigned audits
- [ ] Can see all observations from assigned audits
- [ ] Stats and counts only include assigned audits

---

## Test 2: AUDIT_HEAD Role

### Setup
1. Logout and login as `audithead@example.com`
2. Navigate to `/agent-chat`

### Test Cases

#### TC 2.1: Basic Question
- **Action**: Ask "How many observations do I have?"
- **Expected Result**:
  - Agent responds with count
  - Count includes observations from audits they lead

#### TC 2.2: Filter by Status
- **Action**: Ask "Show me approved observations"
- **Expected Result**:
  - Agent lists approved observations
  - Shows observations from audits they lead or are assigned to

#### TC 2.3: Statistics
- **Action**: Ask "Give me a breakdown of observations by status"
- **Expected Result**:
  - Agent shows counts by status (draft, submitted, approved, rejected)
  - Only includes their audits

### RBAC Verification for AUDIT_HEAD
- [ ] Can see observations from audits they lead
- [ ] Can see observations from audits they're assigned to as auditor
- [ ] Cannot see observations from other audits
- [ ] Has broader access than regular AUDITOR

---

## Test 3: CFO Role

### Setup
1. Logout and login as `cfo@example.com`
2. Navigate to `/agent-chat`

### Test Cases

#### TC 3.1: Organization-Wide Question
- **Action**: Ask "How many observations are there in total?"
- **Expected Result**:
  - Agent responds with count of ALL observations
  - No filtering applied (unrestricted access)

#### TC 3.2: All Observations
- **Action**: Ask "Show me all observations"
- **Expected Result**:
  - Agent lists observations from all audits
  - Includes observations from all plants

#### TC 3.3: Statistics
- **Action**: Ask "What's the breakdown by risk category?"
- **Expected Result**:
  - Shows counts for Category A, B, C across entire organization
  - No RBAC restrictions

### RBAC Verification for CFO
- [ ] Has access to ALL observations (no filters)
- [ ] Can see observations from any audit
- [ ] Can see observations from any plant
- [ ] No RBAC restrictions applied

---

## Test 4: General Functionality Tests

### UI Tests

#### TC 4.1: Empty Chat State
- **Expected**: Example questions are shown
- **Verify**: Examples are relevant and clickable (if implemented)

#### TC 4.2: Loading State
- **Action**: Send a message
- **Expected**: Loading animation (3 dots) appears while waiting
- **Verify**: Input is disabled during loading

#### TC 4.3: Message Display
- **Action**: Send several messages
- **Expected**:
  - User messages appear on right (blue background)
  - Agent messages appear on left (gray background)
  - Messages are properly formatted
  - Auto-scrolls to bottom

#### TC 4.4: Input Interactions
- **Test Enter key**: Press Enter → message sends
- **Test Shift+Enter**: Press Shift+Enter → new line added
- **Test empty message**: Send button should be disabled

#### TC 4.5: Multiple Questions
- **Action**: Ask 3-4 questions in sequence
- **Expected**:
  - Each response appears correctly
  - Conversation history is maintained
  - No memory leaks or performance issues

---

## Test 5: Error Handling

#### TC 5.1: Empty Message
- **Action**: Try to send empty message
- **Expected**: Send button is disabled

#### TC 5.2: Network Error (Simulated)
- **Action**: Stop dev server, send message
- **Expected**:
  - Error message displayed
  - User can retry
  - UI doesn't crash

#### TC 5.3: Invalid Question
- **Action**: Ask nonsensical question "asdfasdfasdf"
- **Expected**:
  - Agent responds politely
  - Doesn't crash or error

---

## Test 6: RBAC Security Tests

### Critical Security Checks

#### TC 6.1: Data Isolation
- **Setup**: Login as AUDITOR with specific assignments
- **Action**: Ask for all observations
- **Verify**:
  - Response only includes observations from assigned audits
  - No data leakage from other audits
  - Manually check observation IDs against database

#### TC 6.2: Cross-Role Comparison
- **Action**:
  1. Login as AUDITOR, note observation count
  2. Logout, login as CFO, note observation count
  3. Compare counts
- **Verify**:
  - CFO count ≥ AUDITOR count
  - AUDITOR count matches their assignments in DB

#### TC 6.3: Tool Call Verification
- **Action**: Ask question that triggers tools
- **Verify** (via server logs):
  - Correct userId and role passed to tools
  - RBAC functions called with correct parameters
  - Database queries include correct WHERE clauses

---

## Test 7: Performance Tests

#### TC 7.1: Response Time
- **Action**: Ask simple question
- **Expected**: Response in < 10 seconds

#### TC 7.2: Large Result Set
- **Action**: Ask for all observations (as CFO with many observations)
- **Expected**:
  - Response doesn't timeout
  - Pagination/limiting works (max 50 observations)

---

## Regression Tests

### Verify Existing Features Still Work

- [ ] Login/logout still works
- [ ] Navigation bar works
- [ ] Observations page still loads
- [ ] Audits page still loads
- [ ] No TypeScript errors in console
- [ ] No console errors in browser

---

## Bug Tracking

Document any issues found:

### Bug Template

```
**Bug ID**: BUG-001
**Severity**: High/Medium/Low
**Role**: AUDITOR
**Description**: [What happened]
**Expected**: [What should happen]
**Steps to Reproduce**:
1. Login as auditor
2. Ask "..."
3. Observe...

**Actual Result**: [What actually happened]
**Console Errors**: [Any errors in console]
**Server Logs**: [Any errors in server logs]
```

---

## Test Results Summary

After completing all tests, fill out:

### Test Summary

| Test Category | Total Tests | Passed | Failed | Blocked |
|---------------|-------------|--------|--------|---------|
| AUDITOR Role  |             |        |        |         |
| AUDIT_HEAD    |             |        |        |         |
| CFO Role      |             |        |        |         |
| UI Tests      |             |        |        |         |
| Error Tests   |             |        |        |         |
| RBAC Security |             |        |        |         |
| Performance   |             |        |        |         |

### Critical Issues

List any critical issues that must be fixed before deployment:

1.
2.
3.

### Non-Critical Issues

List minor issues that can be fixed post-MVP:

1.
2.
3.

---

## Verification Checklist

After completing all tests:

- [ ] All critical security tests pass (no RBAC violations)
- [ ] UI is functional and usable
- [ ] Error handling works
- [ ] No console errors in browser
- [ ] No server errors in logs
- [ ] Performance is acceptable (< 10s response time)
- [ ] All roles tested (AUDITOR, AUDIT_HEAD, CFO minimum)
- [ ] Documentation of any bugs found

## Next Steps

If all tests pass:
- Proceed to **TASK_9.md** - Deployment

If critical issues found:
- Fix issues
- Re-test
- Document fixes
