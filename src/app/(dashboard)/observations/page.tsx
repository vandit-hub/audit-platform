"use client";

import { useEffect, useState, FormEvent, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";

type Plant = { id: string; code: string; name: string };
type Audit = { id: string; startDate: string | null; endDate: string | null; plant: Plant };
type ObservationRow = {
  id: string;
  plant: Plant;
  audit: { id: string; startDate: string | null; endDate: string | null };
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

  const savePreset = useCallback(() => {
    localStorage.setItem("obs.filters", JSON.stringify({ plantId, auditId: filterAuditId, startDate, endDate, risk, proc, status, published, q, sortBy, sortOrder }));
    showSuccess("Filter preset saved successfully!");
  }, [plantId, filterAuditId, startDate, endDate, risk, proc, status, published, q, sortBy, sortOrder, showSuccess]);

  const loadPreset = () => {
    const raw = localStorage.getItem("obs.filters");
    if (!raw) {
      // Don't show error on initial load when no preset exists
      return;
    }
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setFilterAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProc(v.proc || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      setQ(v.q || "");
      setSortBy(v.sortBy || "createdAt");
      setSortOrder(v.sortOrder || "desc");
      showSuccess("Filter preset loaded successfully!");
    } catch {
      showError("Failed to load filter preset!");
    }
  };

  const loadPresetManual = () => {
    const raw = localStorage.getItem("obs.filters");
    if (!raw) {
      showError("No saved filter preset found!");
      return;
    }
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setFilterAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProc(v.proc || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      setQ(v.q || "");
      setSortBy(v.sortBy || "createdAt");
      setSortOrder(v.sortOrder || "desc");
      showSuccess("Filter preset loaded successfully!");
    } catch {
      showError("Failed to load filter preset!");
    }
  };

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
    localStorage.removeItem("obs.filters");
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
        startDate: x.startDate,
        endDate: x.endDate,
        plant: x.plant
      }));
      setAudits(auds);
    }
  };

  useEffect(() => {
    loadPreset();
  }, []); // Run only once on mount

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Observations</h1>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <div className="space-y-3">
          {/* First row: Plant, Audit, Start Date, End Date */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs mb-1">Plant</label>
              <select className="border rounded px-2 py-2 w-full" value={plantId} onChange={(e) => setPlantId(e.target.value)}>
                <option value="">All</option>
                {plants.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Audit</label>
              <select className="border rounded px-2 py-2 w-full" value={filterAuditId} onChange={(e) => setFilterAuditId(e.target.value)}>
                <option value="">All</option>
                {audits.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.plant.code} — {a.startDate ? new Date(a.startDate).toLocaleDateString() : "No date"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Audit Start Date</label>
              <input type="date" className="border rounded px-2 py-2 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs mb-1">Audit End Date</label>
              <input type="date" className="border rounded px-2 py-2 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Second row: Risk, Process, Status, Published */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs mb-1">Risk</label>
              <select className="border rounded px-2 py-2 w-full" value={risk} onChange={(e) => setRisk(e.target.value)}>
                <option value="">All</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Process</label>
              <select className="border rounded px-2 py-2 w-full" value={proc} onChange={(e) => setProc(e.target.value)}>
                <option value="">All</option>
                <option value="O2C">O2C</option>
                <option value="P2P">P2P</option>
                <option value="R2R">R2R</option>
                <option value="INVENTORY">Inventory</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Status</label>
              <select className="border rounded px-2 py-2 w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="PENDING_MR">Pending MR</option>
                <option value="MR_UNDER_REVIEW">MR Under Review</option>
                <option value="REFERRED_BACK">Referred Back</option>
                <option value="OBSERVATION_FINALISED">Observation Finalised</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Published</label>
              <select className="border rounded px-2 py-2 w-full" value={published} onChange={(e) => setPublished(e.target.value)}>
                <option value="">Any</option>
                <option value="1">Published</option>
                <option value="0">Unpublished</option>
              </select>
            </div>
          </div>

          {/* Third row: Sort By, Sort Order, Search */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs mb-1">Sort By</label>
              <select className="border rounded px-2 py-2 w-full" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="createdAt">Created Date</option>
                <option value="updatedAt">Updated Date</option>
                <option value="riskCategory">Risk Category</option>
                <option value="currentStatus">Current Status</option>
                <option value="approvalStatus">Approval Status</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Order</label>
              <select className="border rounded px-2 py-2 w-full" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
            <div>
              <label className="block text-xs mb-1">Search</label>
              <input className="border rounded px-2 py-2 w-full" placeholder="Search text…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button className="border px-3 py-1 rounded" onClick={savePreset}>Save preset</button>
          <button className="border px-3 py-1 rounded" onClick={loadPresetManual}>Load preset</button>
          <button className="border px-3 py-1 rounded" onClick={resetFilters}>Reset</button>
          <button className="border px-3 py-1 rounded" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>

      {canCreate && (
        <form onSubmit={create} className="bg-white rounded p-4 shadow space-y-3">
        <div className="text-sm text-gray-600">Create Observation (Admin/Auditor)</div>
        {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
        <div className="grid md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm mb-1">Audit</label>
            <select className="border rounded px-3 py-2 w-full" value={auditId} onChange={(e) => setAuditId(e.target.value)} required>
              <option value="">Select audit</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.plant.code} — {a.plant.name} ({a.startDate ? new Date(a.startDate).toLocaleDateString() : "?"})
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Observation</label>
            <input className="border rounded px-3 py-2 w-full" value={observationText} onChange={(e) => setObservationText(e.target.value)} required />
          </div>
          <div className="md:col-span-3">
            <button className="bg-black text-white px-4 py-2 rounded" disabled={busy}>{busy ? "Creating…" : "Create"}</button>
          </div>
        </div>
        </form>
      )}

      <div className="bg-white rounded p-4 shadow">
        <h2 className="font-medium mb-2">Results</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Plant</th>
              <th className="py-2">Audit</th>
              <th className="py-2">Observation</th>
              <th className="py-2">Risk</th>
              <th className="py-2">Process</th>
              <th className="py-2">Status</th>
              <th className="py-2">Approval</th>
              <th className="py-2">Published</th>
              <th className="py-2">Files</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.plant.code}</td>
                <td className="py-2">{r.audit.startDate ? r.audit.startDate.split('T')[0] : "—"}</td>
                <td className="py-2 max-w-xs">
                  <div className="truncate" title={r.title}>
                    {r.title.length > 60 ? `${r.title.slice(0, 60)}...` : r.title}
                  </div>
                </td>
                <td className="py-2">{r.riskCategory ?? "—"}</td>
                <td className="py-2">{r.concernedProcess ?? "—"}</td>
                <td className="py-2">{r.currentStatus}</td>
                <td className="py-2">{r.approvalStatus}</td>
                <td className="py-2">{r.isPublished ? "Yes" : "No"}</td>
                <td className="py-2">{r.annexures + r.mgmtDocs}</td>
                <td className="py-2">
                  <Link href={`/observations/${r.id}`} className="text-blue-600 underline">Open</Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="py-4 text-gray-500" colSpan={10}>No observations.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}