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
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui/v2";
import { Plus } from "lucide-react";

export type CreateObservationFormValues = {
  auditId: string;
  observationText: string;
};

type AuditOption = {
  id: string;
  title?: string | null;
  startDate: string | null;
  endDate: string | null;
  plant: {
    id: string;
    code: string;
    name: string;
  };
  isLocked?: boolean;
};

export interface CreateObservationDialogProps {
  audits: AuditOption[];
  onCreate: (values: CreateObservationFormValues) => Promise<void>;
}

const emptyForm: CreateObservationFormValues = {
  auditId: "",
  observationText: "",
};

export function CreateObservationDialog({
  audits,
  onCreate,
}: CreateObservationDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<CreateObservationFormValues>(emptyForm);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.auditId || !form.observationText.trim()) {
      setError("Please select an audit and enter observation details.");
      return;
    }
    setError(null);
    setBusy(true);

    try {
      await onCreate(form);
      setOpen(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create observation.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  function updateField<T extends keyof CreateObservationFormValues>(
    key: T,
    value: CreateObservationFormValues[T],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-[var(--c-texPri)] text-white hover:bg-[var(--c-texPri)]/90">
          <Plus className="size-4" />
          Create Observation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border border-[var(--border-color-regular)] bg-white px-8 py-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:px-10">
        <DialogHeader className="space-y-3 text-left">
          <DialogTitle className="text-2xl font-semibold text-[var(--c-texPri)]">
            Create New Observation
          </DialogTitle>
          <DialogDescription className="text-sm text-[var(--c-texSec)]">
            Add a new observation to an audit
          </DialogDescription>
        </DialogHeader>
        {error && (
          <div className="rounded-lg border border-[var(--c-palUiRed200)] bg-[var(--c-palUiRed100)]/60 px-4 py-3 text-sm text-[var(--c-palUiRed700)]">
            {error}
          </div>
        )}
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label
              htmlFor="create-observation-audit"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Audit *
            </Label>
            <Select
              value={form.auditId || undefined}
              onValueChange={(value) => updateField("auditId", value)}
            >
              <SelectTrigger
                id="create-observation-audit"
                className="h-12 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              >
                <SelectValue placeholder="Select audit" />
              </SelectTrigger>
              <SelectContent>
                {audits.map((audit) => (
                  <SelectItem key={audit.id} value={audit.id}>
                    {audit.title ||
                      `${audit.plant.code} — ${audit.plant.name} (${
                        audit.startDate
                          ? new Date(audit.startDate).toLocaleDateString()
                          : "?"
                      })`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="create-observation-text"
              className="text-sm font-medium text-[var(--c-texSec)]"
            >
              Observation *
            </Label>
            <Textarea
              id="create-observation-text"
              placeholder="Describe the observation..."
              value={form.observationText}
              onChange={(event) =>
                updateField("observationText", event.target.value)
              }
              rows={6}
              className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--input-background)] text-sm"
              required
            />
            <p className="text-xs text-[var(--c-texSec)]">
              Enter observation details, findings, or issues identified during the audit.
            </p>
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
              {busy ? "Creating…" : "Create Observation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
