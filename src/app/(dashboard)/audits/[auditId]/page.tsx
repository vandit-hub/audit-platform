"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { isCFOOrCXOTeam } from "@/lib/rbac";

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
  isLocked?: boolean;
  lockedAt?: string | null;
  lockedById?: string | null;
  completedAt?: string | null;
  completedById?: string | null;
  visibilityRules?: any;
  auditHeadId?: string | null;
  auditHead?: User | null;
};
type Progress = { done: number; total: number };

export default function AuditDetailPage({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = React.use(params);
  const { data: session } = useSession();
  const canManageAudit = isCFOOrCXOTeam(session?.user?.role);

  const [audit, setAudit] = useState<Audit | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 });
  const [auditors, setAuditors] = useState<User[]>([]);
  const [auditHeads, setAuditHeads] = useState<User[]>([]);
  const [selectedAuditor, setSelectedAuditor] = useState("");
  const [selectedAuditHead, setSelectedAuditHead] = useState("");
  const [selectedVisibilityPreset, setSelectedVisibilityPreset] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/audits/${auditId}`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setAudit(json.audit);
      setProgress(json.progress);
      // load auditors and audit heads list (CFO/CXO-only endpoint; may 403)
      const [audRes, ahRes] = await Promise.all([
        fetch(`/api/v1/users?role=AUDITOR`, { cache: "no-store" }),
        fetch(`/api/v1/users?role=AUDIT_HEAD`, { cache: "no-store" })
      ]);
      if (audRes.ok) {
        const audJson = await audRes.json();
        setAuditors(audJson.users);
      }
      if (ahRes.ok) {
        const ahJson = await ahRes.json();
        setAuditHeads(ahJson.users);
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

  async function lockAudit() {
    if (!confirm("Are you sure you want to lock this audit? This will restrict most operations.")) return;
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/lock`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = j.error || "Failed to lock audit.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Audit locked successfully!");
    }
  }

  async function unlockAudit() {
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/unlock`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = j.error || "Failed to unlock audit.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Audit unlocked successfully!");
    }
  }

  async function completeAudit() {
    if (!confirm("Are you sure you want to mark this audit as complete? This will lock the audit.")) return;
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/complete`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = j.error || "Failed to complete audit.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Audit marked as complete!");
    }
  }

  async function assignAuditHead() {
    if (!selectedAuditHead) return;
    const selectedUser = auditHeads.find(u => u.id === selectedAuditHead);
    if (!confirm(`Assign ${selectedUser?.email || selectedUser?.name || 'user'} as Audit Head for this audit?`)) return;
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditHeadId: selectedAuditHead })
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = j.error || "Failed to assign audit head.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      setSelectedAuditHead("");
      await load();
      showSuccess(`${selectedUser?.email || selectedUser?.name || 'User'} assigned as Audit Head!`);
    }
  }

  async function updateVisibility() {
    if (!selectedVisibilityPreset) return;
    setError(null);

    let visibilityRules;
    switch (selectedVisibilityPreset) {
      case "show_all":
        visibilityRules = { mode: "show_all" };
        break;
      case "last_12m":
        visibilityRules = { mode: "last_12m" };
        break;
      case "hide_all":
        visibilityRules = { mode: "hide_all" };
        break;
      default:
        return;
    }

    const res = await fetch(`/api/v1/audits/${auditId}/visibility`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibilityRules })
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = j.error || "Failed to update visibility rules.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      setSelectedVisibilityPreset("");
      await load();
      showSuccess("Visibility rules updated successfully!");
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
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Audit</h1>
          <p className="text-sm text-text-light">
            {audit.plant.code} — {audit.plant.name}
          </p>
          {audit.title && (
            <p className="text-xs text-text-light">{audit.title}</p>
          )}
          <div className="flex items-center gap-3">
            <Badge variant={statusVariant(audit.status)}>{audit.status.replace("_", " ")}</Badge>
            <span className="text-xs text-text-light">
              {progress.total > 0 ? `${progress.done}/${progress.total} observations resolved` : "No observations yet"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isConnected ? (
            <PresenceBadge users={presence} currentUserId={userId} />
          ) : (
            <div className="flex items-center gap-2 rounded-300 border border-border-regular bg-notion-bacSec px-3 py-1.5 text-xs text-text-light">
              <span className="inline-block h-2 w-2 rounded-full bg-text-extraLight" />
              Disconnected
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-300 border border-pink-500/30 bg-pink-100 px-4 py-3 text-sm text-pink-600">
          {error}
        </div>
      )}

      {canManageAudit && (
        <Card variant="feature" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Audit controls</h2>
            <p className="text-sm text-text-light">Lock audits, mark completion, and manage visibility.</p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-text-light">Current state:</span>
              {audit.completedAt ? (
                <Badge variant="success">Completed</Badge>
              ) : audit.isLocked ? (
                <Badge variant="warning">Locked</Badge>
              ) : (
                <Badge variant="primary">Open</Badge>
              )}
            </div>

            {audit.isLocked && audit.lockedAt && (
              <div className="rounded-300 border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                <span className="font-semibold">Locked:</span> {new Date(audit.lockedAt).toLocaleString()}
              </div>
            )}
            {audit.completedAt && (
              <div className="rounded-300 border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                <span className="font-semibold">Completed:</span> {new Date(audit.completedAt).toLocaleString()}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!audit.isLocked && !audit.completedAt && (
                <>
                  <Button variant="secondary" onClick={lockAudit}>
                    Lock audit
                  </Button>
                  <Button variant="primary" onClick={completeAudit}>
                    Mark complete
                  </Button>
                </>
              )}
              {audit.isLocked && (
                <Button variant="primary" onClick={unlockAudit}>
                  Unlock audit
                </Button>
              )}
            </div>

            <p className="border-t border-border-regular pt-2 text-xs text-text-light">
              <strong>Note:</strong> locking restricts most edits. Completing an audit also locks it; CFO can override.
            </p>
          </div>
        </Card>
      )}

      {canManageAudit && (
        <Card variant="feature" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Audit visibility</h2>
            <p className="text-sm text-text-light">Control how older audits appear to auditors and audit heads.</p>
          </div>

          <div className="rounded-400 border border-border-regular bg-notion-bacSec px-4 py-3 text-sm text-text-light">
            <span className="font-medium text-gray-900">Current setting:</span>{" "}
            {audit.visibilityRules?.mode === "show_all" && "Show all audits"}
            {audit.visibilityRules?.mode === "last_12m" && "Last 12 months only"}
            {audit.visibilityRules?.mode === "hide_all" && "Hide all historical audits"}
            {!audit.visibilityRules?.mode && "Default (show all)"}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Select
              label=""
              value={selectedVisibilityPreset}
              onChange={(e) => setSelectedVisibilityPreset(e.target.value)}
              className="flex-1"
            >
              <option value="">Select visibility preset</option>
              <option value="show_all">Show all audits</option>
              <option value="last_12m">Last 12 months only</option>
              <option value="hide_all">Hide all historical audits</option>
            </Select>
            <Button variant="primary" onClick={updateVisibility}>
              Apply
            </Button>
          </div>

          <div className="rounded-300 border border-primary-200 bg-primary-50 px-4 py-3 text-xs text-primary-700">
            <div className="font-semibold text-primary-800 mb-2">Visibility presets</div>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Show all audits:</strong> auditors and audit heads can review every assignment.</li>
              <li><strong>Last 12 months only:</strong> limits the list to audits from the past year.</li>
              <li><strong>Hide all historical audits:</strong> restricts access to only the current audit.</li>
            </ul>
            <p className="mt-2 text-primary-600">
              CFO and CXO team always retain full visibility regardless of these settings.
            </p>
          </div>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card variant="feature" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Details</h2>
            <p className="text-sm text-text-light">Key metadata for this audit and its progress.</p>
          </div>
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Title</div>
              <div className="col-span-2 text-gray-900">{audit.title || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Purpose</div>
              <div className="col-span-2 text-gray-900">{audit.purpose || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Status</div>
              <div className="col-span-2">
                <Badge variant={statusVariant(audit.status)}>
                  {audit.status.replace("_", " ")}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Visit window</div>
              <div className="col-span-2 text-gray-900">
                {audit.visitStartDate ? new Date(audit.visitStartDate).toLocaleDateString() : "—"}
                <span className="mx-2 text-text-light">→</span>
                {audit.visitEndDate ? new Date(audit.visitEndDate).toLocaleDateString() : "—"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Visit details</div>
              <div className="col-span-2 text-gray-900">{audit.visitDetails || "—"}</div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Management response</div>
              <div className="col-span-2 text-gray-900">
                {audit.managementResponseDate ? new Date(audit.managementResponseDate).toLocaleDateString() : "—"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-1 font-medium text-text-light">Final presentation</div>
              <div className="col-span-2 text-gray-900">
                {audit.finalPresentationDate ? new Date(audit.finalPresentationDate).toLocaleDateString() : "—"}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-border-regular pt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-text-light">Progress (observations)</span>
              <span className="font-medium text-gray-900">{progress.done}/{progress.total} resolved</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-notion-bacSec">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out"
                style={{ width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "0%" }}
              />
            </div>
            {progress.total > 0 && (
              <div className="text-right text-xs text-text-light">
                {Math.round((progress.done / progress.total) * 100)}% complete
              </div>
            )}
          </div>
        </Card>

        <Card variant="feature" className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Assignments</h2>
            <p className="text-sm text-text-light">Manage the audit head and auditing team.</p>
          </div>

          {/* Audit Head Section */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Audit Head</h3>
            {audit.auditHead ? (
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary-50 to-primary-25 rounded-lg border-2 border-primary-200">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-primary-600 flex items-center justify-center">
                    <span className="text-white font-bold text-base">
                      {(audit.auditHead.email ?? audit.auditHead.name ?? "A")[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-neutral-900">
                      {audit.auditHead.email ?? audit.auditHead.name}
                    </div>
                    <Badge variant="primary" className="mt-1">Audit Head</Badge>
                  </div>
                </div>
                {canManageAudit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => assignAuditHead()}
                    className="text-primary-600 hover:text-primary-700 hover:bg-primary-100"
                  >
                    Change
                  </Button>
                )}
              </div>
            ) : (
              <>
                {!audit.auditHeadId && (
                  <div className="bg-warning-50 border border-warning-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-warning-800">⚠️ No audit head assigned to this audit.</p>
                  </div>
                )}
                {canManageAudit && (
                  <div className="flex gap-3">
                    <Select
                      label=""
                      value={selectedAuditHead}
                      onChange={(e) => setSelectedAuditHead(e.target.value)}
                      className="flex-1"
                    >
                      <option value="">Select Audit Head</option>
                      {auditHeads.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.email ?? u.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="primary"
                      onClick={assignAuditHead}
                      className="mt-0"
                    >
                      Assign
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-neutral-200 my-6"></div>

          {/* Auditors Section */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">Team Members (Auditors)</h3>

            {canManageAudit && (
              <div className="flex gap-3 mb-4">
                <Select
                  label=""
                  value={selectedAuditor}
                  onChange={(e) => setSelectedAuditor(e.target.value)}
                  className="flex-1"
                >
                  <option value="">Select auditor</option>
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
            )}

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
                  {canManageAudit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAuditor(a.auditor.id)}
                      className="text-error-600 hover:text-error-700 hover:bg-error-50"
                    >
                      Remove
                    </Button>
                  )}
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
          </div>
        </Card>
      </div>

      {/* Checklist UI intentionally removed */}
    </div>
  );
}