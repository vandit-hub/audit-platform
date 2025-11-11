"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent } from "@/components/ui/v2/card";
import { Input } from "@/components/ui/v2/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/v2/select";
import { Button } from "@/components/ui/v2/button";
import { Label } from "@/components/ui/v2/label";
import { Badge } from "@/components/ui/v2/badge";
import { PageContainer } from "@/components/v2/PageContainer";
import { isAuditorOrAuditHead } from "@/lib/rbac";

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
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [risk, setRisk] = useState("");
  const [proc, setProc] = useState("");
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // create form
  const [auditId, setAuditId] = useState("");
  const [observationText, setObservationText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const resetFilters = useCallback(() => {
    setPlantId("");
    setFilterAuditId("");
    setStartDate("");
    setEndDate("");
    setRisk("");
    setProc("");
    setStatus("");
    setPublished("");
    setQ("");
    setSortBy("createdAt");
    setSortOrder("desc");
    showSuccess("Filters reset successfully!");
  }, [showSuccess]);

  const loadRows = async () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (filterAuditId) qs.set("auditId", filterAuditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (proc) qs.set("process", proc);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    if (q) qs.set("q", q);
    if (sortBy) qs.set("sortBy", sortBy);
    if (sortOrder) qs.set("sortOrder", sortOrder);
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
  }, [plantId, filterAuditId, startDate, endDate, risk, proc, status, published, q, sortBy, sortOrder]); // Run when filters change

  async function create(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/observations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ auditId, observationText })
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Failed");
      const selectedAudit = audits.find(a => a.id === auditId);
      setAuditId("");
      setObservationText("");
      await loadRows();
      showSuccess(`Observation created successfully for ${selectedAudit?.plant.name || "selected audit"}!`);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create observation";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (filterAuditId) qs.set("auditId", filterAuditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (proc) qs.set("process", proc);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    if (q) qs.set("q", q);
    if (sortBy) qs.set("sortBy", sortBy);
    if (sortOrder) qs.set("sortOrder", sortOrder);
    window.location.href = `/api/v1/observations/export?${qs.toString()}`;
    showSuccess("CSV export started! Download will begin shortly.");
  }

  const canCreate = isAuditorOrAuditHead(role);

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
      <header className="space-y-2">
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
      </header>

      <Card className="p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Filter Observations</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Basic Filters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Label>Audit Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Audit End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Advanced Filters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Risk Category</Label>
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
                <Label>Process</Label>
                <Select value={proc} onValueChange={setProc}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Processes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="O2C">O2C</SelectItem>
                    <SelectItem value="P2P">P2P</SelectItem>
                    <SelectItem value="R2R">R2R</SelectItem>
                    <SelectItem value="INVENTORY">Inventory</SelectItem>
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
                <Label>Published</Label>
                <Select value={published} onValueChange={setPublished}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Published</SelectItem>
                    <SelectItem value="0">Unpublished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Sort & Search</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created Date</SelectItem>
                    <SelectItem value="updatedAt">Updated Date</SelectItem>
                    <SelectItem value="riskCategory">Risk Category</SelectItem>
                    <SelectItem value="currentStatus">Current Status</SelectItem>
                    <SelectItem value="approvalStatus">Approval Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Order</Label>
                <Select value={sortOrder} onValueChange={setSortOrder}>
                  <SelectTrigger>
                    <SelectValue placeholder="Order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Newest First</SelectItem>
                    <SelectItem value="asc">Oldest First</SelectItem>
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
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-100">
          <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
          <Button variant="ghost" onClick={exportCsv}>Export CSV</Button>
        </div>
      </Card>

      {canCreate && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Create Observation (Admin/Auditor)</h2>
          {error && (
            <div className="mb-6 text-sm text-error-700 bg-error-50 border border-error-200 p-3 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={create} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2 md:col-span-1">
                <Label>Audit</Label>
                <Select value={auditId} onValueChange={setAuditId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select audit" />
                  </SelectTrigger>
                  <SelectContent>
                    {audits.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title || `${a.plant.code} — ${a.plant.name} (${a.startDate ? new Date(a.startDate).toLocaleDateString() : "?"})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Observation</Label>
                <Input
                  value={observationText}
                  onChange={(e) => setObservationText(e.target.value)}
                  required
                  placeholder="Enter observation details..."
                />
              </div>
            </div>

            <Button type="submit" variant="default" disabled={busy}>
              {busy ? "Creating…" : "Create Observation"}
            </Button>
          </form>
        </Card>
      )}

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