# Audit Platform - Application Pages & Components Documentation

This document provides a comprehensive overview of all pages in the Internal Audit Platform application, including their components, fields, and functionality. This is intended for UI/UX designers to understand the structure and requirements of each page without design constraints.

---

## Table of Contents

1. [Authentication Pages](#authentication-pages)
2. [Dashboard](#dashboard)
3. [Plants](#plants)
4. [Audits](#audits)
5. [Observations](#observations)
6. [Checklists](#checklists)
7. [Reports](#reports)
8. [Admin Pages](#admin-pages)
9. [AI Assistant](#ai-assistant)

---

## Authentication Pages

### Login Page (`/login`)

**Purpose**: User authentication and access to the platform

**Components**:
- Logo/Branding area (IA logo)
- Page title: "Internal Audit Platform"
- Subtitle: "Sign in to your account"
- Email input field (required)
- Password input field (required)
- Sign in button
- Success message display (if coming from invite acceptance)
- Error message display (for invalid credentials)
- Footer text: "Secured by NextAuth • Protected Access"

**Fields**:
- Email (text input, required)
- Password (password input, required)

---

### Accept Invite Page (`/accept-invite`)

**Purpose**: New users accept invitations and create their account

**Components**:
- Logo/Icon area
- Page title: "Accept Invitation"
- Subtitle: "Complete your account setup to get started"
- Invite token input field (required)
- Name input field (required)
- Password input field (required, minimum 8 characters)
- Accept invitation button
- Error message display
- Link to login page: "Already have an account? Sign in"

**Fields**:
- Invite Token (text input, required)
- Your Name (text input, required)
- Create Password (password input, required, min 8 chars)

---

## Dashboard

### Dashboard Home (`/dashboard`)

**Purpose**: Overview of audit platform metrics and quick access

**Components**:
- Page title: "Dashboard"
- Subtitle: "Overview of your audit platform"
- Two main metric cards:

**Audits Card**:
- Card title: "Audits"
- "View all" link to audits page
- Total audits count (large number)
- Status breakdown section:
  - Planned count
  - In Progress count
  - Submitted count
  - Signed Off count
- Each status shows count with badge

**Observations Card**:
- Card title: "Observations"
- "View all" link to observations page
- Total observations count (large number)
- Status section:
  - Pending count
  - In Progress count
  - Resolved count
- Risk levels section:
  - Risk A count (high)
  - Risk B count (medium)
  - Risk C count (low)
- Attention needed section (if applicable):
  - Overdue count
  - Due soon count

**Loading State**: Shows skeleton/loading placeholders while data loads

---

## Plants

### Plants Page (`/plants`)

**Purpose**: Manage facilities and locations (plants) where audits are conducted

**Components**:
- Page title: "Plants"
- Subtitle: "Manage facilities and locations"

**Create Plant Form** (Admin only - CFO/CXO Team):
- Form title: "Create Plant (Admin only)"
- Plant Code input field (required, e.g., "PLT001")
- Plant Name input field (required)
- Add Plant button
- Error message display

**Existing Plants Table**:
- Table columns:
  - Code (plant code)
  - Name (plant name)
  - Created (creation date)
- Empty state when no plants exist
- Table shows all plants in a list format

**Fields for Creating Plant**:
- Code (text input, required)
- Name (text input, required)

---

## Audits

### Audits List Page (`/audits`)

**Purpose**: View all audits and create new audits

**Components**:
- Page title: "Audits"
- Subtitle: "Create and manage audit schedules"

**Create Audit Form** (CFO/CXO Team only):
- Form title: "Create Audit (CFO/CXO Team)"
- Plant dropdown (required) - shows "Code — Name" format
- Audit Title input field (optional)
- Audit Purpose textarea (optional, multi-line)
- Visit Start Date (date picker, optional)
- Visit End Date (date picker, optional)
- Management Response Date (date picker, optional)
- Final Presentation Date (date picker, optional)
- Visit Details input field (optional)
- Create Audit button
- Error message display

**Info Banner** (for non-admin users):
- Message: "You can view audits assigned to you below. Only CFO and CXO Team can create new audits."

**All Audits Table**:
- Table columns:
  - Audit Title
  - Plant (code and name)
  - Period (visit start → end dates)
  - Lock Status (badge: Completed/Locked/Open)
  - Progress (done/total observations)
  - Auditors (list of assigned auditor emails/names)
  - Action column with "Open →" link
- Table shows all audits user has access to
- Empty state when no audits exist

**Fields for Creating Audit**:
- Plant (dropdown, required)
- Audit Title (text input, optional)
- Audit Purpose (textarea, optional)
- Visit Start Date (date, optional)
- Visit End Date (date, optional)
- Visit Details (text input, optional)
- Management Response Date (date, optional)
- Final Presentation Date (date, optional)

---

### Audit Detail Page (`/audits/[auditId]`)

**Purpose**: View and manage a specific audit's details, assignments, and settings

**Components**:
- Page header:
  - Title: "Audit — [Plant Code] [Plant Name]"
  - Subtitle: Audit title (if exists)
- Error message display

**Audit Controls Card** (CFO/CXO Team only):
- Card title: "Audit Controls"
- Current State badge (Completed/Locked/Open)
- Lock metadata display (if locked):
  - Locked timestamp
- Completion metadata display (if completed):
  - Completed timestamp
- Action buttons:
  - Lock Audit button (if not locked/completed)
  - Mark Complete button (if not locked/completed)
  - Unlock Audit button (if locked)
- Note: "Locking an audit restricts most operations. Completing an audit automatically locks it. CFO can override locks."

**Audit Visibility Configuration Card** (CFO/CXO Team only):
- Card title: "Audit Visibility Configuration"
- Current visibility setting badge:
  - Show All Audits
  - Last 12 Months Only
  - Hide All Historical Audits
  - Default (Show All)
- Visibility preset dropdown:
  - Options: "Show All Audits", "Last 12 Months Only", "Hide All Historical Audits"
- Apply button
- Visibility rules explanation section

**Details Card**:
- Card title: "Details"
- Fields displayed:
  - Title
  - Purpose
  - Status (badge)
  - Visit Dates (start → end)
  - Visit Details
  - Management Response Date
  - Final Presentation Date
- Progress section:
  - Progress bar (done/total observations)
  - Percentage complete

**Assignments Card**:
- Card title: "Assignments"

**Audit Head Section**:
- Section title: "Audit Head"
- If assigned:
  - User avatar/initial
  - User email/name
  - "Audit Head" badge
  - Change button (if admin)
- If not assigned:
  - Warning message
  - Dropdown to select Audit Head
  - Assign button

**Team Members (Auditors) Section**:
- Section title: "Team Members (Auditors)"
- Add auditor interface (if admin):
  - Auditor dropdown
  - Add button
- List of assigned auditors:
  - User avatar/initial
  - User email/name
  - Remove button (if admin)
- Empty state if no auditors assigned

**Fields/Data Displayed**:
- Title
- Purpose
- Status
- Visit Start Date
- Visit End Date
- Visit Details
- Management Response Date
- Final Presentation Date
- Progress (done/total)
- Audit Head assignment
- Auditor assignments
- Lock status
- Completion status
- Visibility rules

---

## Observations

### Observations List Page (`/observations`)

**Purpose**: View, filter, search, and create observations

**Components**:
- Page title: "Observations"
- Subtitle: "Track and manage audit findings"

**Filter Observations Card**:
- Card title: "Filter Observations"

**Basic Filters Section**:
- Plant dropdown (All Plants / specific plants)
- Audit dropdown (All Audits / specific audits)
- Audit Start Date (date picker)
- Audit End Date (date picker)

**Advanced Filters Section**:
- Risk Category dropdown (All Risks / A / B / C)
- Process dropdown (All Processes / O2C / P2P / R2R / Inventory)
- Status dropdown (All Statuses / Pending MR / MR Under Review / Referred Back / Observation Finalised / Resolved)
- Published dropdown (Any / Published / Unpublished)

**Sort & Search Section**:
- Sort By dropdown (Created Date / Updated Date / Risk Category / Current Status / Approval Status)
- Order dropdown (Newest First / Oldest First)
- Search input field

**Action Buttons**:
- Reset Filters button
- Export CSV button

**Create Observation Form** (Auditor/Audit Head only):
- Form title: "Create Observation (Admin/Auditor)"
- Audit dropdown (required)
- Observation text input (required, multi-line)
- Create Observation button
- Error message display

**Results Table**:
- Table header with result count
- Table columns:
  - Plant (plant code)
  - Audit (audit title or date)
  - Audit Status (Locked/Open badge)
  - Observation (truncated title, max 60 chars)
  - Risk (Risk category badge: A/B/C)
  - Status (Current status badge)
  - Approval (Approval status badge)
  - Action column with "Open →" link
- Empty state when no observations match filters

**Fields for Creating Observation**:
- Audit (dropdown, required)
- Observation (text input, required)

**Filter Options**:
- Plant
- Audit
- Audit Start Date
- Audit End Date
- Risk Category (A/B/C)
- Process (O2C/P2P/R2R/Inventory)
- Status (Pending MR / MR Under Review / Referred Back / Observation Finalised / Resolved)
- Published (Yes/No)
- Search query
- Sort by (Created Date / Updated Date / Risk Category / Current Status / Approval Status)
- Sort order (Ascending / Descending)

---

### Observation Detail Page (`/observations/[id]`)

**Purpose**: View and edit a specific observation with all its details, attachments, notes, action plans, approvals, and change requests

**Components**:
- Back button
- Audit lock banner (if audit is locked)
- Audit completion banner (if audit is completed)
- Page header:
  - Title: "Observation"
  - Subtitle: Plant code and name
  - Approval status badge
  - Created timestamp
  - Presence indicator (shows who's viewing)
- Error message display

**Auditee Information Banner** (for Auditee role):
- Shows assignment status
- Shows edit permissions based on assignment and audit lock status

**Main Observation Form Card**:
- Form with multiple sections

**Section 1: Auditor Section** (Fields managed by auditors and audit heads):
- Section title: "Auditor Section — Fields managed by auditors and audit heads"
- Fields:
  - Observation Text (textarea, required) - can be locked
  - Risks Involved (textarea) - can be locked
  - Risk Category (dropdown: Select / A / B / C) - can be locked
  - Likely Impact (dropdown: Select / Local / Org-wide) - can be locked
  - Concerned Process (dropdown: Select / O2C / P2P / R2R / Inventory) - can be locked
  - Auditor Person (text input) - can be locked
- Each field shows lock indicator if locked

**Section 2: Auditee Section** (Fields managed by assigned auditees):
- Section title: "Auditee Section — Fields managed by assigned auditees"
- Fields:
  - Auditee Person (Tier 1) (text input) - can be locked
  - Auditee Person (Tier 2) (text input) - can be locked
  - Auditee Feedback (textarea) - can be locked
  - Auditor Response to Auditee Remarks (textarea) - can be locked

**Current Status Section**:
- Current Status (dropdown):
  - Pending MR
  - MR under review
  - Referred back for MR
  - Observation finalised
  - Resolved

**Action Buttons**:
- Save Changes button
- Request Change button (for auditors when approved)
- Submit for Approval button (for auditors/audit heads)
- Approve button (for audit heads)
- Reject button (for audit heads)
- Delete Observation button (CFO/Audit Head)
- Publish/Unpublish button (CFO only)
- Retest: Pass button (auditors/audit heads)
- Retest: Fail button (auditors/audit heads)
- Field unlock controls (CFO only, if fields are locked)

**Assigned Auditees Card**:
- Card title: "Assigned Auditees"
- List of assigned auditees:
  - User avatar/initial
  - User email/name
  - Assigned date
  - Remove button (if user can manage assignments)
- Assign Auditee interface:
  - Auditee dropdown
  - Assign button
- Empty state if no auditees assigned

**Attachments Card**:
- Card title: "Attachments"
- Two-column layout:

**Annexures Section**:
- Section title: "Annexures ([count])"
- List of annexure files (downloadable links)
- File upload input
- Upload button (for auditors/audit heads)
- Empty state if no annexures

**Management Docs Section**:
- Section title: "Management Docs ([count])"
- List of management document files (downloadable links)
- File upload input
- Upload button (for auditors/audit heads/auditees)
- Empty state if no management docs

**Notes Card**:
- Card title: "Notes ([count])"
- Add note interface:
  - Note textarea
  - Visibility dropdown (All / Internal)
  - Add Note button
- List of notes:
  - Author name/email
  - Visibility badge
  - Timestamp
  - Note text
- Empty state if no notes

**Action Plans Card**:
- Card title: "Action Plans ([count])"
- Add action plan interface:
  - Plan input field
  - Owner input field
  - Target Date (date picker)
  - Status dropdown (Status / Pending / Completed)
  - Retest dropdown (Retest / Retest due / Pass / Fail) - for auditors/audit heads
  - Add Plan button
- List of action plans:
  - Plan text
  - Owner
  - Target Date
  - Status
  - Retest result (badge)
  - Created timestamp
- Empty state if no action plans

**Approvals Card**:
- Card title: "Approvals ([count])"
- List of approval records:
  - Status badge (Submitted / Approved / Rejected)
  - Timestamp
  - Actor name/email
  - Comment (if exists)
- Empty state if no approvals

**Change Requests Card**:
- Card title: "Change Requests"
- List of change requests:
  - Status badge (Pending / Approved / Denied)
  - Requester name/email
  - Created timestamp
  - Comment (if exists)
  - Decision info (if decided):
    - Decided by name/email
    - Decision timestamp
    - Decision comment
  - Approve & Apply button (CFO only, if pending)
  - Deny button (CFO only, if pending)
  - JSON patch preview
- Empty state if no change requests

**Fields in Observation Form**:
- Observation Text (textarea, required)
- Risks Involved (textarea)
- Risk Category (dropdown: A/B/C)
- Likely Impact (dropdown: Local/Org-wide)
- Concerned Process (dropdown: O2C/P2P/R2R/Inventory)
- Auditor Person (text)
- Auditee Person (Tier 1) (text)
- Auditee Person (Tier 2) (text)
- Auditee Feedback (textarea)
- Auditor Response to Auditee Remarks (textarea)
- Target Date (date)
- Person Responsible to Implement (text)
- Current Status (dropdown)

**Additional Features**:
- Real-time presence indicators
- Field locking/unlocking
- File attachments (Annexures and Management Docs)
- Notes with visibility settings
- Action plans with retest tracking
- Approval workflow
- Change request workflow
- Role-based field editing permissions

---

## Checklists

### Checklists Page (`/checklists`)

**Purpose**: Manage audit checklists and templates

**Current Status**: Module not available (placeholder page)

**Components**:
- Page title: "Checklists"
- Subtitle: "Manage audit checklists and templates"
- Empty state card:
  - Icon
  - Title: "Module Not Available"
  - Message: "The checklist module has been removed for this release. Check back in future updates for checklist management functionality."

---

## Reports

### Reports Page (`/reports`)

**Purpose**: View analytics, metrics, and export audit reports

**Components**:
- Page title: "Reports"
- Subtitle: "View analytics and export audit reports"

**Filters Card**:
- Card title: "Filters"
- Filter fields:
  - Plant dropdown (All / specific plants)
  - Audit dropdown (All / specific audits)
  - Start Date (date picker)
  - End Date (date picker)
  - Risk Category dropdown (All / A / B / C)
  - Process dropdown (All / O2C / P2P / R2R / Inventory)
  - Status dropdown (All / Pending MR / MR Under Review / Referred Back / Observation Finalised / Resolved)
  - Published dropdown (Any / Published / Unpublished)
- Action buttons:
  - Save Preset button
  - Load Preset button
  - Reset Filters button
  - Download Period Report button
  - Download Retest Report button

**Due Window Configuration Card**:
- Card title: "Due window (days)"
- Number input (1-60 days, default 14)
- Description: "Show action plans due within this time frame"

**Overview Metrics Section**:
- Section title: "Overview"
- Four metric cards:
  - Total Observations (large number)
  - Pending (large number, warning color)
  - In Progress (large number, primary color)
  - Resolved (large number, success color)

**Three Detail Cards**:
- Approvals Card:
  - Title: "Approvals"
  - Draft count (badge)
  - Submitted count (badge)
  - Approved count (badge)
  - Rejected count (badge)

- Publication Status Card:
  - Title: "Publication Status"
  - Published count (badge)
  - Unpublished count (badge)

- By Risk Category Card:
  - Title: "By Risk Category"
  - Category A count (badge)
  - Category B count (badge)
  - Category C count (badge)

**Two Action Plan Tables**:

**Overdue Action Plans Table**:
- Card title: "Overdue Action Plans"
- Table columns:
  - Plant
  - Plan (truncated)
  - Target (date)
  - Owner
  - Retest (badge: Due/Pass/Fail)
- Empty state if no overdue plans

**Due Soon Action Plans Table**:
- Card title: "Due Soon (next [days] days)"
- Table columns:
  - Plant
  - Plan (truncated)
  - Target (date)
  - Owner
  - Retest (badge: Due/Pass/Fail)
- Empty state if no plans due soon

**Filter Options**:
- Plant
- Audit
- Start Date
- End Date
- Risk Category
- Process
- Status
- Published status
- Due window (days)

**Export Options**:
- Period Report (CSV export)
- Retest Report (CSV export)

---

## Admin Pages

### User Management Page (`/admin/users`)

**Purpose**: Invite new users to the platform (CFO/CXO Team only)

**Components**:
- Page title: "User Management"
- Subtitle: "Invite new users to the audit platform"

**Invite New User Form**:
- Form title: "Invite New User"
- Email Address input field (required, email format)
- Role dropdown (required):
  - Guest
  - Auditee
  - Auditor
  - CXO Team (CFO only)
  - Audit Head (CFO only)
- Expires In (Days) input field (number, 1-30, default 7)
- Helper text: "Invitation will expire after this many days (1-30)"
- Send Invitation button

**Success Message Card** (after invitation created):
- Success icon
- Title: "Invitation Created Successfully"
- Message: "Share this invitation link with the user:"
- Invite URL input field (read-only)
- Copy button

**Fields for Inviting User**:
- Email Address (email input, required)
- Role (dropdown, required)
- Expires In Days (number input, 1-30, default 7)

---

### Data Import Page (`/admin/import`)

**Purpose**: Import data from Excel files (CFO only)

**Components**:
- Page title: "Data Import (Excel)"
- Description: "Upload a single .xlsx with sheets Plants, Audits, and Observations. First run a dry-run to validate, then import."

**Template & Docs Section**:
- Download template link
- Read import spec link

**Upload & Validate Section**:
- File upload interface
- Validation and import controls

**Note**: This page is only accessible to CFO role users.

---

## AI Assistant

### AI Assistant Page (`/ai`)

**Purpose**: Chat with AI assistant about audits and observations (not available to Auditee/Guest roles)

**Components**:
- Page header showing logged-in user name and role

**Two-Column Layout**:

**Left Column - Conversations Sidebar**:
- New chat button
- Section header: "Conversations"
- Conversation count
- List of conversations:
  - Conversation title or "Conversation [number]"
  - Last message preview (truncated)
  - Last activity timestamp
  - Active state highlighting
- Loading state
- Empty state

**Right Column - Chat Interface**:
- Chat header:
  - Conversation title
  - Last activity timestamp
  - Rename button
  - Delete button
- Error message display (if any)
- Chat messages area:
  - User messages (right-aligned, blue background)
  - AI messages (left-aligned, gray background)
  - Message role labels ("You" / "AI Assistant")
  - Markdown rendering for AI responses
  - Tool call displays (for various tools like observations_count, observations_list, audits_count, etc.)
  - Streaming indicator (animated dots)
- Empty state (when no messages):
  - Icon
  - "Start a conversation by asking a question below"
  - Suggested questions section:
    - "How many draft observations do I have?"
    - "List my observations with risk category A"
    - "Show me audits in progress"
    - "Count approved observations in Plant X"
    - "What audits am I assigned to?"
- Chat input area:
  - Textarea for message input
  - Placeholder: "Ask a question about audits or observations..."
  - Clear chat button
  - Send button
  - Helper text: "The AI assistant respects your role permissions. You can only see data you have access to."

**Features**:
- Multiple conversation sessions
- Conversation renaming
- Conversation deletion
- Message history
- Real-time streaming responses
- Tool call visualization
- Markdown support
- Role-based data access

**Suggested Questions**:
- "How many draft observations do I have?"
- "List my observations with risk category A"
- "Show me audits in progress"
- "Count approved observations in Plant X"
- "What audits am I assigned to?"

**Note**: This page redirects Auditee and Guest roles to the observations page.

---

## Navigation

### Navigation Bar (Present on all dashboard pages)

**Components**:
- Logo/Branding (IA logo with "Internal Audit" text)
- Navigation links (role-based visibility):
  - Plants (if user has access)
  - Audits (if user has access)
  - Observations (if user has access)
  - Reports (if user has access)
  - Users (Admin only - CFO/CXO Team)
  - Import (CFO only)
  - AI Assistant (not for Auditee/Guest)
- User menu:
  - User name/email
  - Sign out option

---

## Common UI Components Used Across Pages

### Cards
- Used for grouping related content
- Support padding variants (lg, md, sm)
- Hover effects on some cards

### Badges
- Status indicators
- Color variants: neutral, primary, warning, success, error
- Size variants: default, sm

### Buttons
- Variants: primary, secondary, ghost, destructive
- Size variants: default, sm, md
- Loading state support
- Disabled state support

### Input Fields
- Text inputs
- Password inputs
- Email inputs
- Date pickers
- Textareas
- Dropdowns/Selects
- File uploads
- Helper text support
- Error state support

### Tables
- Sticky headers
- Zebra striping (alternating row colors)
- Hover effects
- Responsive design
- Empty states

### Forms
- Validation support
- Error message display
- Success message display
- Loading states

### Empty States
- Icon
- Title
- Description
- Optional action buttons

---

## User Roles & Permissions

The application has the following user roles with different access levels:

- **CFO**: Full access to all features, can override locks
- **CXO Team**: Can manage plants, audits, users, visibility settings
- **Audit Head**: Can lead audits, approve/reject observations, create observations
- **Auditor**: Can create and edit draft observations, submit for approval
- **Auditee**: Can edit designated fields on assigned observations only
- **Guest**: Read-only access with scope restrictions

Role-based visibility and permissions are enforced throughout the application.

---

