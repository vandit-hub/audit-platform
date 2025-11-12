"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { Card } from "@/components/ui/v2/card";
import { Input } from "@/components/ui/v2/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/v2/select";
import { Button } from "@/components/ui/v2/button";
import { Label } from "@/components/ui/v2/label";
import { Badge } from "@/components/ui/v2/badge";
import { PageContainer } from "@/components/v2/PageContainer";
import { isAuditorOrAuditHead } from "@/lib/rbac";
import { CreateObservationDialog, CreateObservationFormValues } from "./_components/CreateObservationDialog";

type Plant = { id: string; code: string; name: string };
type Audit = { id: string; title?: string | null; startDate: string | null; endDate: string | null; plant: Plant; isLocked?: boolean };
type ObservationRow = {
  id: string;
  plant: Plant;
  audit: { id: string; title?: string | null; startDate: string | null; endDate: string | null; isLocked?: boolean };
  riskCategory?: "A" | "B" | "C" | null;
  concernedProcess?: "O2C" | "P2P" | "R2R" | "INVENTORY" | null;
  currentStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  approvalStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  isPublished: boolean;
  createdAt: string;
  title: string;
  annexures: number;
  mgmtDocs: number;
};

export default function ObservationsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { showSuccess, showError } = useToast();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [rows, setRows] = useState<ObservationRow[]>([]);

  const [plantId, setPlantId] = useState("");
  const [filterAuditId, setFilterAuditId] = useState("");
  const [risk, setRisk] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");

  const resetFilters = useCallback(() => {
    setPlantId("");
    setFilterAuditId("");
    setRisk("");
    setStatus("");
    setQ("");
    showSuccess("Filters reset successfully!");
  }, [showSuccess]);

  const loadRows = async () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (filterAuditId) qs.set("auditId", filterAuditId);
    if (risk) qs.set("risk", risk);
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    // Hardcoded sort by createdAt desc
    qs.set("sortBy", "createdAt");
    qs.set("sortOrder", "desc");
    const res = await fetch(`/api/v1/observations?${qs.toString()}`, { cache: "no-store" });
    const j = await res.json().catch(() => ({}));
    if (res.ok) setRows(j.observations);
    else setRows([]);
  };

  const load = async () => {
    const [pRes, aRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/audits", { cache: "no-store" })
    ]);
    const pJ = await pRes.json();
    const aJ = await aRes.json();
    if (pRes.ok) setPlants(pJ.plants);
    if (aRes.ok) {
      const auds = aJ.audits.map((x: any) => ({
        id: x.id,
        title: x.title,
        startDate: x.startDate,
        endDate: x.endDate,
        plant: x.plant
      }));
      setAudits(auds);
    }
  };

  useEffect(() => {
    load();
  }, []); // Run only once on mount

  useEffect(() => {
    loadRows();
  }, [plantId, filterAuditId, risk, status, q]); // Run when filters change

  async function handleCreateObservation(values: CreateObservationFormValues) {
    const res = await fetch("/api/v1/observations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values)
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || "Failed to create observation");
    const selectedAudit = audits.find(a => a.id === values.auditId);
    await loadRows();
    showSuccess(`Observation created successfully for ${selectedAudit?.plant.name || "selected audit"}!`);
  }

  function exportCsv() {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (filterAuditId) qs.set("auditId", filterAuditId);
    if (risk) qs.set("risk", risk);
    if (status) qs.set("status", status);
    if (q) qs.set("q", q);
    // Hardcoded sort by createdAt desc
    qs.set("sortBy", "createdAt");
    qs.set("sortOrder", "desc");
    window.location.href = `/api/v1/observations/export?${qs.toString()}`;
    showSuccess("CSV export started! Download will begin shortly.");
  }

  const canCreate = role === "CFO" || isAuditorOrAuditHead(role);

  const statusBadgeClass = (status: string) => {
    const upper = status.toUpperCase();
    if (upper.includes("DRAFT")) {
      return "bg-[var(--c-bacSec)] border-transparent text-[var(--c-texSec)]";
    }
    if (upper.includes("SUBMITTED") || upper.includes("UNDER_REVIEW")) {
      return "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]";
    }
    if (upper.includes("APPROVED") || upper.includes("RESOLVED") || upper.includes("FINALISED")) {
      return "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]";
    }
    if (upper.includes("REJECTED") || upper.includes("REFERRED")) {
      return "bg-[var(--c-palUiRed100)] border-transparent text-[var(--c-palUiRed600)]";
    }
    return "bg-[var(--ca-palUiBlu100)] border-transparent text-[var(--c-palUiBlu700)]";
  };

  const riskBadgeClass = (risk: string | null | undefined) => {
    if (risk === "A") {
      return "bg-[var(--c-palUiRed100)] border-transparent text-[var(--c-palUiRed600)]";
    }
    if (risk === "B") {
      return "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]";
    }
    if (risk === "C") {
      return "bg-[var(--c-bacSec)] border-transparent text-[var(--c-texSec)]";
    }
    return "bg-[var(--c-bacSec)] border-transparent text-[var(--c-texSec)]";
  };

  return (
    <PageContainer className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2 flex-1">
          <h1
            className="text-3xl font-semibold"
            style={{ color: "var(--c-texPri)" }}
          >
            Observations
          </h1>
          <p
            className="text-sm md:text-base"
            style={{ color: "var(--c-texSec)" }}
          >
            Track and manage audit findings across plants with advanced filters.
          </p>
        </div>
        {canCreate && (
          <CreateObservationDialog
            audits={audits}
            onCreate={handleCreateObservation}
          />
        )}
      </header>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Filter Observations</h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Plant</Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger>
                <SelectValue placeholder="All Plants" />
              </SelectTrigger>
              <SelectContent>
                {plants.map((p) => <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Audit</Label>
            <Select value={filterAuditId} onValueChange={setFilterAuditId}>
              <SelectTrigger>
                <SelectValue placeholder="All Audits" />
              </SelectTrigger>
              <SelectContent>
                {audits.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title || `${a.plant.code} — ${a.startDate ? new Date(a.startDate).toLocaleDateString() : "No date"}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Risk Level</Label>
            <Select value={risk} onValueChange={setRisk}>
              <SelectTrigger>
                <SelectValue placeholder="All Risks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Risk A (High)</SelectItem>
                <SelectItem value="B">Risk B (Medium)</SelectItem>
                <SelectItem value="C">Risk C (Low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING_MR">Pending MR</SelectItem>
                <SelectItem value="MR_UNDER_REVIEW">MR Under Review</SelectItem>
                <SelectItem value="REFERRED_BACK">Referred Back</SelectItem>
                <SelectItem value="OBSERVATION_FINALISED">Observation Finalised</SelectItem>
                <SelectItem value="RESOLVED">Resolved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search observations..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-4 border-t border-neutral-200">
          <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
          <Button variant="ghost" onClick={exportCsv}>Export CSV</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">Results</h2>
          <span className="text-sm font-medium text-neutral-600 bg-neutral-100 px-3 py-1.5 rounded-md">
            {rows.length} {rows.length === 1 ? 'observation' : 'observations'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-neutral-600 bg-neutral-100 border-b-2 border-neutral-200">
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Plant</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Audit</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Audit Status</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Observation</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Risk</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Approval</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r, index) => (
                <tr key={r.id} className={`transition-all duration-150 hover:bg-primary-50 hover:shadow-sm ${index % 2 === 0 ? "bg-white" : "bg-neutral-25"}`}>
                  <td className="py-4 px-6 font-medium text-neutral-900">{r.plant.code}</td>
                  <td className="py-4 px-6 text-neutral-700 text-xs">
                    {r.audit.title || (r.audit.startDate ? r.audit.startDate.split('T')[0] : "—")}
                  </td>
                  <td className="py-4 px-6">
                    {r.audit.isLocked ? (
                      <Badge className="bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]">
                        <svg className="inline-block h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Locked
                      </Badge>
                    ) : (
                      <Badge className="bg-[var(--c-bacSec)] border-transparent text-[var(--c-texSec)]">Open</Badge>
                    )}
                  </td>
                  <td className="py-4 px-6 max-w-xs">
                    <div className="truncate text-neutral-800" title={r.title}>
                      {r.title.length > 60 ? `${r.title.slice(0, 60)}...` : r.title}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {r.riskCategory ? (
                      <Badge className={riskBadgeClass(r.riskCategory)}>
                        {r.riskCategory}
                      </Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={statusBadgeClass(r.currentStatus)}>
                      {r.currentStatus.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <Badge className={statusBadgeClass(r.approvalStatus)}>
                      {r.approvalStatus}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      href={`/observations/${r.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="py-8 text-neutral-500 text-center" colSpan={8}>
                    No observations found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </PageContainer>
  );
}