"use client";

import React, { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { useObservationWebSocket } from "@/lib/websocket/hooks";
import PresenceBadge from "@/components/PresenceBadge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";

type Plant = { id: string; code: string; name: string };
type Attachment = { id: string; kind: "ANNEXURE" | "MGMT_DOC"; fileName: string; key: string };
type Approval = { id: string; status: "SUBMITTED" | "APPROVED" | "REJECTED"; comment?: string | null; actor: { email?: string | null; name?: string | null } ; createdAt: string };
type Note = { id: string; text: string; visibility: "INTERNAL" | "ALL"; actor: { email?: string | null; name?: string | null }; createdAt: string };
type ActionPlan = { id: string; plan: string; owner?: string | null; targetDate?: string | null; status?: string | null; retest?: string | null; createdAt: string };
type Observation = {
  id: string;
  createdAt: string;
  plant: Plant;
  audit: { id: string; visitStartDate: string | null; visitEndDate: string | null };
  observationText: string;
  risksInvolved?: string | null;
  riskCategory?: "A" | "B" | "C" | null;
  likelyImpact?: "LOCAL" | "ORG_WIDE" | null;
  concernedProcess?: "O2C" | "P2P" | "R2R" | "INVENTORY" | null;
  auditorPerson?: string | null;
  auditeePersonTier1?: string | null;
  auditeePersonTier2?: string | null;
  auditeeFeedback?: string | null;
  auditorResponseToAuditee?: string | null;
  targetDate?: string | null;
  personResponsibleToImplement?: string | null;
  currentStatus: "PENDING_MR" | "MR_UNDER_REVIEW" | "REFERRED_BACK" | "OBSERVATION_FINALISED" | "RESOLVED";
  implementationDate?: string | null;
  reTestResult?: "PASS" | "FAIL" | null;
  approvalStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  isPublished: boolean;
  lockedFields?: string[] | null;
  attachments: Attachment[];
  approvals: Approval[];
  notes: Note[];
  actionPlans: ActionPlan[];
};

type ChangeRequest = {
  id: string;
  patch: Record<string, unknown>;
  comment?: string | null;
  status: "PENDING" | "APPROVED" | "DENIED";
  requester: { email?: string | null; name?: string | null };
  decidedBy?: { email?: string | null; name?: string | null } | null;
  decidedAt?: string | null;
  decisionComment?: string | null;
  createdAt: string;
};

// Fields that AUDITEE role can edit
const AUDITEE_EDITABLE_FIELDS = new Set([
  "auditeePersonTier1",
  "auditeePersonTier2",
  "auditeeFeedback",
  "targetDate",
  "personResponsibleToImplement",
  "currentStatus"
]);

function formatRetest(retest: string): string {
  const map: Record<string, string> = {
    "RETEST_DUE": "Retest due",
    "PASS": "Pass",
    "FAIL": "Fail"
  };
  return map[retest] || retest;
}

export default function ObservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { showSuccess, showError, showInfo } = useToast();

  const [o, setO] = useState<Observation | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [draft, setDraft] = useState<any>({});
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileM, setFileM] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [noteVis, setNoteVis] = useState<"ALL" | "INTERNAL">("ALL");

  const [apPlan, setApPlan] = useState("");
  const [apOwner, setApOwner] = useState("");
  const [apDate, setApDate] = useState("");
  const [apStatus, setApStatus] = useState("");
  const [apRetest, setApRetest] = useState("");

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

  // WebSocket integration
  const { presence, lastUpdate, isConnected } = useObservationWebSocket(id);
  const userId = (session?.user as any)?.id;

  const load = useCallback(async () => {
    const res = await fetch(`/api/v1/observations/${id}`, { cache: "no-store" });
    const j = await res.json();
    if (res.ok) {
      setO(j.observation);
      setDraft({
        observationText: j.observation.observationText,
        risksInvolved: j.observation.risksInvolved ?? "",
        riskCategory: j.observation.riskCategory ?? "",
        likelyImpact: j.observation.likelyImpact ?? "",
        concernedProcess: j.observation.concernedProcess ?? "",
        auditorPerson: j.observation.auditorPerson ?? "",
        auditeePersonTier1: j.observation.auditeePersonTier1 ?? "",
        auditeePersonTier2: j.observation.auditeePersonTier2 ?? "",
        auditeeFeedback: j.observation.auditeeFeedback ?? "",
        auditorResponseToAuditee: j.observation.auditorResponseToAuditee ?? "",
        targetDate: j.observation.targetDate ? j.observation.targetDate.substring(0,10) : "",
        personResponsibleToImplement: j.observation.personResponsibleToImplement ?? "",
        currentStatus: j.observation.currentStatus
      });
      // load change requests
      const crRes = await fetch(`/api/v1/observations/${id}/change-requests`, { cache: "no-store" });
      if (crRes.ok) {
        const crJ = await crRes.json();
        setChangeRequests(crJ.requests || []);
      }
    } else {
      setError(j.error || "Failed to load");
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh on WebSocket updates
  useEffect(() => {
    if (lastUpdate && o) {
      console.log('WebSocket update detected, refreshing observation');
      load();
    }
  }, [lastUpdate, load, o]);

  function setField(k: string, v: any) { setDraft((d: any) => ({ ...d, [k]: v })); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Check if auditor is trying to save an approved observation
    if (auditorLockedByApproval) {
      showInfo("This observation is approved and fields are locked. Please use 'Request Change' to modify.");
      return;
    }

    const res = await fetch(`/api/v1/observations/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...draft,
        riskCategory: draft.riskCategory || null,
        likelyImpact: draft.likelyImpact || null,
        concernedProcess: draft.concernedProcess || null,
        targetDate: draft.targetDate ? new Date(draft.targetDate).toISOString() : null
      })
    });
    const j = await res.json();
    if (!res.ok) {
      const errorMessage = j.error || "Failed to save";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Observation saved successfully!");
    }
  }

  async function submitForApproval() {
    const res = await fetch(`/api/v1/observations/${id}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" }
    });
    if (res.ok) {
      await load();
      showSuccess("Observation submitted for approval successfully!");
    } else {
      showError("Failed to submit observation for approval!");
    }
  }

  async function approve(isApprove: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve: isApprove })
    });
    if (res.ok) {
      await load();
      showSuccess(`Observation ${isApprove ? 'approved' : 'rejected'} successfully!`);
    } else {
      showError(`Failed to ${isApprove ? 'approve' : 'reject'} observation!`);
    }
  }

  async function publish(shouldPublish: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ published: shouldPublish })
    });
    if (res.ok) {
      await load();
      showSuccess(`Observation ${shouldPublish ? 'published' : 'unpublished'} successfully!`);
    } else {
      showError(`Failed to ${shouldPublish ? 'publish' : 'unpublish'} observation!`);
    }
  }

  async function retest(result: "PASS" | "FAIL") {
    const res = await fetch(`/api/v1/observations/${id}/retest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ result })
    });
    if (res.ok) {
      await load();
      showSuccess(`Retest result recorded: ${result}`);
    } else {
      showError("Failed to record retest result!");
    }
  }

  async function upload(kind: "ANNEXURE" | "MGMT_DOC") {
    const file = kind === "ANNEXURE" ? fileA : fileM;
    if (!file) return;

    // Get presigned URL
    const preRes = await fetch(`/api/v1/observations/${id}/attachments/presign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fileName: file.name, kind })
    });
    const preJ = await preRes.json();
    if (!preRes.ok) return;

    // Upload to S3
    const formData = new FormData();
    Object.entries(preJ.fields).forEach(([k, v]) => formData.append(k, v as string));
    formData.append("file", file);

    const upRes = await fetch(preJ.uploadUrl, { method: "POST", body: formData });
    if (upRes.ok) {
      // Create attachment record
      const attachRes = await fetch(`/api/v1/observations/${id}/attachments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, key: preJ.fields.key, kind })
      });
      if (attachRes.ok) {
        if (kind === "ANNEXURE") setFileA(null);
        else setFileM(null);
        await load();
        showSuccess(`${kind === "ANNEXURE" ? "Annexure" : "Management document"} uploaded successfully!`);
      } else {
        showError("Failed to upload file!");
      }
    } else {
      showError("Failed to upload file!");
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    const res = await fetch(`/api/v1/observations/${id}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: note, visibility: noteVis })
    });
    if (res.ok) {
      setNote("");
      await load();
      showSuccess("Note added successfully!");
    } else {
      showError("Failed to add note!");
    }
  }

  async function lock(fields: string[], shouldLock: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/locks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields, lock: shouldLock })
    });
    if (res.ok) {
      await load();
      showSuccess(`Fields ${shouldLock ? 'locked' : 'unlocked'} successfully!`);
    } else {
      showError(`Failed to ${shouldLock ? 'lock' : 'unlock'} fields!`);
    }
  }

  function getFieldLabel(fieldName: string): string {
    const fieldLabels: Record<string, string> = {
      observationText: "Observation Text",
      risksInvolved: "Risks Involved",
      riskCategory: "Risk Category",
      likelyImpact: "Likely Impact",
      concernedProcess: "Concerned Process",
      auditorPerson: "Auditor Person",
      auditeePersonTier1: "Auditee Person (Tier 1)",
      auditeePersonTier2: "Auditee Person (Tier 2)",
      auditeeFeedback: "Auditee Feedback",
      auditorResponseToAuditee: "Auditor Response to Auditee Remarks",
      targetDate: "Target Date",
      personResponsibleToImplement: "Person Responsible",
      currentStatus: "Current Status"
    };
    return fieldLabels[fieldName] || fieldName;
  }

  function isFieldLocked(fieldName: string): boolean {
    if (!o?.lockedFields) return false;
    return o.lockedFields.includes(fieldName);
  }

  function isFieldDisabled(fieldName: string): boolean {
    if (!o) return false;

    // Admin can edit all fields
    if (isAdmin) return false;

    // Check if field is locked (applies to non-admins)
    if (isFieldLocked(fieldName)) return true;

    // For auditees, disable all fields except those in AUDITEE_EDITABLE_FIELDS
    if (role === "AUDITEE") {
      return !AUDITEE_EDITABLE_FIELDS.has(fieldName);
    }

    // For auditors, auditee fields should be disabled (except auditorResponseToAuditee)
    if (isAuditor) {
      return AUDITEE_EDITABLE_FIELDS.has(fieldName) && fieldName !== "auditorResponseToAuditee";
    }

    // Default: not disabled
    return false;
  }

  function getFieldClassName(fieldName: string, baseClassName: string = "border rounded px-3 py-2 w-full"): string {
    const locked = isFieldLocked(fieldName);
    const disabled = isFieldDisabled(fieldName);

    if (locked) {
      return `${baseClassName} bg-orange-50 border-orange-300`;
    }

    if (disabled) {
      return `${baseClassName} bg-gray-50 border-gray-200 cursor-not-allowed`;
    }

    return baseClassName;
  }

  async function addActionPlan() {
    if (!apPlan.trim()) return;
    const res = await fetch(`/api/v1/observations/${id}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan: apPlan,
        owner: apOwner || undefined,
        targetDate: apDate ? new Date(apDate).toISOString() : undefined,
        status: apStatus || undefined,
        retest: apRetest || undefined
      })
    });
    if (res.ok) {
      setApPlan("");
      setApOwner("");
      setApDate("");
      setApStatus("");
      setApRetest("");
      await load();
      showSuccess("Action plan added successfully!");
    } else {
      showError("Failed to add action plan!");
    }
  }

  function computeAuditorPatch(): Record<string, unknown> {
    if (!o) return {};
    const auditorFields = new Set([
      "observationText","risksInvolved","riskCategory","likelyImpact","concernedProcess","auditorPerson"
    ]);
    const patch: Record<string, unknown> = {};
    for (const k of auditorFields) {
      const before = (o as any)[k] ?? "";
      const after = draft[k] ?? "";
      // normalize dates/values
      if (k === "riskCategory" || k === "likelyImpact" || k === "concernedProcess") {
        if ((before ?? "") !== (after || "")) patch[k] = after || null;
      } else {
        if ((before ?? "") !== after) patch[k] = after;
      }
    }
    return patch;
  }

  async function requestChange() {
    const patch = computeAuditorPatch();
    if (Object.keys(patch).length === 0) {
      setError("No changes detected to request.");
      return;
    }
    const comment = window.prompt("Optional comment for the admin:");
    const res = await fetch(`/api/v1/observations/${id}/change-requests`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patch, comment: comment || undefined })
    });
    const j = await res.json();
    if (!res.ok) {
      const errorMessage = j.error || "Failed to submit change request";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Change request submitted successfully!");
    }
  }

  async function decideChange(cr: ChangeRequest, approve: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/change-requests/${cr.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve })
    });
    if (res.ok) {
      await load();
      showSuccess(`Change request ${approve ? 'approved and applied' : 'denied'} successfully!`);
    } else {
      showError(`Failed to ${approve ? 'approve' : 'deny'} change request!`);
    }
  }

  if (!o) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 text-primary-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-neutral-600">Loading observation...</p>
      </div>
    </div>
  );

  const isAdmin = role === "ADMIN";
  const isAuditor = role === "AUDITOR";
  const canApprove = isAdmin;
  const canPublish = isAdmin;
  const canSubmit = isAuditor;
  const canRetest = isAdmin || isAuditor;
  const canUploadAnnex = isAdmin || isAuditor;
  const canUploadMgmt = isAdmin || isAuditor || role === "AUDITEE";
  const auditorLockedByApproval = isAuditor && o.approvalStatus === "APPROVED";
  const canSave = isAdmin || (!auditorLockedByApproval);

  const getApprovalBadgeVariant = (status: string) => {
    switch (status) {
      case "DRAFT": return "neutral";
      case "SUBMITTED": return "warning";
      case "APPROVED": return "success";
      case "REJECTED": return "error";
      default: return "neutral";
    }
  };

  return (
    <div className="space-y-8">
      <button
        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        onClick={() => router.back()}
      >
        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Observation</h1>
          <p className="text-base text-neutral-600 mt-2">
            {o.plant.code} — {o.plant.name}
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant={getApprovalBadgeVariant(o.approvalStatus)}>
              {o.approvalStatus}
            </Badge>
            <span className="text-sm text-neutral-500">
              Created {new Date(o.createdAt).toLocaleString()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && <PresenceBadge users={presence} currentUserId={userId} />}
          {!isConnected && (
            <div className="text-sm text-neutral-500 flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-neutral-400 rounded-full"></span>
              Disconnected
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="text-sm text-error-700 bg-error-50 border border-error-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <Card padding="lg">
        <form onSubmit={save} className="space-y-8">
          {/* Section 1: Observation Details */}
          <div>
            <h2 className="text-sm font-semibold text-neutral-700 mb-4 uppercase tracking-wider pb-3 border-b border-neutral-200">Observation Details</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Observation Text *</label>
                {isFieldLocked("observationText") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <textarea
                className={getFieldClassName("observationText", "border rounded px-3 py-2 w-full h-24")}
                value={draft.observationText}
                onChange={(e) => setField("observationText", e.target.value)}
                disabled={isFieldDisabled("observationText")}
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Risks Involved</label>
                {isFieldLocked("risksInvolved") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <textarea
                className={getFieldClassName("risksInvolved", "border rounded px-3 py-2 w-full h-24")}
                value={draft.risksInvolved}
                onChange={(e) => setField("risksInvolved", e.target.value)}
                disabled={isFieldDisabled("risksInvolved")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Risk Category</label>
                {isFieldLocked("riskCategory") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <select
                className={getFieldClassName("riskCategory")}
                value={draft.riskCategory}
                onChange={(e) => setField("riskCategory", e.target.value)}
                disabled={isFieldDisabled("riskCategory")}
              >
                <option value="">Select</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Likely Impact</label>
                {isFieldLocked("likelyImpact") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <select
                className={getFieldClassName("likelyImpact")}
                value={draft.likelyImpact}
                onChange={(e) => setField("likelyImpact", e.target.value)}
                disabled={isFieldDisabled("likelyImpact")}
              >
                <option value="">Select</option>
                <option value="LOCAL">Local</option>
                <option value="ORG_WIDE">Org-wide</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Concerned Process</label>
                {isFieldLocked("concernedProcess") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <select
                className={getFieldClassName("concernedProcess")}
                value={draft.concernedProcess}
                onChange={(e) => setField("concernedProcess", e.target.value)}
                disabled={isFieldDisabled("concernedProcess")}
              >
                <option value="">Select</option>
                <option value="O2C">O2C</option>
                <option value="P2P">P2P</option>
                <option value="R2R">R2R</option>
                <option value="INVENTORY">Inventory</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Auditor Person</label>
                {isFieldLocked("auditorPerson") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <input
                className={getFieldClassName("auditorPerson")}
                value={draft.auditorPerson}
                onChange={(e) => setField("auditorPerson", e.target.value)}
                disabled={isFieldDisabled("auditorPerson")}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Auditee Section */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 mb-4 uppercase tracking-wider pb-3 border-b border-neutral-200">Auditee Section</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Auditee Person (Tier 1)</label>
                {isFieldLocked("auditeePersonTier1") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <input
                className={getFieldClassName("auditeePersonTier1")}
                value={draft.auditeePersonTier1}
                onChange={(e) => setField("auditeePersonTier1", e.target.value)}
                disabled={isFieldDisabled("auditeePersonTier1")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Auditee Person (Tier 2)</label>
                {isFieldLocked("auditeePersonTier2") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <input
                className={getFieldClassName("auditeePersonTier2")}
                value={draft.auditeePersonTier2}
                onChange={(e) => setField("auditeePersonTier2", e.target.value)}
                disabled={isFieldDisabled("auditeePersonTier2")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Auditee Feedback</label>
                {isFieldLocked("auditeeFeedback") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <textarea
                className={getFieldClassName("auditeeFeedback", "border rounded px-3 py-2 w-full h-24")}
                value={draft.auditeeFeedback}
                onChange={(e) => setField("auditeeFeedback", e.target.value)}
                disabled={isFieldDisabled("auditeeFeedback")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Auditor Response to Auditee Remarks</label>
                {isFieldLocked("auditorResponseToAuditee") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <textarea
                className={getFieldClassName("auditorResponseToAuditee", "border rounded px-3 py-2 w-full h-24")}
                value={draft.auditorResponseToAuditee}
                onChange={(e) => setField("auditorResponseToAuditee", e.target.value)}
                disabled={isFieldDisabled("auditorResponseToAuditee")}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Implementation Details */}
        <div>
          <h2 className="text-sm font-semibold text-neutral-700 mb-4 uppercase tracking-wider pb-3 border-b border-neutral-200">Implementation Details</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Target Date</label>
                {isFieldLocked("targetDate") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <input
                className={getFieldClassName("targetDate")}
                type="date"
                value={draft.targetDate}
                onChange={(e) => setField("targetDate", e.target.value)}
                disabled={isFieldDisabled("targetDate")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Person Responsible</label>
                {isFieldLocked("personResponsibleToImplement") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <input
                className={getFieldClassName("personResponsibleToImplement")}
                value={draft.personResponsibleToImplement}
                onChange={(e) => setField("personResponsibleToImplement", e.target.value)}
                disabled={isFieldDisabled("personResponsibleToImplement")}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm">Current Status</label>
                {isFieldLocked("currentStatus") && (
                  <div className="flex items-center text-xs text-orange-600">
                    <span className="mr-1">🔒</span>
                    Locked
                  </div>
                )}
              </div>
              <select
                className={getFieldClassName("currentStatus")}
                value={draft.currentStatus}
                onChange={(e) => setField("currentStatus", e.target.value)}
                disabled={isFieldDisabled("currentStatus")}
              >
                <option value="PENDING_MR">Pending MR</option>
                <option value="MR_UNDER_REVIEW">MR under review</option>
                <option value="REFERRED_BACK">Referred back for MR</option>
                <option value="OBSERVATION_FINALISED">Observation finalised</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap pt-4 border-t border-neutral-200">
          <Button type="submit" variant="primary">Save Changes</Button>
          {auditorLockedByApproval && (
            <Button type="button" variant="secondary" onClick={requestChange}>
              Request Change (Auditor)
            </Button>
          )}
          {canSubmit && <Button type="button" variant="secondary" onClick={submitForApproval}>Submit for Approval</Button>}
          {canApprove && (
            <>
              <Button type="button" variant="primary" onClick={() => approve(true)}>Approve</Button>
              <Button type="button" variant="destructive" onClick={() => approve(false)}>Reject</Button>
            </>
          )}
          {canPublish && (
            <Button type="button" variant="secondary" onClick={() => publish(!o.isPublished)}>
              {o.isPublished ? "Unpublish" : "Publish"}
            </Button>
          )}
          {canRetest && (
            <>
              <Button type="button" variant="primary" onClick={() => retest("PASS")}>Retest: Pass</Button>
              <Button type="button" variant="destructive" onClick={() => retest("FAIL")}>Retest: Fail</Button>
            </>
          )}
          {isAdmin && (
            <div className="flex flex-col gap-2">
              {/* Show locked fields and unlock buttons */}
              {o.lockedFields && o.lockedFields.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <div className="text-sm font-medium text-orange-800 mb-2">
                    Locked Fields ({o.lockedFields.length}):
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {o.lockedFields.map(field => (
                      <div key={field} className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded text-xs">
                        <span className="text-orange-800">{getFieldLabel(field)}</span>
                        <button
                          type="button"
                          className="text-orange-600 hover:text-orange-800 ml-1"
                          onClick={() => lock([field], false)}
                          title={`Unlock ${getFieldLabel(field)}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => lock(o.lockedFields!, false)}
                    >
                      Unlock All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </form>
      </Card>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Attachments</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">
              Annexures ({o.attachments.filter(a => a.kind === "ANNEXURE").length})
            </div>
            <ul className="text-sm space-y-2 mb-4">
              {o.attachments.filter(a => a.kind === "ANNEXURE").map(a => (
                <li key={a.id}>
                  <a href={`/api/v1/observations/${id}/attachments/${a.id}/download`} className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {a.fileName}
                  </a>
                </li>
              ))}
              {o.attachments.filter(a => a.kind === "ANNEXURE").length === 0 && (
                <li className="text-neutral-500">No annexures uploaded</li>
              )}
            </ul>
            {canUploadAnnex && (
              <div className="flex gap-2 items-end">
                <input type="file" onChange={(e) => setFileA(e.target.files?.[0] || null)} className="text-sm" />
                <Button variant="secondary" size="sm" onClick={() => upload("ANNEXURE")} disabled={!fileA}>Upload</Button>
              </div>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-neutral-700 mb-3 uppercase tracking-wider">
              Management Docs ({o.attachments.filter(a => a.kind === "MGMT_DOC").length})
            </div>
            <ul className="text-sm space-y-2 mb-4">
              {o.attachments.filter(a => a.kind === "MGMT_DOC").map(a => (
                <li key={a.id}>
                  <a href={`/api/v1/observations/${id}/attachments/${a.id}/download`} className="text-primary-600 hover:text-primary-700 hover:underline flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {a.fileName}
                  </a>
                </li>
              ))}
              {o.attachments.filter(a => a.kind === "MGMT_DOC").length === 0 && (
                <li className="text-neutral-500">No management docs uploaded</li>
              )}
            </ul>
            {canUploadMgmt && (
              <div className="flex gap-2 items-end">
                <input type="file" onChange={(e) => setFileM(e.target.files?.[0] || null)} className="text-sm" />
                <Button variant="secondary" size="sm" onClick={() => upload("MGMT_DOC")} disabled={!fileM}>Upload</Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Notes ({o.notes.length})</h2>
        <div className="flex gap-3 mb-6">
          <textarea
            className="border border-neutral-300 rounded-lg px-3.5 py-2.5 flex-1 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
            placeholder="Add a note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
          />
          <div className="flex flex-col gap-2">
            <select
              className="border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
              value={noteVis}
              onChange={(e) => setNoteVis(e.target.value as "ALL" | "INTERNAL")}
            >
              <option value="ALL">All</option>
              <option value="INTERNAL">Internal</option>
            </select>
            <Button variant="primary" size="sm" onClick={addNote}>Add Note</Button>
          </div>
        </div>
        <ul className="text-sm space-y-3">
          {o.notes.map(n => (
            <li key={n.id} className="border-b border-neutral-100 pb-3 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-neutral-900">{n.actor.email ?? n.actor.name ?? "User"}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={n.visibility === "INTERNAL" ? "warning" : "neutral"} size="sm">
                    {n.visibility}
                  </Badge>
                  <span className="text-xs text-neutral-500">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="text-neutral-700">{n.text}</div>
            </li>
          ))}
          {o.notes.length === 0 && (
            <li className="text-center py-8 text-neutral-500">No notes yet.</li>
          )}
        </ul>
      </Card>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Action Plans ({o.actionPlans.length})</h2>
        <div className="grid sm:grid-cols-6 gap-3 mb-6">
          <input
            className="border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
            placeholder="Plan..."
            value={apPlan}
            onChange={(e) => setApPlan(e.target.value)}
          />
          <input
            className="border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
            placeholder="Owner"
            value={apOwner}
            onChange={(e) => setApOwner(e.target.value)}
          />
          <input
            className="border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
            type="date"
            placeholder="Target Date"
            value={apDate}
            onChange={(e) => setApDate(e.target.value)}
          />
          <select
            className="border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
            value={apStatus}
            onChange={(e) => setApStatus(e.target.value)}
          >
            <option value="">Status</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
          {session?.user?.role && ["ADMIN", "AUDITOR"].includes(session.user.role) && (
            <select
              className="border border-neutral-300 rounded-lg px-3.5 py-2.5 text-sm focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none transition-all"
              value={apRetest}
              onChange={(e) => setApRetest(e.target.value)}
            >
              <option value="">Retest</option>
              <option value="RETEST_DUE">Retest due</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
            </select>
          )}
          <Button variant="primary" onClick={addActionPlan}>Add Plan</Button>
        </div>
        <ul className="text-sm space-y-3">
          {o.actionPlans.map(ap => (
            <li key={ap.id} className="border border-neutral-200 rounded-lg p-4 bg-neutral-25 hover:shadow-sm transition-shadow">
              <div className="font-semibold text-neutral-900 mb-2">{ap.plan}</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-neutral-600 mb-2">
                <div><span className="font-medium">Owner:</span> {ap.owner ?? "—"}</div>
                <div><span className="font-medium">Target:</span> {ap.targetDate ? new Date(ap.targetDate).toLocaleDateString() : "—"}</div>
                <div><span className="font-medium">Status:</span> {ap.status ?? "—"}</div>
                <div>
                  <span className="font-medium">Retest:</span>{" "}
                  {ap.retest ? (
                    <Badge variant={ap.retest === "PASS" ? "success" : ap.retest === "FAIL" ? "error" : "warning"} size="sm">
                      {formatRetest(ap.retest)}
                    </Badge>
                  ) : "—"}
                </div>
              </div>
              <div className="text-xs text-neutral-500">{new Date(ap.createdAt).toLocaleString()}</div>
            </li>
          ))}
          {o.actionPlans.length === 0 && (
            <li className="text-center py-8 text-neutral-500">No action plans yet.</li>
          )}
        </ul>
      </Card>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Approvals ({o.approvals.length})</h2>
        <ul className="text-sm space-y-3">
          {o.approvals.map(ap => (
            <li key={ap.id} className="border border-neutral-200 rounded-lg p-4 bg-neutral-25">
              <div className="flex items-center justify-between mb-2">
                <Badge variant={getApprovalBadgeVariant(ap.status)}>{ap.status}</Badge>
                <span className="text-xs text-neutral-500">{new Date(ap.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-neutral-600 mb-1">
                <span className="font-medium">By:</span> {ap.actor.email ?? ap.actor.name ?? "User"}
              </div>
              {ap.comment && (
                <div className="text-neutral-700 mt-2 p-3 bg-white rounded border border-neutral-200">
                  <span className="font-medium text-neutral-900">Comment:</span> {ap.comment}
                </div>
              )}
            </li>
          ))}
          {o.approvals.length === 0 && (
            <li className="text-center py-8 text-neutral-500">No approval history yet.</li>
          )}
        </ul>
      </Card>

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">Change Requests</h2>
        <ul className="text-sm space-y-4">
          {changeRequests.map((cr) => (
            <li key={cr.id} className="border border-neutral-200 rounded-lg p-4 bg-neutral-25">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <Badge variant={cr.status === "APPROVED" ? "success" : cr.status === "DENIED" ? "error" : "warning"}>
                    {cr.status}
                  </Badge>
                  <div className="text-xs text-neutral-600 mt-2">
                    <span className="font-medium">By:</span> {cr.requester.email ?? cr.requester.name ?? "user"} · {new Date(cr.createdAt).toLocaleString()}
                  </div>
                  {cr.comment && (
                    <div className="text-xs text-neutral-700 mt-2">
                      <span className="font-medium">Comment:</span> {cr.comment}
                    </div>
                  )}
                  {cr.decidedAt && (
                    <div className="text-xs text-neutral-600 mt-2">
                      <span className="font-medium">Decision by:</span> {cr.decidedBy?.email ?? cr.decidedBy?.name ?? "admin"} on {new Date(cr.decidedAt).toLocaleString()}
                      {cr.decisionComment ? ` — ${cr.decisionComment}` : ""}
                    </div>
                  )}
                </div>
                {isAdmin && cr.status === "PENDING" && (
                  <div className="flex gap-2">
                    <Button variant="primary" size="sm" onClick={() => decideChange(cr, true)}>Approve & Apply</Button>
                    <Button variant="destructive" size="sm" onClick={() => decideChange(cr, false)}>Deny</Button>
                  </div>
                )}
              </div>
              <pre className="text-xs bg-white border border-neutral-200 p-3 rounded-lg mt-3 overflow-auto">{JSON.stringify(cr.patch, null, 2)}</pre>
            </li>
          ))}
          {changeRequests.length === 0 && (
            <li className="text-center py-8 text-neutral-500">No change requests.</li>
          )}
        </ul>
      </Card>
    </div>
  );
}