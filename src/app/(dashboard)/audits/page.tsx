"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import {
  NotionTable,
  NotionTableCell,
  NotionTableHeader,
  NotionTableRow
} from "@/components/ui/NotionTable";
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
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Audits</h1>
          <p className="text-sm text-text-light">Plan field visits, assign teams, and monitor audit progress.</p>
        </div>
        {canManageAudits && (
          <Button variant="primary" onClick={() => document.getElementById("create-audit")?.scrollIntoView({ behavior: "smooth" })}>
            New audit
          </Button>
        )}
      </div>

      {canManageAudits && (
        <Card variant="feature" id="create-audit" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Create audit</h2>
              <p className="text-sm text-text-light">Assign a plant, set timelines, and capture the audit objective.</p>
            </div>
            {error && (
              <div className="rounded-300 border border-pink-500/30 bg-pink-100 px-3 py-2 text-sm text-pink-500">
                {error}
              </div>
            )}
          </div>
          <form onSubmit={onCreate} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <Select
                label="Plant"
                value={plantId}
                onChange={(e) => setPlantId(e.target.value)}
                required
              >
                <option value="">Select plant</option>
                {plants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </Select>

              <div className="sm:col-span-2">
                <Input
                  label="Audit Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q1 2024 Internal Audit"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Audit Purpose
                </label>
                <textarea
                  className="w-full rounded-400 border border-notion-borPri bg-white px-3.5 py-2.5 text-sm text-notion-texPri transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-600/40"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the purpose and scope of this audit..."
                  rows={3}
                />
              </div>

              <Input
                type="date"
                label="Visit Start Date"
                value={visitStartDate}
                onChange={(e) => setVisitStartDate(e.target.value)}
              />

              <Input
                type="date"
                label="Visit End Date"
                value={visitEndDate}
                onChange={(e) => setVisitEndDate(e.target.value)}
              />

              <Input
                type="date"
                label="Management Response Date"
                value={managementResponseDate}
                onChange={(e) => setManagementResponseDate(e.target.value)}
              />

              <Input
                type="date"
                label="Final Presentation Date"
                value={finalPresentationDate}
                onChange={(e) => setFinalPresentationDate(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Visit Details"
                  value={visitDetails}
                  onChange={(e) => setVisitDetails(e.target.value)}
                  placeholder="Additional visit information..."
                />
              </div>
            </div>

            <Button type="submit" variant="primary" isLoading={busy}>
              {busy ? "Creating…" : "Create Audit"}
            </Button>
          </form>
        </Card>
      )}

      {!canManageAudits && (
        <div className="rounded-500 border border-blue-500/20 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          You can view audits assigned to you below. Only the CFO and CXO team can create new audits.
        </div>
      )}

      <Card variant="feature">
        <NotionTableHeader
          title={canManageAudits ? "All Audits" : "My Assigned Audits"}
          description="Track audit schedules, lock status, and progress at a glance."
        />
        <NotionTable>
          <thead>
            <NotionTableRow hoverable={false}>
              <NotionTableCell as="th" scope="col">
                Audit Title
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Plant
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Period
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Lock Status
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Progress
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Auditors
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" align="right" className="sr-only">
                Actions
              </NotionTableCell>
            </NotionTableRow>
          </thead>
          <tbody>
            {audits.map((audit) => (
              <NotionTableRow key={audit.id}>
                <NotionTableCell className="font-medium text-gray-900">
                  {audit.title || "—"}
                </NotionTableCell>
                <NotionTableCell>
                  {audit.plant.code} — {audit.plant.name}
                </NotionTableCell>
                <NotionTableCell muted nowrap>
                  {audit.visitStartDate ? new Date(audit.visitStartDate).toLocaleDateString() : "—"} → {" "}
                  {audit.visitEndDate ? new Date(audit.visitEndDate).toLocaleDateString() : "—"}
                </NotionTableCell>
                <NotionTableCell>
                  {audit.completedAt ? (
                    <Badge variant="success">Completed</Badge>
                  ) : audit.isLocked ? (
                    <Badge variant="warning">
                      <svg className="inline-block h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Locked
                    </Badge>
                  ) : (
                    <Badge variant="neutral">Open</Badge>
                  )}
                </NotionTableCell>
                <NotionTableCell numeric>
                  <span className="font-semibold text-gray-900">{audit.progress.done}</span>
                  <span className="text-text-light">/{audit.progress.total}</span>
                </NotionTableCell>
                <NotionTableCell muted>
                  {audit.assignments.map((u) => u.email ?? u.name).join(", ") || "—"}
                </NotionTableCell>
                <NotionTableCell align="right" nowrap>
                  <Link
                    href={`/audits/${audit.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Open →
                  </Link>
                </NotionTableCell>
              </NotionTableRow>
            ))}
          </tbody>
        </NotionTable>
      </Card>
    </div>
  );
}