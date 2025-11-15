"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { isCFO } from "@/lib/rbac";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  MultiSelect,
  MultiSelectOption,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui/v2";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/v2/badge";
import { Avatar, AvatarFallback } from "@/components/ui/v2/avatar";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
};

type AuditAssignment = {
  auditor: User;
};

export type AuditForEdit = {
  id: string;
  title?: string | null;
  purpose?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  auditHeadId?: string | null;
  auditHead?: User | null;
  assignments: AuditAssignment[];
  isLocked?: boolean;
  completedAt?: string | null;
  completedById?: string | null;
};

export interface EditAuditDialogProps {
  audit: AuditForEdit;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type FormData = {
  title: string;
  purpose: string;
  auditHeadId: string;
  visitStartDate: string;
  visitEndDate: string;
};

function formatDateForInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Format as YYYY-MM-DD for date input
  return date.toISOString().split("T")[0];
}

function getUserLabel(user?: User | null) {
  return user?.name ?? user?.email ?? "Unnamed user";
}

function getUserInitials(user?: User | null) {
  const value = user?.name ?? user?.email ?? "";
  if (!value) return "U";
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  if (initials) return initials;
  return value[0]?.toUpperCase() ?? "U";
}

export function EditAuditDialog({
  audit,
  open,
  onOpenChange,
  onSuccess,
}: EditAuditDialogProps) {
  const { data: session } = useSession();
  const { showSuccess, showError } = useToast();
  const isCFOUser = isCFO(session?.user?.role);

  const [form, setForm] = React.useState<FormData>({
    title: "",
    purpose: "",
    auditHeadId: "",
    visitStartDate: "",
    visitEndDate: "",
  });

  const [auditHeads, setAuditHeads] = React.useState<User[]>([]);
  const [auditors, setAuditors] = React.useState<User[]>([]);
  const [selectedAuditors, setSelectedAuditors] = React.useState<
    MultiSelectOption[]
  >([]);
  const [currentAssignments, setCurrentAssignments] = React.useState<User[]>(
    []
  );

  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Initialize form when dialog opens or audit changes
  React.useEffect(() => {
    if (open && audit) {
      setForm({
        title: audit.title ?? "",
        purpose: audit.purpose ?? "",
        auditHeadId: audit.auditHeadId ?? "",
        visitStartDate: formatDateForInput(audit.visitStartDate),
        visitEndDate: formatDateForInput(audit.visitEndDate),
      });

      setCurrentAssignments(audit.assignments.map((a) => a.auditor));
      setSelectedAuditors([]);
      setError(null);
    }
  }, [open, audit]);

  // Fetch users when dialog opens
  React.useEffect(() => {
    if (open) {
      void loadUsers();
    }
  }, [open]);

  async function loadUsers() {
    try {
      const [ahRes, audRes] = await Promise.all([
        fetch("/api/v1/users?role=AUDIT_HEAD", { cache: "no-store" }),
        fetch("/api/v1/users?role=AUDITOR", { cache: "no-store" }),
      ]);

      if (ahRes.ok) {
        const ahJson = (await ahRes.json().catch(() => ({}))) as {
          users?: User[];
        };
        setAuditHeads(ahJson.users ?? []);
      } else {
        setAuditHeads([]);
      }

      if (audRes.ok) {
        const audJson = (await audRes.json().catch(() => ({}))) as {
          users?: User[];
        };
        setAuditors(audJson.users ?? []);
      } else {
        setAuditors([]);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setAuditHeads([]);
      setAuditors([]);
    }
  }

  const auditorOptions = React.useMemo<MultiSelectOption[]>(() => {
    const assignedIds = new Set(currentAssignments.map((u) => u.id));
    return auditors
      .filter((u) => !assignedIds.has(u.id))
      .map((user) => ({
        id: user.id,
        label: getUserLabel(user),
      }));
  }, [auditors, currentAssignments]);

  function updateField<T extends keyof FormData>(key: T, value: FormData[T]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Validation
    if (!form.title.trim()) {
      setError("Audit title is required.");
      return;
    }
    if (!form.purpose.trim()) {
      setError("Purpose is required.");
      return;
    }
    if (!form.auditHeadId) {
      setError("Audit head is required.");
      return;
    }
    if (!form.visitStartDate || !form.visitEndDate) {
      setError("Start and end dates are required.");
      return;
    }

    // Date validation: end date should be >= start date
    const startDate = new Date(form.visitStartDate);
    const endDate = new Date(form.visitEndDate);
    if (endDate < startDate) {
      setError("End date must be on or after the start date.");
      return;
    }

    // Check if audit is locked and user is not CFO
    if (audit.isLocked && !isCFOUser) {
      setError("Cannot edit a locked audit. Only CFO can edit locked audits.");
      return;
    }

    setBusy(true);

    try {
      // 1. Update main audit fields
      const updatePayload = {
        title: form.title.trim(),
        purpose: form.purpose.trim(),
        visitStartDate: new Date(form.visitStartDate).toISOString(),
        visitEndDate: new Date(form.visitEndDate).toISOString(),
        auditHeadId: form.auditHeadId,
      };

      const updateRes = await fetch(`/api/v1/audits/${audit.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updatePayload),
      });

      if (!updateRes.ok) {
        const updateJson = (await updateRes.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(updateJson.error || "Failed to update audit.");
      }

      // 2. Add new auditors
      for (const newAuditor of selectedAuditors) {
        const assignRes = await fetch(`/api/v1/audits/${audit.id}/assign`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId: newAuditor.id }),
        });

        if (!assignRes.ok) {
          const assignJson = (await assignRes.json().catch(() => ({}))) as {
            error?: string;
          };
          // Don't throw - just warn
          console.warn(
            `Failed to add auditor ${newAuditor.label}:`,
            assignJson.error
          );
        }
      }

      showSuccess("Audit updated successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update audit.";
      setError(message);
      showError(message);
    } finally {
      setBusy(false);
    }
  }

  async function removeAuditor(userId: string) {
    if (busy) return;

    const auditorToRemove = currentAssignments.find((u) => u.id === userId);
    if (!auditorToRemove) return;

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove ${getUserLabel(auditorToRemove)} from this audit?`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/v1/audits/${audit.id}/assign?userId=${userId}`,
        { method: "DELETE" }
      );

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error || "Failed to remove auditor.");
      }

      // Update local state
      setCurrentAssignments((prev) => prev.filter((u) => u.id !== userId));
      showSuccess("Auditor removed successfully!");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to remove auditor.";
      setError(message);
      showError(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl border border-[var(--border-color-regular)] bg-white px-8 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-10">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-2xl font-semibold text-[var(--c-texPri)]">
            Edit Audit
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--c-texSec)]">
            Update audit details and team assignments.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-lg border border-[var(--c-palUiRed200)] bg-[var(--c-palUiRed100)]/60 px-4 py-3 text-sm text-[var(--c-palUiRed700)]">
            {error}
          </div>
        )}

        {audit.isLocked && !isCFOUser && (
          <div className="rounded-lg border border-[var(--cl-palOra100)] bg-[var(--cl-palOra100)]/60 px-4 py-3 text-sm text-[var(--cd-palOra500)]">
            This audit is locked. Only CFO can edit locked audits.
          </div>
        )}

        <form className="space-y-8" onSubmit={handleSubmit}>
          {/* Audit Head */}
          <div className="space-y-2">
            <Label
              htmlFor="edit-audit-head"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Audit Head *
            </Label>
            <Select
              value={form.auditHeadId || undefined}
              onValueChange={(value) => updateField("auditHeadId", value)}
              disabled={busy}
            >
              <SelectTrigger
                id="edit-audit-head"
                className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              >
                <SelectValue placeholder="Select audit head" />
              </SelectTrigger>
              <SelectContent>
                {auditHeads.map((head) => (
                  <SelectItem key={head.id} value={head.id}>
                    {getUserLabel(head)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label
              htmlFor="edit-audit-title"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Audit Title *
            </Label>
            <Input
              id="edit-audit-title"
              placeholder="e.g., Q2 Financial Systems Audit"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              required
              disabled={busy}
            />
          </div>

          {/* Purpose */}
          <div className="space-y-2">
            <Label
              htmlFor="edit-audit-purpose"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Purpose *
            </Label>
            <Textarea
              id="edit-audit-purpose"
              placeholder="Describe the objectives, scope, and key focus areas for this audit."
              value={form.purpose}
              onChange={(event) => updateField("purpose", event.target.value)}
              rows={6}
              className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              required
              disabled={busy}
            />
            <p className="text-xs text-[var(--c-texSec)]">
              Provide a comprehensive description of the audit objectives and scope.
            </p>
          </div>

          {/* Current Assigned Auditors */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium text-[var(--c-texSec)]">
                Assigned Auditors
              </Label>
              <Badge
                variant="secondary"
                className="border-transparent bg-[var(--c-bacSec)] text-[var(--c-texSec)]"
              >
                {currentAssignments.length} assigned
              </Badge>
            </div>
            <div className="space-y-2">
              {currentAssignments.map((auditor) => (
                <div
                  key={auditor.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 bg-[var(--ca-palUiBlu200)]">
                      <AvatarFallback className="text-sm font-medium text-[var(--c-palUiBlu700)]">
                        {getUserInitials(auditor)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-[var(--c-texPri)]">
                        {getUserLabel(auditor)}
                      </div>
                      <div className="text-xs text-[var(--c-texSec)]">
                        {auditor.role}
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[var(--c-palUiRed600)] hover:bg-[var(--c-palUiRed100)] hover:text-[var(--c-palUiRed600)]"
                    onClick={() => void removeAuditor(auditor.id)}
                    disabled={busy}
                  >
                    <X className="mr-1 size-4" />
                    Remove
                  </Button>
                </div>
              ))}
              {currentAssignments.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-8 text-center text-sm text-[var(--c-texSec)]">
                  No auditors assigned yet.
                </div>
              )}
            </div>
          </div>

          {/* Add New Auditors */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[var(--c-texSec)]">
              Assign Auditors
            </Label>
            <MultiSelect
              value={selectedAuditors}
              onChange={(items) => {
                setSelectedAuditors(items);
              }}
              options={auditorOptions}
              placeholder="Type a name and press Enter to add auditors..."
              appearance="filled"
              className="rounded-2xl"
              inputClassName="text-sm"
              disabled={busy}
            />
            <p className="text-xs text-[var(--c-texSec)]">
              Press Enter to add each auditor. Multiple auditors can be assigned.
            </p>
          </div>

          {/* Visit Dates */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="edit-audit-start"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Start Date *
              </Label>
              <Input
                id="edit-audit-start"
                type="date"
                value={form.visitStartDate}
                onChange={(event) =>
                  updateField("visitStartDate", event.target.value)
                }
                className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
                required
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="edit-audit-end"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                End Date *
              </Label>
              <Input
                id="edit-audit-end"
                type="date"
                value={form.visitEndDate}
                onChange={(event) =>
                  updateField("visitEndDate", event.target.value)
                }
                className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
                required
                disabled={busy}
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[var(--border-color-regular)] pt-5 sm:space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
