"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type Plant = { id: string; code: string; name: string };
type Audit = { id: string; title?: string | null; startDate: string | null; endDate: string | null; plant: Plant };
type ObservationRow = {
  id: string;
  plant: Plant;
  audit: { id: string; title?: string | null; startDate: string | null; endDate: string | null };
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
    const j = await res.json();
    if (res.ok) setRows(j.observations);
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

  const canCreate = role === "ADMIN" || role === "AUDITOR";

  const statusVariant = (status: string) => {
    if (status.includes("DRAFT")) return "neutral";
    if (status.includes("SUBMITTED") || status.includes("UNDER_REVIEW")) return "warning";
    if (status.includes("APPROVED") || status.includes("RESOLVED") || status.includes("FINALISED")) return "success";
    if (status.includes("REJECTED") || status.includes("REFERRED")) return "error";
    return "primary";
  };

  const riskVariant = (risk: string | null | undefined) => {
    if (risk === "A") return "error";
    if (risk === "B") return "warning";
    if (risk === "C") return "neutral";
    return "neutral";
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Observations</h1>
        <p className="text-base text-neutral-600 mt-2">Track and manage audit findings</p>
      </div>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Filter Observations</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Basic Filters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select label="Plant" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
                <option value="">All Plants</option>
                {plants.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </Select>

              <Select label="Audit" value={filterAuditId} onChange={(e) => setFilterAuditId(e.target.value)}>
                <option value="">All Audits</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title || `${a.plant.code} — ${a.startDate ? new Date(a.startDate).toLocaleDateString() : "No date"}`}
                  </option>
                ))}
              </Select>

              <Input
                type="date"
                label="Audit Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <Input
                type="date"
                label="Audit End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Advanced Filters</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select label="Risk Category" value={risk} onChange={(e) => setRisk(e.target.value)}>
                <option value="">All Risks</option>
                <option value="A">Risk A (High)</option>
                <option value="B">Risk B (Medium)</option>
                <option value="C">Risk C (Low)</option>
              </Select>

              <Select label="Process" value={proc} onChange={(e) => setProc(e.target.value)}>
                <option value="">All Processes</option>
                <option value="O2C">O2C</option>
                <option value="P2P">P2P</option>
                <option value="R2R">R2R</option>
                <option value="INVENTORY">Inventory</option>
              </Select>

              <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option value="PENDING_MR">Pending MR</option>
                <option value="MR_UNDER_REVIEW">MR Under Review</option>
                <option value="REFERRED_BACK">Referred Back</option>
                <option value="OBSERVATION_FINALISED">Observation Finalised</option>
                <option value="RESOLVED">Resolved</option>
              </Select>

              <Select label="Published" value={published} onChange={(e) => setPublished(e.target.value)}>
                <option value="">Any</option>
                <option value="1">Published</option>
                <option value="0">Unpublished</option>
              </Select>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Sort & Search</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Select label="Sort By" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
                <option value="riskCategory">Risk Category</option>
                <option value="currentStatus">Current Status</option>
                <option value="approvalStatus">Approval Status</option>
              </Select>

              <Select label="Order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </Select>

              <Input
                label="Search"
                placeholder="Search observations..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t border-neutral-100">
          <Button variant="secondary" onClick={resetFilters}>Reset Filters</Button>
          <Button variant="ghost" onClick={exportCsv}>Export CSV</Button>
        </div>
      </Card>

      {canCreate && (
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Create Observation (Admin/Auditor)</h2>
          {error && (
            <div className="mb-6 text-sm text-error-700 bg-error-50 border border-error-200 p-3 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={create} className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Select
                label="Audit"
                value={auditId}
                onChange={(e) => setAuditId(e.target.value)}
                required
                className="md:col-span-1"
              >
                <option value="">Select audit</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title || `${a.plant.code} — ${a.plant.name} (${a.startDate ? new Date(a.startDate).toLocaleDateString() : "?"})`}
                  </option>
                ))}
              </Select>

              <Input
                label="Observation"
                value={observationText}
                onChange={(e) => setObservationText(e.target.value)}
                required
                className="md:col-span-2"
                placeholder="Enter observation details..."
              />
            </div>

            <Button type="submit" variant="primary" isLoading={busy}>
              {busy ? "Creating…" : "Create Observation"}
            </Button>
          </form>
        </Card>
      )}

      <Card padding="lg">
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
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Observation</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Risk</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Process</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Approval</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Published</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Files</th>
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
                  <td className="py-4 px-6 max-w-xs">
                    <div className="truncate text-neutral-800" title={r.title}>
                      {r.title.length > 60 ? `${r.title.slice(0, 60)}...` : r.title}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {r.riskCategory ? (
                      <Badge variant={riskVariant(r.riskCategory)}>{r.riskCategory}</Badge>
                    ) : (
                      <span className="text-neutral-400">—</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-neutral-600 text-xs">
                    {r.concernedProcess ?? "—"}
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={statusVariant(r.currentStatus)}>
                      {r.currentStatus.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={statusVariant(r.approvalStatus)}>
                      {r.approvalStatus}
                    </Badge>
                  </td>
                  <td className="py-4 px-6">
                    {r.isPublished ? (
                      <Badge variant="success">Yes</Badge>
                    ) : (
                      <Badge variant="neutral">No</Badge>
                    )}
                  </td>
                  <td className="py-4 px-6 text-neutral-600">
                    <span className="font-medium">{r.annexures + r.mgmtDocs}</span>
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
                  <td className="py-8 text-neutral-500 text-center" colSpan={10}>
                    No observations found. Try adjusting your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}