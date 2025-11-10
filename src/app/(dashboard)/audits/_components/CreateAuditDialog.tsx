"use client";

import * as React from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Plus } from "lucide-react";

export type CreateAuditFormValues = {
  plantId: string;
  auditHeadId: string;
  title: string;
  purpose: string;
  visitStartDate: string;
  visitEndDate: string;
  auditorIds: string[];
};

type PlantOption = {
  id: string;
  code: string;
  name: string;
};

type UserOption = {
  id: string;
  name: string | null;
  email: string | null;
};

export interface CreateAuditDialogProps {
  plants: PlantOption[];
  auditHeads: UserOption[];
  auditors: UserOption[];
  onCreate: (values: CreateAuditFormValues) => Promise<void>;
}

const emptyForm: CreateAuditFormValues = {
  plantId: "",
  auditHeadId: "",
  title: "",
  purpose: "",
  visitStartDate: "",
  visitEndDate: "",
  auditorIds: [],
};

export function CreateAuditDialog({
  plants,
  auditHeads,
  auditors,
  onCreate,
}: CreateAuditDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreateAuditFormValues>(emptyForm);
  const [selectedAuditors, setSelectedAuditors] = React.useState<
    MultiSelectOption[]
  >([]);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const auditorOptions = React.useMemo<MultiSelectOption[]>(
    () =>
      auditors.map((user) => ({
        id: user.id,
        label: user.name ?? user.email ?? "Unnamed user",
      })),
    [auditors]
  );

  const auditHeadOptions = React.useMemo(
    () =>
      auditHeads.map((head) => ({
        id: head.id,
        label: head.name ?? head.email ?? "Unnamed user",
      })),
    [auditHeads]
  );

  React.useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setSelectedAuditors([]);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.plantId || !form.auditHeadId || !form.title || !form.purpose) {
      setError("All required fields must be completed before creating an audit.");
      return;
    }
    if (!form.visitStartDate || !form.visitEndDate) {
      setError("Please provide both start and end dates.");
      return;
    }
    setError(null);
    setBusy(true);

    try {
      await onCreate({
        ...form,
        auditorIds: selectedAuditors.map((auditor) => auditor.id),
      });
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create audit.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function updateField<T extends keyof CreateAuditFormValues>(
    key: T,
    value: CreateAuditFormValues[T],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-[var(--c-texPri)] text-white hover:bg-[var(--c-texPri)]/90">
          <Plus className="size-4" />
          Create Audit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border border-[var(--border-color-regular)] bg-white px-8 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-10">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-2xl font-semibold text-[var(--c-texPri)]">
            Create New Audit
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--c-texSec)]">
            Set up a new audit process with detailed information.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-lg border border-[var(--c-palUiRed200)] bg-[var(--c-palUiRed100)]/60 px-4 py-3 text-sm text-[var(--c-palUiRed700)]">
            {error}
          </div>
        )}
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="create-audit-plant"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Plant *
              </Label>
              <Select
                value={form.plantId || undefined}
                onValueChange={(value) => updateField("plantId", value)}
              >
                <SelectTrigger
                  id="create-audit-plant"
                  className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
                >
                  <SelectValue placeholder="Select plant" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((plant) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name} ({plant.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label
                htmlFor="create-audit-head"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Audit Head *
              </Label>
              <Select
                value={form.auditHeadId || undefined}
                onValueChange={(value) => updateField("auditHeadId", value)}
              >
                <SelectTrigger
                  id="create-audit-head"
                  className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
                >
                  <SelectValue placeholder="Select audit head" />
                </SelectTrigger>
                <SelectContent>
                  {auditHeadOptions.map((head) => (
                    <SelectItem key={head.id} value={head.id}>
                      {head.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="create-audit-title"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Audit Title *
            </Label>
            <Input
              id="create-audit-title"
              placeholder="e.g., Q2 Financial Systems Audit"
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="create-audit-purpose"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Purpose *
            </Label>
            <Textarea
              id="create-audit-purpose"
              placeholder="Describe the objectives, scope, and key focus areas for this audit."
              value={form.purpose}
              onChange={(event) => updateField("purpose", event.target.value)}
              rows={6}
              className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              required
            />
            <p className="text-xs text-[var(--c-texSec)]">
              Provide a comprehensive description of the audit objectives and scope.
            </p>
          </div>

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
              placeholder="Type a name and press Enter to add auditors…"
              appearance="filled"
              className="rounded-2xl"
              inputClassName="text-sm"
            />
            <p className="text-xs text-[var(--c-texSec)]">
              Press Enter to add each auditor. Multiple auditors can be assigned.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label
                htmlFor="create-audit-start"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Start Date *
              </Label>
              <Input
                id="create-audit-start"
                type="date"
                value={form.visitStartDate}
                onChange={(event) =>
                  updateField("visitStartDate", event.target.value)
                }
                className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
                required
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="create-audit-end"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                End Date *
              </Label>
              <Input
                id="create-audit-end"
                type="date"
                value={form.visitEndDate}
                onChange={(event) =>
                  updateField("visitEndDate", event.target.value)
                }
                className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
                required
              />
            </div>
          </div>

          <DialogFooter className="border-t border-[var(--border-color-regular)] pt-5 sm:space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating…" : "Create Audit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


