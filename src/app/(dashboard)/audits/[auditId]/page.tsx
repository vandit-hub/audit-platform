"use client";

import { useEffect, useState } from "react";

type Plant = { id: string; code: string; name: string };
type User = { id: string; name: string | null; email: string | null; role: string };
type ChecklistLite = { id: string; name: string };
type AuditChecklistItem = { id: string; title: string; status: "PENDING" | "DONE" };
type AuditChecklist = { id: string; checklist: ChecklistLite; items: AuditChecklistItem[] };
type Audit = {
  id: string;
  plant: Plant;
  startDate?: string | null;
  endDate?: string | null;
  visitDetails?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  assignments: { auditor: User }[];
  auditChecklists: AuditChecklist[];
};
type Progress = { done: number; total: number };

export default function AuditDetailPage({ params }: { params: { auditId: string } }) {
  const { auditId } = params;

  const [audit, setAudit] = useState<Audit | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 });
  const [auditors, setAuditors] = useState<User[]>([]);
  const [selectedAuditor, setSelectedAuditor] = useState("");
  const [checklists, setChecklists] = useState<{ id: string; name: string }[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/v1/audits/${auditId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setAudit(json.audit);
      setProgress(json.progress);
      // load applicable checklists
      const chkRes = await fetch(`/api/v1/checklists`, { cache: "no-store" });
      const chkJson = await chkRes.json();
      if (chkRes.ok) {
        // filter to those applicable to this plant
        const plantId = json.audit.plant.id;
        const applicable = chkJson.checklists.filter((c: any) => c.applicablePlantIds.includes(plantId));
        setChecklists(applicable);
      }
      // load auditors list for assignment (admin-only endpoint; may 403)
      const audRes = await fetch(`/api/v1/users?role=AUDITOR`, { cache: "no-store" });
      if (audRes.ok) {
        const audJson = await audRes.json();
        setAuditors(audJson.users);
      }
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  async function addAuditor() {
    if (!selectedAuditor) return;
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: selectedAuditor })
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to add auditor (Admin only).");
    } else {
      setSelectedAuditor("");
      await load();
    }
  }

  async function removeAuditor(userId: string) {
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/assign?userId=${userId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to remove auditor (Admin only).");
    } else {
      await load();
    }
  }

  async function addChecklist() {
    if (!selectedChecklist) return;
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/checklists`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checklistId: selectedChecklist })
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Failed to add checklist");
    } else {
      setSelectedChecklist("");
      await load();
    }
  }

  async function removeChecklist(checklistId: string) {
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/checklists/${checklistId}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error || "Failed to remove checklist");
    } else {
      await load();
    }
  }

  async function toggleItem(itemId: string) {
    await fetch(`/api/v1/audits/${auditId}/items/${itemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ toggle: true })
    });
    await load();
  }

  if (!audit) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit — {audit.plant.code} {audit.plant.name}</h1>

      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Details</h2>
          <div className="text-sm space-y-1">
            <div>Status: <span className="font-mono">{audit.status}</span></div>
            <div>Period: {audit.startDate ? new Date(audit.startDate).toLocaleDateString() : "—"} → {audit.endDate ? new Date(audit.endDate).toLocaleDateString() : "—"}</div>
            <div>Visit details: {audit.visitDetails || "—"}</div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">Progress</div>
            <div className="w-full bg-gray-100 h-2 rounded">
              <div
                className="bg-black h-2 rounded"
                style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%" }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{progress.done}/{progress.total} items done</div>
          </div>
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Assignments</h2>
          <div className="flex gap-2 items-center mb-3">
            <select
              className="border rounded px-3 py-2 flex-1"
              value={selectedAuditor}
              onChange={(e) => setSelectedAuditor(e.target.value)}
            >
              <option value="">Select auditor (Admin only)</option>
              {auditors.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.name}
                </option>
              ))}
            </select>
            <button className="border px-3 py-2 rounded" onClick={addAuditor}>Add</button>
          </div>
          <ul className="text-sm space-y-2">
            {audit.assignments.map((a) => (
              <li key={a.auditor.id} className="flex items-center justify-between">
                <span>{a.auditor.email ?? a.auditor.name}</span>
                <button
                  className="text-red-600 underline"
                  onClick={() => removeAuditor(a.auditor.id)}
                >
                  Remove
                </button>
              </li>
            ))}
            {audit.assignments.length === 0 && <li className="text-gray-500">No auditors assigned yet.</li>}
          </ul>
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Attach Checklist</h2>
          <div className="flex gap-2 items-center">
            <select
              className="border rounded px-3 py-2 flex-1"
              value={selectedChecklist}
              onChange={(e) => setSelectedChecklist(e.target.value)}
            >
              <option value="">Select applicable checklist</option>
              {checklists.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <button className="border px-3 py-2 rounded" onClick={addChecklist}>Attach</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow">
        <h2 className="font-medium mb-3">Checklist Items</h2>
        {audit.auditChecklists.length === 0 && (
          <div className="text-sm text-gray-600">No checklists attached yet.</div>
        )}
        <div className="space-y-6">
          {audit.auditChecklists.map((ac) => (
            <div key={ac.id} className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">{ac.checklist.name}</div>
                <button
                  className="text-red-600 underline"
                  onClick={() => removeChecklist(ac.checklist.id)}
                >
                  Detach checklist
                </button>
              </div>
              <ul className="text-sm space-y-1">
                {ac.items.map((it) => (
                  <li key={it.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={it.status === "DONE"}
                      onChange={() => toggleItem(it.id)}
                    />
                    <span className={it.status === "DONE" ? "line-through text-gray-500" : ""}>
                      {it.title}
                    </span>
                  </li>
                ))}
                {ac.items.length === 0 && <li className="text-gray-500">No items (empty checklist).</li>}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}