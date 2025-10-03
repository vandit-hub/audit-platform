"use client";

import { useEffect, useState, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";

type KPI = {
  total: number;
  statusCounts: { PENDING: number; IN_PROGRESS: number; RESOLVED: number };
  approvalCounts: { DRAFT: number; SUBMITTED: number; APPROVED: number; REJECTED: number };
  byRisk: { A: number; B: number; C: number };
  published: { published: number; unpublished: number };
  due: { overdue: number; dueSoon: number; windowDays: number };
};

type TargetRow = {
  id: string;
  observationId: string;
  plan: string;
  owner?: string | null;
  targetDate: string;
  status?: string | null;
  retest?: "RETEST_DUE" | "PASS" | "FAIL" | null;
  plant: { code: string; name: string };
  observationStatus: string;
};

type Plant = { id: string; code: string; name: string };
type Audit = {
  id: string;
  title?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  plant: Plant;
};

export default function ReportsPage() {
  const { showSuccess } = useToast();
  const [days, setDays] = useState(14);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [overdue, setOverdue] = useState<TargetRow[]>([]);
  const [dueSoon, setDueSoon] = useState<TargetRow[]>([]);

  // Filter data
  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);

  // Filter state
  const [plantId, setPlantId] = useState("");
  const [auditId, setAuditId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [risk, setRisk] = useState("");
  const [process, setProcess] = useState("");
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState("");

  const savePreset = useCallback(() => {
    localStorage.setItem("reports.filters", JSON.stringify({ plantId, auditId, startDate, endDate, risk, process, status, published, days }));
  }, [plantId, auditId, startDate, endDate, risk, process, status, published, days]);

  const loadPreset = useCallback(() => {
    const raw = localStorage.getItem("reports.filters");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProcess(v.process || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      if (v.days) setDays(v.days);
    } catch {
      // Ignore
    }
  }, []);

  const loadPresetManual = () => {
    const raw = localStorage.getItem("reports.filters");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProcess(v.process || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      if (v.days) setDays(v.days);
    } catch {
      // Ignore
    }
  };

  const resetFilters = useCallback(() => {
    setPlantId("");
    setAuditId("");
    setStartDate("");
    setEndDate("");
    setRisk("");
    setProcess("");
    setStatus("");
    setPublished("");
    setDays(14);
    localStorage.removeItem("reports.filters");
  }, []);

  const exportPeriodReport = () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    window.location.href = `/api/v1/reports/period/export?${qs.toString()}`;
    showSuccess("Period report export started! Download will begin shortly.");
  };

  const exportRetestReport = () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    window.location.href = `/api/v1/reports/retest/export?${qs.toString()}`;
    showSuccess("Retest report export started! Download will begin shortly.");
  };

  const load = useCallback(async () => {
    // Build query string from filters
    const qs = new URLSearchParams();
    qs.set("days", days.toString());
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);

    const [oRes, tRes] = await Promise.all([
      fetch(`/api/v1/reports/overview?${qs.toString()}`, { cache: "no-store" }),
      fetch(`/api/v1/reports/targets?${qs.toString()}`, { cache: "no-store" })
    ]);
    if (oRes.ok) setKpi(await oRes.json());
    const tj = await tRes.json();
    if (tRes.ok) {
      setOverdue(tj.overdue || []);
      setDueSoon(tj.dueSoon || []);
    }
  }, [days, plantId, auditId, startDate, endDate, risk, process, status, published]);

  const loadMeta = async () => {
    const [pRes, aRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/audits", { cache: "no-store" })
    ]);
    const pJ = await pRes.json();
    const aJ = await aRes.json();
    if (pRes.ok) setPlants(pJ.plants || []);
    if (aRes.ok) setAudits(aJ.audits || []);
  };

  useEffect(() => {
    loadPreset();
    loadMeta();
  }, [loadPreset]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

      <div className="bg-white rounded p-4 shadow space-y-3">
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
            <select className="border rounded px-2 py-2 w-full" value={auditId} onChange={(e) => setAuditId(e.target.value)}>
              <option value="">All</option>
              {audits.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title || "Untitled"} — {a.plant.code} ({a.visitStartDate ? new Date(a.visitStartDate).toLocaleDateString() : "?"})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1">Start Date</label>
            <input type="date" className="border rounded px-2 py-2 w-full" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs mb-1">End Date</label>
            <input type="date" className="border rounded px-2 py-2 w-full" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
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
            <select className="border rounded px-2 py-2 w-full" value={process} onChange={(e) => setProcess(e.target.value)}>
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
        <div className="flex gap-2">
          <button className="border px-3 py-1 rounded" onClick={savePreset}>Save preset</button>
          <button className="border px-3 py-1 rounded" onClick={loadPresetManual}>Load preset</button>
          <button className="border px-3 py-1 rounded" onClick={resetFilters}>Reset</button>
          <button className="border px-3 py-1 rounded bg-blue-50 hover:bg-blue-100" onClick={exportPeriodReport}>Download Period Report</button>
          <button className="border px-3 py-1 rounded bg-green-50 hover:bg-green-100" onClick={exportRetestReport}>Download Retest Report</button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-600">Due window (days)</label>
        <input className="border rounded px-2 py-1 w-20" type="number" min={1} max={60} value={days} onChange={(e) => setDays(parseInt(e.target.value || "14", 10))} />
      </div>

      {kpi && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">Total Observations</div>
              <div className="text-2xl font-bold">{kpi.total}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">Pending</div>
              <div className="text-2xl font-bold">{kpi.statusCounts.PENDING}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">In Progress</div>
              <div className="text-2xl font-bold">{kpi.statusCounts.IN_PROGRESS}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">Resolved</div>
              <div className="text-2xl font-bold">{kpi.statusCounts.RESOLVED}</div>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">Approvals</div>
              <div className="text-sm">
                DRAFT: {kpi.approvalCounts.DRAFT} · SUBMITTED: {kpi.approvalCounts.SUBMITTED} · APPROVED: {kpi.approvalCounts.APPROVED} · REJECTED: {kpi.approvalCounts.REJECTED}
              </div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">Published</div>
              <div className="text-sm">
                Published: {kpi.published.published} · Unpublished: {kpi.published.unpublished}
              </div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-gray-500 text-sm">By Risk</div>
              <div className="text-sm">
                A: {kpi.byRisk.A} · B: {kpi.byRisk.B} · C: {kpi.byRisk.C}
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Overdue Action Plans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Plant</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Target</th>
                  <th className="py-2">Owner</th>
                  <th className="py-2">Retest</th>
                </tr>
              </thead>
              <tbody>
                {overdue.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.plant.code}</td>
                    <td className="py-2 max-w-xs truncate" title={r.plan}>{r.plan}</td>
                    <td className="py-2">{new Date(r.targetDate).toLocaleDateString()}</td>
                    <td className="py-2">{r.owner ?? "—"}</td>
                    <td className="py-2">
                      {r.retest === "RETEST_DUE" && <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Due</span>}
                      {r.retest === "PASS" && <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Pass</span>}
                      {r.retest === "FAIL" && <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Fail</span>}
                      {!r.retest && <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
                {overdue.length === 0 && <tr><td className="py-3 text-gray-500" colSpan={5}>None.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Action plan due in (next {days} days)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-2">Plant</th>
                  <th className="py-2">Plan</th>
                  <th className="py-2">Target</th>
                  <th className="py-2">Owner</th>
                  <th className="py-2">Retest</th>
                </tr>
              </thead>
              <tbody>
                {dueSoon.map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-2">{r.plant.code}</td>
                    <td className="py-2 max-w-xs truncate" title={r.plan}>{r.plan}</td>
                    <td className="py-2">{new Date(r.targetDate).toLocaleDateString()}</td>
                    <td className="py-2">{r.owner ?? "—"}</td>
                    <td className="py-2">
                      {r.retest === "RETEST_DUE" && <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">Due</span>}
                      {r.retest === "PASS" && <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">Pass</span>}
                      {r.retest === "FAIL" && <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-800">Fail</span>}
                      {!r.retest && <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
                {dueSoon.length === 0 && <tr><td className="py-3 text-gray-500" colSpan={5}>None.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}