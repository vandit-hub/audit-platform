"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";

type Plant = { id: string; code: string; name: string };
type User = { id: string; name: string | null; email: string | null; role: string };
type Audit = {
  id: string;
  plant: Plant;
  title?: string | null;
  purpose?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  visitDetails?: string | null;
  managementResponseDate?: string | null;
  finalPresentationDate?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  assignments: { auditor: User }[];
};
type Progress = { done: number; total: number };

export default function AuditDetailPage({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = React.use(params);

  const [audit, setAudit] = useState<Audit | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 });
  const [auditors, setAuditors] = useState<User[]>([]);
  const [selectedAuditor, setSelectedAuditor] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/audits/${auditId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setAudit(json.audit);
      setProgress(json.progress);
      // load auditors list (admin-only endpoint; may 403)
      const audRes = await fetch(`/api/v1/users?role=AUDITOR`, { cache: "no-store" });
      if (audRes.ok) {
        const audJson = await audRes.json();
        setAuditors(audJson.users);
      }
    }
  }, [auditId]);

  useEffect(() => { load(); }, [load]);

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
      const errorMessage = j.error || "Failed to add auditor (Admin only).";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      const selectedUser = auditors.find(u => u.id === selectedAuditor);
      setSelectedAuditor("");
      await load();
      showSuccess(`Auditor ${selectedUser?.email || selectedUser?.name || 'user'} added successfully!`);
    }
  }

  async function removeAuditor(userId: string) {
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/assign?userId=${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = j.error || "Failed to remove auditor (Admin only).";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Auditor removed successfully!");
    }
  }

  if (!audit) return <div>Loading…</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Audit — {audit.plant.code} {audit.plant.name}</h1>

      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Details</h2>
          <div className="text-sm space-y-1">
            <div><span className="font-medium">Title:</span> {audit.title || "—"}</div>
            <div><span className="font-medium">Purpose:</span> {audit.purpose || "—"}</div>
            <div><span className="font-medium">Status:</span> <span className="font-mono">{audit.status}</span></div>
            <div><span className="font-medium">Visit Dates:</span> {audit.visitStartDate ? new Date(audit.visitStartDate).toLocaleDateString() : "—"} → {audit.visitEndDate ? new Date(audit.visitEndDate).toLocaleDateString() : "—"}</div>
            <div><span className="font-medium">Visit details:</span> {audit.visitDetails || "—"}</div>
            <div><span className="font-medium">Management Response Date:</span> {audit.managementResponseDate ? new Date(audit.managementResponseDate).toLocaleDateString() : "—"}</div>
            <div><span className="font-medium">Final Presentation Date:</span> {audit.finalPresentationDate ? new Date(audit.finalPresentationDate).toLocaleDateString() : "—"}</div>
          </div>
          <div className="mt-4">
            <div className="text-sm text-gray-600">Progress (observations)</div>
            <div className="w-full bg-gray-100 h-2 rounded">
              <div
                className="bg-black h-2 rounded"
                style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%" }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{progress.done}/{progress.total} resolved</div>
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
      </div>

      {/* Checklist UI intentionally removed */}
    </div>
  );
}