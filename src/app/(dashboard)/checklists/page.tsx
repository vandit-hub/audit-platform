"use client";

import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import Checkbox from "@/components/ui/Checkbox";
import Tag from "@/components/ui/Tag";
import {
  NotionTable,
  NotionTableCell,
  NotionTableHeader,
  NotionTableRow
} from "@/components/ui/NotionTable";

const checklistTemplates = [
  {
    name: "Procure-to-Pay Controls",
    owner: "Audit Head",
    category: "Finance",
    status: "inProgress" as const,
    items: 42,
    mapped: 0.68,
    lastUpdated: "2025-10-28"
  },
  {
    name: "Inventory Cycle Counts",
    owner: "CXO Team",
    category: "Operations",
    status: "notStarted" as const,
    items: 31,
    mapped: 0.24,
    lastUpdated: "2025-09-19"
  },
  {
    name: "Revenue Recognition",
    owner: "CFO",
    category: "Compliance",
    status: "blocked" as const,
    items: 27,
    mapped: 0.0,
    lastUpdated: "2025-08-11"
  }
];

const readinessChecklist = [
  { label: "Template metadata migrated to Notion tokens", done: true },
  { label: "Dynamic item builder aligned with new Input & Select", done: false },
  { label: "Workflow permissions mapped to RBAC v2", done: false },
  { label: "Audit trail events updated for new schema", done: false }
];

export default function ChecklistsPage() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Checklists</h1>
        <p className="text-sm text-text-light">
          Next up in the Notion-inspired refresh: collaborative checklist templates with granular progress tracking.
        </p>
      </div>

      <Card variant="feature" padding="lg">
        <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-400 bg-gray-900 text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M4 7a2 2 0 012-2h12a2 2 0 012 2M4 7v10a2 2 0 002 2h8m-10-12h16M9 17h1m4 0h1m2 0h.01M9 13h6" />
            </svg>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-gray-900">Notion-style template workspace in progress</h2>
              <p className="text-sm leading-6 text-text-medium">
                We’re migrating the checklist builder to the new design system. Existing templates remain read-only while
                we finish the Notion interactions for item ordering, approvals, and context-rich previews.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" asChild>
                <a href="mailto:support@ezaudit.example?subject=Checklist%20migration%20early%20access">Request early access</a>
              </Button>
              <Button variant="ghost" disabled>
                New template
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card variant="feature">
        <NotionTableHeader
          title="Template library"
          description="Legacy templates queued for the Notion migration. Items stay locked until the new builder ships."
          actions={
            <Button variant="secondary" disabled>
              Export checklist CSV
            </Button>
          }
        />
        <NotionTable>
          <thead>
            <NotionTableRow hoverable={false}>
              <NotionTableCell as="th" scope="col">Template</NotionTableCell>
              <NotionTableCell as="th" scope="col" nowrap>
                Category
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" nowrap>
                Owner
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" nowrap>
                Status
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" align="center" nowrap>
                Ready
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" numeric>
                Items
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" nowrap>
                Migration progress
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" nowrap>
                Last updated
              </NotionTableCell>
            </NotionTableRow>
          </thead>
          <tbody>
            {checklistTemplates.map((template) => (
              <NotionTableRow key={template.name}>
                <NotionTableCell className="font-medium text-gray-900">
                  {template.name}
                </NotionTableCell>
                <NotionTableCell>
                  <Tag variant={template.category === "Finance" ? "blue" : template.category === "Operations" ? "green" : "purple"}>
                    {template.category}
                  </Tag>
                </NotionTableCell>
                <NotionTableCell className="text-text-medium">{template.owner}</NotionTableCell>
                <NotionTableCell>
                  <StatusBadge variant={template.status}>{template.status === "inProgress" ? "In progress" : template.status === "notStarted" ? "Not started" : "Blocked"}</StatusBadge>
                </NotionTableCell>
                <NotionTableCell align="center">
                  <Checkbox checked={template.status === "done"} disabled aria-label={`Ready state for ${template.name}`} />
                </NotionTableCell>
                <NotionTableCell numeric>{template.items}</NotionTableCell>
                <NotionTableCell>
                  <div className="space-y-2">
                    <div className="h-1.5 w-full rounded-full bg-notion-bacHov">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.round(template.mapped * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-light">{Math.round(template.mapped * 100)}% mapped</span>
                  </div>
                </NotionTableCell>
                <NotionTableCell muted nowrap>
                  {new Date(template.lastUpdated).toLocaleDateString()}
                </NotionTableCell>
              </NotionTableRow>
            ))}
          </tbody>
        </NotionTable>
      </Card>

      <Card variant="feature" padding="lg">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-light">Migration readiness</p>
            <h2 className="text-lg font-semibold text-gray-900">What’s left before we flip the switch</h2>
            <p className="text-sm text-text-medium">
              We’re tracking these final milestones before enabling checklist creation for everyone.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {readinessChecklist.map((item) => (
              <div key={item.label} className="flex items-start gap-3 rounded-400 border border-border-regular bg-notion-bacSec p-4">
                <Checkbox checked={item.done} disabled aria-label={item.label} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.label}</p>
                  <p className="text-xs text-text-light mt-1">
                    {item.done ? "Completed" : "In progress"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}