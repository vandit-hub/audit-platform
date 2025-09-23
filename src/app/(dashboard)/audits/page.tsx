"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

type Plant = { id: string; code: string; name: string };
type AuditListItem = {
  id: string;
  plant: Plant;
  startDate?: string | null;
  endDate?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  createdAt: string;
  assignments: { id: string; name: string | null; email: string | null }[];
  progress: { done: number; total: number };
};

export default function AuditsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [plantId, setPlantId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visitDetails, setVisitDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [plantsRes, auditsRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/audits", { cache: "no-store" })
    ]);
    const plantsJson = await plantsRes.json();
    const auditsJson = await auditsRes.json();
    if (plantsRes.ok) setPlants(plantsJson.plants);
    if (auditsRes.ok) setAudits(auditsJson.audits);
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
          startDate: startDate ? new Date(startDate).toISOString() : undefined,
          endDate: endDate ? new Date(endDate).toISOString() : undefined,
          visitDetails: visitDetails || undefined
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create audit");
      setPlantId("");
      setStartDate("");
      setEndDate("");
      setVisitDetails("");
      await load();
    } catch (err: any) {
      setError(err.message || "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audits</h1>

      <form onSubmit={onCreate} className="bg-white rounded p-4 shadow space-y-3 max-w-2xl">
        <div className="text-sm text-gray-600">Create an audit (Admin or Auditor)</div>
        {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Plant</label>
            <select
              className="border rounded px-3 py-2 w-full"
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
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Start date</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">End date</label>
            <input
              type="date"
              className="border rounded px-3 py-2 w-full"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm mb-1">Visit details</label>
            <input
              className="border rounded px-3 py-2 w-full"
              value={visitDetails}
              onChange={(e) => setVisitDetails(e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="sm:col-span-2">
            <button className="bg-black text-white px-4 py-2 rounded" disabled={busy}>
              {busy ? "Creating…" : "Create audit"}
            </button>
          </div>
        </div>
      </form>

      <div className="bg-white rounded p-4 shadow">
        <h2 className="font-medium mb-2">All Audits</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Plant</th>
              <th className="py-2">Period</th>
              <th className="py-2">Status</th>
              <th className="py-2">Progress</th>
              <th className="py-2">Auditors</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {audits.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="py-2">{a.plant.code} — {a.plant.name}</td>
                <td className="py-2">
                  {a.startDate ? new Date(a.startDate).toLocaleDateString() : "—"}{" "}
                  → {a.endDate ? new Date(a.endDate).toLocaleDateString() : "—"}
                </td>
                <td className="py-2">{a.status}</td>
                <td className="py-2">
                  {a.progress.done}/{a.progress.total}
                </td>
                <td className="py-2">
                  {a.assignments.map((u) => u.email ?? u.name).join(", ") || "—"}
                </td>
                <td className="py-2">
                  <Link href={`/audits/${a.id}`} className="text-blue-600 underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}