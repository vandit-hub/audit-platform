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
import {
  NotionTable,
  NotionTableCell,
  NotionTableHeader,
  NotionTableRow
} from "@/components/ui/NotionTable";
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
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Observations</h1>
          <p className="text-sm text-text-light">Monitor findings, approval stages, and risk levels across audits.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={resetFilters}>
            Reset filters
          </Button>
          <Button variant="ghost" onClick={exportCsv}>
            Export CSV
          </Button>
          {canCreate && (
            <Button
              variant="primary"
              onClick={() => document.getElementById("create-observation")?.scrollIntoView({ behavior: "smooth" })}
            >
              New observation
            </Button>
          )}
        </div>
      </div>

      <Card variant="feature">
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Filter observations</h2>
            <p className="text-sm text-text-light">Combine audit, timeline, and status filters to narrow results.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Audit context</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select label="Plant" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
                  <option value="">All plants</option>
                  {plants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </Select>
                <Select label="Audit" value={filterAuditId} onChange={(e) => setFilterAuditId(e.target.value)}>
                  <option value="">All audits</option>
                  {audits.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title || `${a.plant.code} — ${a.startDate ? new Date(a.startDate).toLocaleDateString() : "No date"}`}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  label="Audit start"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  label="Audit end"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Status & risk</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Select label="Risk" value={risk} onChange={(e) => setRisk(e.target.value)}>
                  <option value="">All risk levels</option>
                  <option value="A">Risk A (High)</option>
                  <option value="B">Risk B (Medium)</option>
                  <option value="C">Risk C (Low)</option>
                </Select>
                <Select label="Process" value={proc} onChange={(e) => setProc(e.target.value)}>
                  <option value="">All processes</option>
                  <option value="O2C">O2C</option>
                  <option value="P2P">P2P</option>
                  <option value="R2R">R2R</option>
                  <option value="INVENTORY">Inventory</option>
                </Select>
                <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="">Any status</option>
                  <option value="PENDING_MR">Pending MR</option>
                  <option value="MR_UNDER_REVIEW">MR under review</option>
                  <option value="REFERRED_BACK">Referred back</option>
                  <option value="OBSERVATION_FINALISED">Observation finalised</option>
                  <option value="RESOLVED">Resolved</option>
                </Select>
                <Select label="Published" value={published} onChange={(e) => setPublished(e.target.value)}>
                  <option value="">Any</option>
                  <option value="1">Published</option>
                  <option value="0">Unpublished</option>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Sort & search</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Select label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="createdAt">Created date</option>
                  <option value="updatedAt">Updated date</option>
                  <option value="riskCategory">Risk category</option>
                  <option value="currentStatus">Current status</option>
                  <option value="approvalStatus">Approval status</option>
                </Select>
                <Select label="Order" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                  <option value="desc">Newest first</option>
                  <option value="asc">Oldest first</option>
                </Select>
                <Input
                  label="Search"
                  placeholder="Search by title or keyword"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border-regular pt-4">
            <Button variant="secondary" onClick={resetFilters}>
              Clear filters
            </Button>
            <Button variant="primary" onClick={loadRows}>
              Apply filters
            </Button>
          </div>
        </div>
      </Card>

      {canCreate && (
        <Card variant="feature" id="create-observation" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Create observation</h2>
            <p className="text-sm text-text-light">Draft a new finding and link it to the appropriate audit.</p>
          </div>
          {error && (
            <div className="rounded-300 border border-pink-500/30 bg-pink-100 px-4 py-3 text-sm text-pink-500">
              {error}
            </div>
          )}
          <form onSubmit={create} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
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
                placeholder="Summarize the issue or gap..."
              />
            </div>

            <Button type="submit" variant="primary" isLoading={busy}>
              {busy ? "Creating…" : "Create observation"}
            </Button>
          </form>
        </Card>
      )}

      <Card variant="feature">
        <NotionTableHeader
          title="Results"
          description="Observations matching the current filters."
          actions={
            <span className="inline-flex items-center px-3 py-1.5 rounded-300 bg-notion-bacSec text-sm text-notion-texSec">
              {rows.length} {rows.length === 1 ? "observation" : "observations"}
            </span>
          }
        />
        <NotionTable>
          <thead>
            <NotionTableRow hoverable={false}>
              <NotionTableCell as="th" scope="col">
                Plant
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Audit
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Audit Status
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Observation
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Risk
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Status
              </NotionTableCell>
              <NotionTableCell as="th" scope="col">
                Approval
              </NotionTableCell>
              <NotionTableCell as="th" scope="col" align="right" className="sr-only">
                Actions
              </NotionTableCell>
            </NotionTableRow>
          </thead>
          <tbody>
            {rows.map((row) => (
              <NotionTableRow key={row.id}>
                <NotionTableCell className="font-medium text-gray-900">
                  {row.plant.code}
                </NotionTableCell>
                <NotionTableCell className="text-xs text-text-medium">
                  {row.audit.title || (row.audit.startDate ? row.audit.startDate.split("T")[0] : "—")}
                </NotionTableCell>
                <NotionTableCell>
                  {row.audit.isLocked ? (
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
                <NotionTableCell className="max-w-xs">
                  <div className="truncate text-notion-texPri" title={row.title}>
                    {row.title.length > 60 ? `${row.title.slice(0, 60)}...` : row.title}
                  </div>
                </NotionTableCell>
                <NotionTableCell>
                  {row.riskCategory ? (
                    <Badge variant={riskVariant(row.riskCategory)}>{row.riskCategory}</Badge>
                  ) : (
                    <span className="text-text-light">—</span>
                  )}
                </NotionTableCell>
                <NotionTableCell>
                  <Badge variant={statusVariant(row.currentStatus)}>
                    {row.currentStatus.replace("_", " ")}
                  </Badge>
                </NotionTableCell>
                <NotionTableCell>
                  <Badge variant={statusVariant(row.approvalStatus)}>
                    {row.approvalStatus}
                  </Badge>
                </NotionTableCell>
                <NotionTableCell align="right" nowrap>
                  <Link
                    href={`/observations/${row.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    Open →
                  </Link>
                </NotionTableCell>
              </NotionTableRow>
            ))}
            {rows.length === 0 && (
              <NotionTableRow hoverable={false}>
                <NotionTableCell colSpan={8} align="center" className="py-8 notion-table-cell-muted">
                  No observations found. Try adjusting your filters.
                </NotionTableCell>
              </NotionTableRow>
            )}
          </tbody>
        </NotionTable>
      </Card>
    </div>
  );
}