"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Input } from "@/components/ui/v2/input";
import { Textarea } from "@/components/ui/v2/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/v2/select";
import { Button } from "@/components/ui/v2/button";
import { Badge } from "@/components/ui/v2/badge";
import { PageContainer } from "@/components/v2/PageContainer";
import { isCFOOrCXOTeam } from "@/lib/rbac";

type Plant = { id: string; code: string; name: string };
type AuditListItem = {
  id: string;
  plant: Plant;
  title?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  createdAt: string;
  assignments: { id: string; name: string | null; email: string | null }[];
  progress: { done: number; total: number };
  isLocked?: boolean;
  completedAt?: string | null;
};

const STATUS_BADGE_CLASSES: Record<
  AuditListItem["status"],
  string
> = {
  PLANNED: "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent",
  IN_PROGRESS:
    "bg-[var(--ca-palUiBlu100)] border-transparent text-[var(--c-palUiBlu700)]",
  SUBMITTED:
    "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]",
  SIGNED_OFF:
    "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]",
};

export default function AuditsPage() {
  const { data: session } = useSession();
  const canManageAudits = isCFOOrCXOTeam(session?.user?.role);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [plantId, setPlantId] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitStartDate, setVisitStartDate] = useState("");
  const [visitEndDate, setVisitEndDate] = useState("");
  const [visitDetails, setVisitDetails] = useState("");
  const [managementResponseDate, setManagementResponseDate] = useState("");
  const [finalPresentationDate, setFinalPresentationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showSuccess, showError } = useToast();

  async function load() {
    const [plantsRes, auditsRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/audits", { cache: "no-store" })
    ]);
    
    if (plantsRes.ok) {
      const plantsJson = await plantsRes.json();
      setPlants(plantsJson.plants || []);
    }
    
    if (auditsRes.ok) {
      const auditsJson = await auditsRes.json();
      setAudits(auditsJson.audits || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!plantId) {
      setError("Please select a plant before creating an audit.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/v1/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plantId,
          title: title || undefined,
          purpose: purpose || undefined,
          visitStartDate: visitStartDate ? new Date(visitStartDate).toISOString() : undefined,
          visitEndDate: visitEndDate ? new Date(visitEndDate).toISOString() : undefined,
          visitDetails: visitDetails || undefined,
          managementResponseDate: managementResponseDate ? new Date(managementResponseDate).toISOString() : undefined,
          finalPresentationDate: finalPresentationDate ? new Date(finalPresentationDate).toISOString() : undefined
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create audit");
      const selectedPlant = plants.find(p => p.id === plantId);
      setPlantId("");
      setTitle("");
      setPurpose("");
      setVisitStartDate("");
      setVisitEndDate("");
      setVisitDetails("");
      setManagementResponseDate("");
      setFinalPresentationDate("");
      await load();
      showSuccess(`Audit created successfully for ${selectedPlant?.name || "selected plant"}!`);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create audit";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer className="space-y-8">
      <header className="space-y-2">
        <h1
          className="text-3xl font-semibold"
          style={{ color: "var(--c-texPri)" }}
        >
          Audits
        </h1>
        <p
          className="text-sm md:text-base"
          style={{ color: "var(--c-texSec)" }}
        >
          Create new schedules and monitor the status of ongoing audits.
        </p>
      </header>

      {canManageAudits && (
        <Card>
          <CardHeader>
            <CardTitle>Create Audit</CardTitle>
            <CardDescription>
              Configure a new audit assignment for a plant and define important
              milestones.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="text-sm rounded-md border border-[var(--c-palUiRed100)] bg-[var(--c-palUiRed100)]/40 px-4 py-3 text-[var(--c-palUiRed600)]">
                {error}
              </div>
            )}
            <form onSubmit={onCreate} className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Plant
                  </label>
                  <Select
                    value={plantId || undefined}
                    onValueChange={setPlantId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select plant" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.code} — {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Audit title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., FY25 Financial Controls Audit"
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Audit purpose
                  </label>
                  <Textarea
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="Describe the scope, objectives, and compliance requirements for this audit."
                    rows={4}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Visit start date
                  </label>
                  <Input
                    type="date"
                    value={visitStartDate}
                    onChange={(e) => setVisitStartDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Visit end date
                  </label>
                  <Input
                    type="date"
                    value={visitEndDate}
                    onChange={(e) => setVisitEndDate(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Management response deadline
                  </label>
                  <Input
                    type="date"
                    value={managementResponseDate}
                    onChange={(e) =>
                      setManagementResponseDate(e.target.value)
                    }
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Final presentation date
                  </label>
                  <Input
                    type="date"
                    value={finalPresentationDate}
                    onChange={(e) => setFinalPresentationDate(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2 flex flex-col gap-2">
                  <label
                    className="text-sm font-medium"
                    style={{ color: "var(--c-texSec)" }}
                  >
                    Visit details
                  </label>
                  <Input
                    value={visitDetails}
                    onChange={(e) => setVisitDetails(e.target.value)}
                    placeholder="Additional logistics or areas of focus."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={busy}>
                  {busy ? "Creating…" : "Create audit"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!canManageAudits && (
        <div className="rounded-xl border border-[var(--ca-palUiBlu200)] bg-[var(--ca-palUiBlu100)]/40 px-5 py-4 text-sm text-[var(--c-palUiBlu700)]">
          Only CFO and CXO roles can create new audits. You can still review
          audits assigned to you below.
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>
              {canManageAudits ? "All audits" : "My assigned audits"}
            </CardTitle>
            <CardDescription>
              Track status, progress, and assignments for ongoing audit
              engagements.
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">Export summary</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead
              className="bg-[var(--c-bacSec)] text-[var(--c-texTer)]"
              style={{ textTransform: "uppercase", fontSize: "11px" }}
            >
              <tr>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Audit
                </th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Plant
                </th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Window
                </th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Status
                </th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Progress
                </th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Team
                </th>
                <th className="px-5 py-3 text-left font-semibold tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => {
                const window =
                  audit.visitStartDate || audit.visitEndDate
                    ? `${audit.visitStartDate ? new Date(
                        audit.visitStartDate,
                      ).toLocaleDateString() : "—"} → ${
                        audit.visitEndDate
                          ? new Date(audit.visitEndDate).toLocaleDateString()
                          : "—"
                      }`
                    : "—";

                const statusBadge =
                  STATUS_BADGE_CLASSES[audit.status] ??
                  "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent";

                const lockLabel = audit.completedAt
                  ? "Completed"
                  : audit.isLocked
                  ? "Locked"
                  : "Open";
                const lockBadgeClass = audit.completedAt
                  ? "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]"
                  : audit.isLocked
                  ? "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]"
                  : "bg-[var(--ca-palUiBlu100)] border-transparent text-[var(--c-palUiBlu700)]";

                return (
                  <tr
                    key={audit.id}
                    className="border-b border-[var(--border-color-regular)] last:border-0"
                  >
                    <td className="px-5 py-4 font-medium text-[var(--c-texPri)]">
                      {audit.title || "—"}
                    </td>
                    <td className="px-5 py-4 text-[var(--c-texSec)]">
                      {audit.plant.code} — {audit.plant.name}
                    </td>
                    <td className="px-5 py-4 text-[var(--c-texSec)]">
                      {window}
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={statusBadge}>
                        {audit.status.replace("_", " ").toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-[var(--c-texSec)]">
                      <span className="font-semibold text-[var(--c-texPri)]">
                        {audit.progress.done}
                      </span>
                      <span>/{audit.progress.total}</span>
                    </td>
                    <td className="px-5 py-4 text-[var(--c-texSec)]">
                      {audit.assignments.length
                        ? audit.assignments
                            .map((u) => u.email ?? u.name ?? "—")
                            .join(", ")
                        : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Badge className={lockBadgeClass}>{lockLabel}</Badge>
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/audits/${audit.id}`}>Open</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </PageContainer>
  );
}