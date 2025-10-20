"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

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

  if (!audit) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mb-4"></div>
        <p className="text-neutral-600">Loading audit details...</p>
      </div>
    </div>
  );

  const statusVariant = (status: string) => {
    switch (status) {
      case "PLANNED": return "neutral";
      case "IN_PROGRESS": return "primary";
      case "SUBMITTED": return "warning";
      case "SIGNED_OFF": return "success";
      default: return "neutral";
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">
          Audit — {audit.plant.code} {audit.plant.name}
        </h1>
        {audit.title && (
          <p className="text-base text-neutral-600 mt-2">{audit.title}</p>
        )}
      </div>

      {error && (
        <div className="text-sm text-error-700 bg-error-50 border border-error-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Details</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Title:</div>
              <div className="col-span-2 text-sm text-neutral-900">{audit.title || "—"}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Purpose:</div>
              <div className="col-span-2 text-sm text-neutral-900">{audit.purpose || "—"}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Status:</div>
              <div className="col-span-2">
                <Badge variant={statusVariant(audit.status)}>
                  {audit.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Visit Dates:</div>
              <div className="col-span-2 text-sm text-neutral-900">
                {audit.visitStartDate ? new Date(audit.visitStartDate).toLocaleDateString() : "—"}
                <span className="mx-2 text-neutral-400">→</span>
                {audit.visitEndDate ? new Date(audit.visitEndDate).toLocaleDateString() : "—"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Visit Details:</div>
              <div className="col-span-2 text-sm text-neutral-900">{audit.visitDetails || "—"}</div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Management Response:</div>
              <div className="col-span-2 text-sm text-neutral-900">
                {audit.managementResponseDate ? new Date(audit.managementResponseDate).toLocaleDateString() : "—"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 text-sm font-semibold text-neutral-600">Final Presentation:</div>
              <div className="col-span-2 text-sm text-neutral-900">
                {audit.finalPresentationDate ? new Date(audit.finalPresentationDate).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-neutral-700">Progress (observations)</div>
              <div className="text-sm font-medium text-neutral-900">
                {progress.done}/{progress.total} resolved
              </div>
            </div>
            <div className="w-full bg-neutral-200 h-3 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-primary-500 to-primary-600 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%" }}
              />
            </div>
            {progress.total > 0 && (
              <div className="text-xs text-neutral-600 mt-2 text-right">
                {Math.round((progress.done / progress.total) * 100)}% complete
              </div>
            )}
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Assignments</h2>

          <div className="flex gap-3 mb-6">
            <Select
              label=""
              value={selectedAuditor}
              onChange={(e) => setSelectedAuditor(e.target.value)}
              className="flex-1"
            >
              <option value="">Select auditor (Admin only)</option>
              {auditors.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email ?? u.name}
                </option>
              ))}
            </Select>
            <Button
              variant="primary"
              onClick={addAuditor}
              className="mt-0"
            >
              Add
            </Button>
          </div>

          <div className="space-y-3">
            {audit.assignments.map((a) => (
              <div
                key={a.auditor.id}
                className="flex items-center justify-between p-4 bg-neutral-50 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-semibold text-sm">
                      {(a.auditor.email ?? a.auditor.name ?? "U")[0].toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-neutral-900">
                    {a.auditor.email ?? a.auditor.name}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAuditor(a.auditor.id)}
                  className="text-error-600 hover:text-error-700 hover:bg-error-50"
                >
                  Remove
                </Button>
              </div>
            ))}
            {audit.assignments.length === 0 && (
              <div className="text-center py-8 px-6 bg-neutral-50 rounded-xl">
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-neutral-100 rounded-full">
                    <svg className="h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <p className="text-sm text-neutral-600">No auditors assigned yet.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Checklist UI intentionally removed */}
    </div>
  );
}