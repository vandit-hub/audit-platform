# Audit Components

This directory contains reusable components for the audit management system.

## Components

### ChecklistsTable

Displays checklists associated with an audit in a table format with status, progress, and assigned auditors.

**Usage:**

```tsx
import { ChecklistsTable } from "@/app/(dashboard)/audits/_components/ChecklistsTable";

export default function AuditDetailsPage({ params }: { params: { auditId: string } }) {
  return (
    <div>
      <h2>Checklists</h2>
      <ChecklistsTable auditId={params.auditId} />
    </div>
  );
}
```

**Features:**
- Fetches checklists from `/api/v1/audits/[auditId]/checklists`
- Shows checklist name and description
- Status badges (Not Started, In Progress, Completed)
- Progress bar with percentage
- Assigned auditor with avatar
- Loading, error, and empty states
- Clickable rows (navigates to `/checklists/[checklistId]`)
- Hover effects

**Columns:**
- **Checklist Name** - Name and optional description
- **Status** - Badge showing current status
- **Progress** - Visual progress bar + percentage
- **Assigned To** - Auditor avatar and name

### ObservationsTable

Displays observations linked to an audit with status, risk, and assignments.

**Usage:**

```tsx
import { ObservationsTable } from "@/app/(dashboard)/audits/_components/ObservationsTable";

export default function AuditDetailsPage({ params }: { params: { auditId: string } }) {
  return (
    <div>
      <h2>Observations</h2>
      <ObservationsTable auditId={params.auditId} />
    </div>
  );
}
```

## API Endpoints

### GET /api/v1/audits/[id]/checklists

Returns all checklists linked to the audit with:
- Checklist details (id, name, description)
- Status (NOT_STARTED, IN_PROGRESS, COMPLETED)
- Progress calculation based on completed items
- Assigned auditor (distributed round-robin from audit assignments)
- Item counts (total, completed)

### GET /api/v1/observations?auditId=[id]

Returns all observations linked to the audit with assignments and details.

## Styling

All components use the v2 design system with CSS custom properties:
- `var(--c-texPri)` - Primary text
- `var(--c-texSec)` - Secondary text
- `var(--c-palUiBlu600)` - Blue accent
- `var(--c-palUiGre600)` - Green accent
- `var(--border-color-regular)` - Border color

Status badges follow the design system color palette for consistency.
