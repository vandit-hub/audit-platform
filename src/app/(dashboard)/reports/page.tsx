"use client";

import { useEffect, useState } from "react";

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
  plant: { code: string; name: string };
  targetDate: string;
  status: string;
  owner?: string | null;
  plan?: string | null;
};

export default function ReportsPage() {
  const [days, setDays] = useState(14);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [overdue, setOverdue] = useState<TargetRow[]>([]);
  const [dueSoon, setDueSoon] = useState<TargetRow[]>([]);

  async function load() {
    const [oRes, tRes] = await Promise.all([
      fetch(`/api/v1/reports/overview?days=${days}`, { cache: "no-store" }),
      fetch(`/api/v1/reports/targets?days=${days}`, { cache: "no-store" })
    ]);
    if (oRes.ok) setKpi(await oRes.json());
    const tj = await tRes.json();
    if (tRes.ok) {
      setOverdue(tj.overdue || []);
      setDueSoon(tj.dueSoon || []);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [days]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>

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
          <h2 className="font-medium mb-2">Overdue</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Plant</th>
                <th className="py-2">Target</th>
                <th className="py-2">Owner</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {overdue.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.plant.code} — {r.plant.name}</td>
                  <td className="py-2">{new Date(r.targetDate).toLocaleDateString()}</td>
                  <td className="py-2">{r.owner ?? "—"}</td>
                  <td className="py-2">{r.status}</td>
                </tr>
              ))}
              {overdue.length === 0 && <tr><td className="py-3 text-gray-500" colSpan={4}>None.</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Due Soon (next {days} days)</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2">Plant</th>
                <th className="py-2">Target</th>
                <th className="py-2">Owner</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {dueSoon.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="py-2">{r.plant.code} — {r.plant.name}</td>
                  <td className="py-2">{new Date(r.targetDate).toLocaleDateString()}</td>
                  <td className="py-2">{r.owner ?? "—"}</td>
                  <td className="py-2">{r.status}</td>
                </tr>
              ))}
              {dueSoon.length === 0 && <tr><td className="py-3 text-gray-500" colSpan={4}>None.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}