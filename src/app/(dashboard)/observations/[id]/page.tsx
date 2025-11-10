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
import { isCFO, isCFOOrCXOTeam, isCXOTeam, isAuditHead, isAuditorOrAuditHead, isAuditee, canApproveObservations } from "@/lib/rbac";
import { PageContainer } from "@/components/v2/PageContainer";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { cn } from "@/lib/utils";

type Plant = { id: string; code: string; name: string };
type Attachment = { id: string; kind: "ANNEXURE" | "MGMT_DOC"; fileName: string; key: string };
type Approval = { id: string; status: "SUBMITTED" | "APPROVED" | "REJECTED"; comment?: string | null; actor: { email?: string | null; name?: string | null } ; createdAt: string };
type Note = { id: string; text: string; visibility: "INTERNAL" | "ALL"; actor: { email?: string | null; name?: string | null }; createdAt: string };
type ActionPlan = { id: string; plan: string; owner?: string | null; targetDate?: string | null; status?: string | null; retest?: string | null; createdAt: string };
type ObservationAssignment = {
  id: string;
  auditee: { id: string; name: string | null; email: string | null };
  assignedAt: string;
};

type Observation = {
  id: string;
  createdAt: string;
  plant: Plant;
  audit: { id: string; visitStartDate: string | null; visitEndDate: string | null; isLocked?: boolean; completedAt?: string | null };
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
  assignments?: ObservationAssignment[];
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

const BASE_FIELD_CLASS =
  "w-full rounded-lg border border-[var(--border-color-regular)] bg-[var(--c-bacPri)] px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(var(--ring-rgb,35 131 226),0.25)] focus:border-transparent disabled:bg-[var(--muted)] disabled:text-[var(--muted-foreground)] disabled:cursor-not-allowed";
const LOCKED_FIELD_CLASS =
  "bg-[var(--cl-palOra100)] border-[var(--cd-palOra500)] text-[var(--cd-palOra500)]";
const DISABLED_FIELD_CLASS =
  "bg-[var(--muted)] border-[var(--border-color-regular)]/70 text-[var(--muted-foreground)]";

function formatRetest(retest: string): string {
  const map: Record<string, string> = {
    "RETEST_DUE": "Retest due",
    "PASS": "Pass",
    "FAIL": "Fail"
  };
  return map[retest] || retest;
}

function humanizeStatus(value?: string | null): string {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split(/[_\s-]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
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
  const [auditees, setAuditees] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [selectedAuditee, setSelectedAuditee] = useState("");

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
      // load change requests and auditees list
      const [crRes, auditeeRes] = await Promise.all([
        fetch(`/api/v1/observations/${id}/change-requests`, { cache: "no-store" }),
        fetch(`/api/v1/users?role=AUDITEE`, { cache: "no-store" })
      ]);
      if (crRes.ok) {
        const crJ = await crRes.json();
        setChangeRequests(crJ.requests || []);
      }
      if (auditeeRes.ok) {
        const auditeeJ = await auditeeRes.json();
        setAuditees(auditeeJ.users || []);
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

  async function deleteObservation() {
    if (!confirm("Are you sure you want to delete this observation? This action cannot be undone.")) {
      return;
    }
    const res = await fetch(`/api/v1/observations/${id}`, {
      method: "DELETE"
    });
    if (res.ok) {
      showSuccess("Observation deleted successfully!");
      router.push('/observations');
    } else {
      const j = await res.json().catch(() => ({}));
      showError(j.error || "Failed to delete observation!");
    }
  }

  async function assignAuditee() {
    if (!selectedAuditee) return;
    const res = await fetch(`/api/v1/observations/${id}/assign-auditee`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditeeId: selectedAuditee })
    });
    if (res.ok) {
      const selectedUser = auditees.find(u => u.id === selectedAuditee);
      setSelectedAuditee("");
      await load();
      showSuccess(`Auditee ${selectedUser?.email || selectedUser?.name || 'user'} assigned successfully!`);
    } else {
      const j = await res.json().catch(() => ({}));
      showError(j.error || "Failed to assign auditee!");
    }
  }

  async function removeAuditee(assignmentId: string) {
    if (!confirm("Remove this auditee from the observation?")) return;
    const res = await fetch(`/api/v1/observations/${id}/assign-auditee?assignmentId=${assignmentId}`, {
      method: "DELETE"
    });
    if (res.ok) {
      await load();
      showSuccess("Auditee removed successfully!");
    } else {
      const j = await res.json().catch(() => ({}));
      showError(j.error || "Failed to remove auditee!");
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

    // CFO can edit all fields
    if (canOverride) return false;

    // Check if audit is locked (blocks all edits except CFO)
    if (o.audit?.isLocked) return true;

    // Check if field is locked (applies to non-CFO users)
    if (isFieldLocked(fieldName)) return true;

    // For auditees, check assignment and field restrictions
    if (isAuditee(role)) {
      // Check if user is assigned to this observation
      const isAssigned = o.assignments?.some(a => a.auditee.id === userId);
      // Disable all fields if not assigned
      if (!isAssigned) return true;
      // If assigned, only allow AUDITEE_EDITABLE_FIELDS
      return !AUDITEE_EDITABLE_FIELDS.has(fieldName);
    }

    // For auditors, auditee fields should be disabled (except auditorResponseToAuditee)
    if (isAuditorRole) {
      return AUDITEE_EDITABLE_FIELDS.has(fieldName) && fieldName !== "auditorResponseToAuditee";
    }

    // Default: not disabled
    return false;
  }

  function getFieldClassName(fieldName: string, extraClassName = ""): string {
    const locked = isFieldLocked(fieldName);
    const disabled = isFieldDisabled(fieldName);

    return cn(
      BASE_FIELD_CLASS,
      extraClassName,
      locked && LOCKED_FIELD_CLASS,
      !locked && disabled && DISABLED_FIELD_CLASS,
    );
  }

  const renderLockPill = (fieldName: string) =>
    isFieldLocked(fieldName) ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cl-palOra100)] px-2 py-0.5 text-xs font-medium text-[var(--cd-palOra500)]">
        <span aria-hidden>🔒</span>
        Locked
      </span>
    ) : null;

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

  const canOverride = isCFO(role);
  const isAuditorRole = isAuditorOrAuditHead(role) && !isAuditHead(role); // Pure auditor (not audit head)
  const canApprove = canApproveObservations(role);
  const canPublish = isCFO(role);
  const canSubmit = isAuditorOrAuditHead(role);
  const canRetest = isAuditorOrAuditHead(role);
  const canUploadAnnex = isAuditorOrAuditHead(role);
  const canUploadMgmt = isAuditorOrAuditHead(role) || isAuditee(role);
  const auditorLockedByApproval = isAuditorRole && o.approvalStatus === "APPROVED";
  const canSave = canOverride || (!auditorLockedByApproval);
  const canDelete = isCFO(role) || (isAuditHead(role) && !o.audit.isLocked);
  const canManageAssignments = isCFOOrCXOTeam(role) || isAuditHead(role) || isAuditorOrAuditHead(role);

  const getApprovalBadgeVariant = (status: string) => {
    switch (status) {
      case "DRAFT": return "neutral";
      case "SUBMITTED": return "warning";
      case "APPROVED": return "success";
      case "REJECTED": return "error";
      default: return "neutral";
    }
  };
  const approvalLabel = humanizeStatus(o.approvalStatus);
  const workflowLabel = humanizeStatus(o.currentStatus);
  const riskLabel = o.riskCategory ? `Risk ${o.riskCategory}` : "Unclassified";
  const targetDateLabel = formatDate(o.targetDate);
  const publishedLabel = o.isPublished ? "Published" : "Unpublished";
  const retestLabel = o.reTestResult ? formatRetest(o.reTestResult) : "Not recorded";


  return (
    <PageContainer className="space-y-8">
      <button
        className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        onClick={() => router.back()}
      >
        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      {/* Audit Lock Banner */}
      {o.audit?.isLocked && !canOverride && (
        <div className="bg-warning-50 border-l-4 border-warning-500 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-warning-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-warning-900 mb-1">Parent Audit is Locked</h3>
              <p className="text-sm text-warning-800">
                This observation's parent audit has been locked. Most operations are restricted.
                {canOverride && <span className="font-medium"> CFO can still make changes.</span>}
              </p>
            </div>
          </div>
        </div>
      )}

      {o.audit?.completedAt && (
        <div className="bg-success-50 border-l-4 border-success-500 rounded-lg p-5">
          <div className="flex items-start gap-3">
            <svg className="h-6 w-6 text-success-700 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-success-900 mb-1">Parent Audit Completed</h3>
              <p className="text-sm text-success-800">
                This observation's parent audit was completed on {new Date(o.audit.completedAt).toLocaleString()}.
                {canOverride && <span className="font-medium"> CFO can still make changes.</span>}
              </p>
            </div>
          </div>
        </div>
      )}

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--ca-palUiBlu100)]/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--c-palUiBlu700)]">
            Approval
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[var(--c-palUiBlu700)]">
              {approvalLabel}
            </span>
            <Badge variant={getApprovalBadgeVariant(o.approvalStatus)}>
              {o.approvalStatus}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-[var(--c-palUiBlu700)]/80">
            {canApprove ? "Audit heads can approve or reject from this workspace." : "View-only access to the approval state."}
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--cl-palOra100)]/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--cd-palOra500)]">
            Workflow
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[var(--cd-palOra500)]">
              {workflowLabel}
            </span>
            <span className="text-xs font-medium text-[var(--cd-palOra500)]">
              {riskLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--cd-palOra500)]/80">
            Track the current lifecycle and associated risk classification.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--cl-palGre100)]/70 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--cd-palGre500)]">
            Target date
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[var(--cd-palGre500)]">
              {targetDateLabel}
            </span>
            <span className="text-xs font-medium text-[var(--cd-palGre500)]">
              Retest: {retestLabel}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--cd-palGre500)]/80">
            Keep auditees aligned on remediation expectations.
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--c-texSec)]">
            Publication
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-semibold text-[var(--c-texPri)]">
              {publishedLabel}
            </span>
            <span className="text-xs font-medium text-[var(--c-texSec)]">
              Audit window: {formatDate(o.audit.visitStartDate)} - {formatDate(o.audit.visitEndDate)}
            </span>
          </div>
          <p className="mt-2 text-xs text-[var(--c-texSec)]/80">
            Publishing controls visibility across downstream dashboards.
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-error-700 bg-error-50 border border-error-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <form onSubmit={save} className="space-y-8 px-8 py-8">
          {isAuditee(role) && (
            <div>
              {!o.assignments?.some((a) => a.auditee.id === userId) ? (
                <div className="rounded-2xl border border-[var(--cl-palOra100)] bg-[var(--cl-palOra100)]/60 px-5 py-4">
                  <div className="flex items-start gap-3 text-[var(--cd-palOra500)]">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">You are not assigned to this observation</p>
                      <p className="text-xs">
                        You cannot edit any fields until you are assigned by an auditor or audit head.
                      </p>
                    </div>
                  </div>
                </div>
              ) : o.audit?.isLocked ? (
                <div className="rounded-2xl border border-[var(--c-palUiRed100)] bg-[var(--c-palUiRed100)]/60 px-5 py-4">
                  <div className="flex items-start gap-3 text-[var(--c-palUiRed600)]">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">This audit is locked</p>
                      <p className="text-xs">
                        You cannot edit fields at this time. Only CFO can make changes.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--cl-palGre100)] bg-[var(--cl-palGre100)]/60 px-5 py-4">
                  <div className="flex items-start gap-3 text-[var(--cd-palGre500)]">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">You can edit auditee fields</p>
                      <p className="text-xs">
                        Fields in the "Auditee Section" below are editable. Other fields are read-only.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 1: Auditor Section */}
          <section className="space-y-6 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-6 py-6">
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--c-texPri)]">
                Auditor Section
              </h2>
              <p className="text-xs text-[var(--c-texSec)]">
                Visible to all, editable by auditors and audit heads (when in draft or rejected status).
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--c-texSec)]">
                    Observation text<span className="ml-1 text-[var(--c-palUiRed600)]">*</span>
                  </label>
                  {renderLockPill("observationText")}
                </div>
                <textarea
                  className={getFieldClassName("observationText", "min-h-32 leading-relaxed")}
                  value={draft.observationText}
                  onChange={(e) => setField("observationText", e.target.value)}
                  disabled={isFieldDisabled("observationText")}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--c-texSec)]">
                    Risks involved
                  </label>
                  {renderLockPill("risksInvolved")}
                </div>
                <textarea
                  className={getFieldClassName("risksInvolved", "min-h-28 leading-relaxed")}
                  value={draft.risksInvolved}
                  onChange={(e) => setField("risksInvolved", e.target.value)}
                  disabled={isFieldDisabled("risksInvolved")}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--c-texSec)]">
                    Risk category
                  </label>
                  {renderLockPill("riskCategory")}
                </div>
                <select
                  className={getFieldClassName("riskCategory", "appearance-none pr-8")}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--c-texSec)]">
                    Likely impact
                  </label>
                  {renderLockPill("likelyImpact")}
                </div>
                <select
                  className={getFieldClassName("likelyImpact", "appearance-none pr-8")}
                  value={draft.likelyImpact}
                  onChange={(e) => setField("likelyImpact", e.target.value)}
                  disabled={isFieldDisabled("likelyImpact")}
                >
                  <option value="">Select</option>
                  <option value="LOCAL">Local</option>
                  <option value="ORG_WIDE">Org-wide</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--c-texSec)]">
                    Concerned process
                  </label>
                  {renderLockPill("concernedProcess")}
                </div>
                <select
                  className={getFieldClassName("concernedProcess", "appearance-none pr-8")}
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-[var(--c-texSec)]">
                    Auditor
                  </label>
                  {renderLockPill("auditorPerson")}
                </div>
                <input
                  className={getFieldClassName("auditorPerson")}
                  value={draft.auditorPerson}
                  onChange={(e) => setField("auditorPerson", e.target.value)}
                  disabled={isFieldDisabled("auditorPerson")}
                />
              </div>
            </div>
          </section>

        {/* Section 2: Auditee Section */}
        <section className="space-y-6 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-6 py-6">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--c-texPri)]">
              Auditee Section
            </h2>
            <p className="text-xs text-[var(--c-texSec)]">
              Visible to all, editable by assigned auditees (even after approval, while the audit is open).
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--c-texSec)]">
                  Auditee person (tier 1)
                </label>
                {renderLockPill("auditeePersonTier1")}
              </div>
              <input
                className={getFieldClassName("auditeePersonTier1")}
                value={draft.auditeePersonTier1}
                onChange={(e) => setField("auditeePersonTier1", e.target.value)}
                disabled={isFieldDisabled("auditeePersonTier1")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--c-texSec)]">
                  Auditee person (tier 2)
                </label>
                {renderLockPill("auditeePersonTier2")}
              </div>
              <input
                className={getFieldClassName("auditeePersonTier2")}
                value={draft.auditeePersonTier2}
                onChange={(e) => setField("auditeePersonTier2", e.target.value)}
                disabled={isFieldDisabled("auditeePersonTier2")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--c-texSec)]">
                  Auditee feedback
                </label>
                {renderLockPill("auditeeFeedback")}
              </div>
              <textarea
                className={getFieldClassName("auditeeFeedback", "min-h-28 leading-relaxed")}
                value={draft.auditeeFeedback}
                onChange={(e) => setField("auditeeFeedback", e.target.value)}
                disabled={isFieldDisabled("auditeeFeedback")}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--c-texSec)]">
                  Auditor response to auditee remarks
                </label>
                {renderLockPill("auditorResponseToAuditee")}
              </div>
              <textarea
                className={getFieldClassName("auditorResponseToAuditee", "min-h-28 leading-relaxed")}
                value={draft.auditorResponseToAuditee}
                onChange={(e) => setField("auditorResponseToAuditee", e.target.value)}
                disabled={isFieldDisabled("auditorResponseToAuditee")}
              />
            </div>
          </div>
        </section>

        {/* Current Status */}
        <section className="space-y-4 rounded-2xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-6 py-6">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--c-texPri)]">
              Workflow & approvals
            </h3>
            <p className="text-xs text-[var(--c-texSec)]">
              Update the lifecycle, trigger approvals, or adjust publication state.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-[var(--c-texSec)]">
                  Current status
                </label>
                {renderLockPill("currentStatus")}
              </div>
              <select
                className={getFieldClassName("currentStatus", "appearance-none pr-8")}
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
            <div className="space-y-1 rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacPri)] px-3 py-3 text-xs text-[var(--c-texSec)]">
              <p>
                <span className="font-medium text-[var(--c-texPri)]">Publication:</span> {publishedLabel}
              </p>
              <p>
                <span className="font-medium text-[var(--c-texPri)]">Retest:</span> {retestLabel}
              </p>
            </div>
          </div>
        </section>
        <div className="flex flex-wrap gap-3 border-t border-[var(--border-color-regular)] pt-6">
          <Button type="submit" variant="primary">Save Changes</Button>
          {auditorLockedByApproval && (
            <Button type="button" variant="secondary" onClick={requestChange}>
              Request Change (Auditor)
            </Button>
          )}
          {canSubmit && (
            <Button
              type="button"
              variant="secondary"
              onClick={submitForApproval}
              disabled={o.audit?.isLocked && !canOverride || o.approvalStatus === "SUBMITTED" || o.approvalStatus === "APPROVED"}
              title={
                o.audit?.isLocked && !canOverride
                  ? "Audit is locked - cannot submit"
                  : o.approvalStatus === "SUBMITTED"
                    ? "Already submitted for approval"
                    : o.approvalStatus === "APPROVED"
                      ? "Already approved - use change request workflow"
                      : undefined
              }
            >
              Submit for Approval
            </Button>
          )}
          {canApprove && (
            <>
              <Button
                type="button"
                variant="primary"
                onClick={() => approve(true)}
                disabled={o.audit?.isLocked && !canOverride}
                title={o.audit?.isLocked && !canOverride ? "Audit is locked - cannot approve" : undefined}
              >
                Approve
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => approve(false)}
                disabled={o.audit?.isLocked && !canOverride}
                title={o.audit?.isLocked && !canOverride ? "Audit is locked - cannot reject" : undefined}
              >
                Reject
              </Button>
            </>
          )}
          {canDelete && (
            <Button type="button" variant="destructive" onClick={deleteObservation}>
              Delete Observation
            </Button>
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
          {canOverride && (
            <div className="flex flex-col gap-2">
              {o.lockedFields && o.lockedFields.length > 0 && (
                <div className="rounded-xl border border-[var(--cl-palOra100)] bg-[var(--cl-palOra100)]/50 p-3">
                  <div className="text-sm font-medium text-[var(--cd-palOra500)]">
                    Locked fields ({o.lockedFields.length}):
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {o.lockedFields.map((field) => (
                      <div
                        key={field}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--ca-palUiBlu100)] px-2 py-1 text-xs font-medium text-[var(--c-palUiBlu700)]"
                      >
                        <span>{getFieldLabel(field)}</span>
                        <button
                          type="button"
                          className="text-[var(--cd-palOra500)] transition-colors hover:text-[var(--c-palUiRed600)]"
                          onClick={() => lock([field], false)}
                          title={`Unlock ${getFieldLabel(field)}`}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => lock(o.lockedFields!, false)}
                    >
                      Unlock all
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </form>
      </Card>

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <div className="px-8 pt-8">
          <h2 className="text-base font-semibold text-[var(--c-texPri)]">
            Assigned auditees
          </h2>
          <p className="mt-2 text-sm text-[var(--c-texSec)]">
            Manage who participates in updates for this observation.
          </p>
        </div>
        <div className="space-y-6 px-8 pb-8">
          {o.assignments && o.assignments.length > 0 ? (
            <div className="space-y-3">
              {o.assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--c-palUiGre600)] text-white">
                      <span className="text-sm font-semibold">
                        {(assignment.auditee.email ?? assignment.auditee.name ?? "A")[0].toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm font-medium text-[var(--c-texPri)]">
                        {assignment.auditee.email ?? assignment.auditee.name}
                      </div>
                      <div className="text-xs text-[var(--c-texSec)]">
                        Assigned on {new Date(assignment.assignedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {canManageAssignments && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAuditee(assignment.id)}
                      className="text-[var(--c-palUiRed600)] hover:bg-[var(--c-palUiRed100)]"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-6 text-center text-sm text-[var(--c-texSec)]">
              No auditees assigned to this observation.
            </div>
          )}

          {canManageAssignments && (
            <div className="border-t border-[var(--border-color-regular)] pt-5">
              <h3 className="text-sm font-semibold text-[var(--c-texPri)]">Assign auditee</h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Select
                  label=""
                  value={selectedAuditee}
                  onChange={(e) => setSelectedAuditee(e.target.value)}
                  className="flex-1"
                >
                  <option value="">Select auditee</option>
                  {auditees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email ?? u.name}
                    </option>
                  ))}
                </Select>
                <Button variant="primary" onClick={assignAuditee}>
                  Assign
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <div className="px-8 pt-8">
          <h2 className="text-base font-semibold text-[var(--c-texPri)]">Attachments</h2>
          <p className="mt-2 text-sm text-[var(--c-texSec)]">
            Supporting documents and evidence captured for this observation.
          </p>
        </div>
        <div className="grid gap-6 px-8 pb-8 md:grid-cols-2">
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--c-texSec)]">
                Annexures ({o.attachments.filter(a => a.kind === "ANNEXURE").length})
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--c-texSec)]">
                {o.attachments.filter(a => a.kind === "ANNEXURE").map(a => (
                  <li key={a.id}>
                    <a
                      href={`/api/v1/observations/${id}/attachments/${a.id}/download`}
                      className="flex items-center gap-2 text-[var(--c-palUiBlu700)] transition-colors hover:text-[var(--c-palUiBlu600)]"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      {a.fileName}
                    </a>
                  </li>
                ))}
                {o.attachments.filter(a => a.kind === "ANNEXURE").length === 0 && (
                  <li className="text-xs text-[var(--c-texSec)]/70">No annexures uploaded</li>
                )}
              </ul>
            </div>
            {canUploadAnnex && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3">
                <input
                  type="file"
                  onChange={(e) => setFileA(e.target.files?.[0] || null)}
                  className="flex-1 text-sm text-[var(--c-texSec)]"
                />
                <Button variant="secondary" size="sm" onClick={() => upload("ANNEXURE")} disabled={!fileA}>
                  Upload
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--c-texSec)]">
                Management docs ({o.attachments.filter(a => a.kind === "MGMT_DOC").length})
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--c-texSec)]">
                {o.attachments.filter(a => a.kind === "MGMT_DOC").map(a => (
                  <li key={a.id}>
                    <a
                      href={`/api/v1/observations/${id}/attachments/${a.id}/download`}
                      className="flex items-center gap-2 text-[var(--c-palUiBlu700)] transition-colors hover:text-[var(--c-palUiBlu600)]"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                        />
                      </svg>
                      {a.fileName}
                    </a>
                  </li>
                ))}
                {o.attachments.filter(a => a.kind === "MGMT_DOC").length === 0 && (
                  <li className="text-xs text-[var(--c-texSec)]/70">No management documents uploaded</li>
                )}
              </ul>
            </div>
            {canUploadMgmt && (
              <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3">
                <input
                  type="file"
                  onChange={(e) => setFileM(e.target.files?.[0] || null)}
                  className="flex-1 text-sm text-[var(--c-texSec)]"
                />
                <Button variant="secondary" size="sm" onClick={() => upload("MGMT_DOC")} disabled={!fileM}>
                  Upload
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <div className="px-8 pt-8">
          <h2 className="text-base font-semibold text-[var(--c-texPri)]">Notes ({o.notes.length})</h2>
          <p className="mt-2 text-sm text-[var(--c-texSec)]">
            Capture running context, decisions, and reminders tied to this observation.
          </p>
        </div>
        <div className="space-y-6 px-8 pb-8">
          <div className="flex flex-col gap-3 md:flex-row">
            <textarea
              className={cn(BASE_FIELD_CLASS, "min-h-28 flex-1 leading-relaxed")}
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
            <div className="flex w-full flex-col gap-2 md:w-48">
              <select
                className={cn(BASE_FIELD_CLASS)}
                value={noteVis}
                onChange={(e) => setNoteVis(e.target.value as "ALL" | "INTERNAL")}
              >
                <option value="ALL">All</option>
                <option value="INTERNAL">Internal</option>
              </select>
              <Button variant="primary" onClick={addNote} disabled={!note.trim()}>
                Add note
              </Button>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            {o.notes.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[var(--c-texPri)]">
                      {n.actor.email ?? n.actor.name ?? "User"}
                    </div>
                    <div className="mt-2 space-y-2 text-[var(--c-texSec)]">
                      <p>{n.text}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-right">
                    <Badge variant={n.visibility === "INTERNAL" ? "warning" : "neutral"} size="sm">
                      {n.visibility}
                    </Badge>
                    <span className="text-xs text-[var(--c-texSec)]/70">
                      {new Date(n.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </li>
            ))}
            {o.notes.length === 0 && (
              <li className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-6 text-center text-sm text-[var(--c-texSec)]">
                No notes yet.
              </li>
            )}
          </ul>
        </div>
      </Card>

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <div className="px-8 pt-8">
          <h2 className="text-base font-semibold text-[var(--c-texPri)]">
            Action plans ({o.actionPlans.length})
          </h2>
          <p className="mt-2 text-sm text-[var(--c-texSec)]">
            Track remediation tasks, owners, and retest outcomes for this observation.
          </p>
        </div>
        <div className="space-y-6 px-8 pb-8">
          <div className="grid gap-3 md:grid-cols-6">
            <input
              className={cn(BASE_FIELD_CLASS, "md:col-span-2")}
              placeholder="Plan..."
              value={apPlan}
              onChange={(e) => setApPlan(e.target.value)}
            />
            <input
              className={cn(BASE_FIELD_CLASS, "md:col-span-1")}
              placeholder="Owner"
              value={apOwner}
              onChange={(e) => setApOwner(e.target.value)}
            />
            <input
              className={cn(BASE_FIELD_CLASS, "md:col-span-1")}
              type="date"
              value={apDate}
              onChange={(e) => setApDate(e.target.value)}
            />
            <select
              className={cn(BASE_FIELD_CLASS, "md:col-span-1")}
              value={apStatus}
              onChange={(e) => setApStatus(e.target.value)}
            >
              <option value="">Status</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
            {isAuditorOrAuditHead(role) && (
              <select
                className={cn(BASE_FIELD_CLASS, "md:col-span-1")}
                value={apRetest}
                onChange={(e) => setApRetest(e.target.value)}
              >
                <option value="">Retest</option>
                <option value="RETEST_DUE">Retest due</option>
                <option value="PASS">Pass</option>
                <option value="FAIL">Fail</option>
              </select>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={addActionPlan}
              disabled={!apPlan.trim()}
              className="md:col-span-1"
            >
              Add plan
            </Button>
          </div>
          <ul className="space-y-3 text-sm">
            {o.actionPlans.map((ap) => (
              <li
                key={ap.id}
                className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-4 shadow-sm"
              >
                <div className="text-sm font-semibold text-[var(--c-texPri)]">
                  {ap.plan}
                </div>
                <div className="mt-3 grid gap-x-4 gap-y-2 text-[var(--c-texSec)] md:grid-cols-2">
                  <div>
                    <span className="font-medium text-[var(--c-texPri)]">Owner:</span> {ap.owner ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium text-[var(--c-texPri)]">Target:</span> {ap.targetDate ? new Date(ap.targetDate).toLocaleDateString() : "—"}
                  </div>
                  <div>
                    <span className="font-medium text-[var(--c-texPri)]">Status:</span> {ap.status ?? "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--c-texPri)]">Retest:</span>
                    {ap.retest ? (
                      <Badge variant={ap.retest === "PASS" ? "success" : ap.retest === "FAIL" ? "error" : "warning"} size="sm">
                        {formatRetest(ap.retest)}
                      </Badge>
                    ) : (
                      <span className="text-[var(--c-texSec)]/70">—</span>
                    )}
                  </div>
                </div>
                <div className="mt-3 text-xs text-[var(--c-texSec)]/70">
                  {new Date(ap.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
            {o.actionPlans.length === 0 && (
              <li className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-6 text-center text-sm text-[var(--c-texSec)]">
                No action plans yet.
              </li>
            )}
          </ul>
        </div>
      </Card>

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <div className="px-8 pt-8">
          <h2 className="text-base font-semibold text-[var(--c-texPri)]">
            Approvals ({o.approvals.length})
          </h2>
          <p className="mt-2 text-sm text-[var(--c-texSec)]">
            Snapshot of the approval trail with comments and timestamps.
          </p>
        </div>
        <div className="space-y-3 px-8 pb-8 text-sm">
          {o.approvals.map((ap) => (
            <div
              key={ap.id}
              className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 text-[var(--c-texSec)]">
                  <Badge variant={getApprovalBadgeVariant(ap.status)}>{ap.status}</Badge>
                  <div>
                    <span className="font-medium text-[var(--c-texPri)]">By:</span> {ap.actor.email ?? ap.actor.name ?? "User"}
                  </div>
                  {ap.comment && (
                    <div className="rounded-md border border-[var(--border-color-regular)] bg-[var(--c-bacPri)] px-3 py-2 text-[var(--c-texSec)]">
                      <span className="font-medium text-[var(--c-texPri)]">Comment:</span> {ap.comment}
                    </div>
                  )}
                </div>
                <span className="text-xs text-[var(--c-texSec)]/70">
                  {new Date(ap.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {o.approvals.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-6 text-center text-sm text-[var(--c-texSec)]">
              No approval history yet.
            </div>
          )}
        </div>
      </Card>

      <Card
        padding="none"
        className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)] shadow-sm"
      >
        <div className="px-8 pt-8">
          <h2 className="text-base font-semibold text-[var(--c-texPri)]">Change requests</h2>
          <p className="mt-2 text-sm text-[var(--c-texSec)]">
            Audit trail of requested edits submitted after approval.
          </p>
        </div>
        <div className="space-y-4 px-8 pb-8 text-sm">
          {changeRequests.map((cr) => (
            <div
              key={cr.id}
              className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 text-[var(--c-texSec)]">
                  <Badge variant={cr.status === "APPROVED" ? "success" : cr.status === "DENIED" ? "error" : "warning"}>
                    {cr.status}
                  </Badge>
                  <div className="text-xs text-[var(--c-texSec)]/80">
                    <span className="font-medium text-[var(--c-texPri)]">By:</span> {cr.requester.email ?? cr.requester.name ?? "user"}
                    <span className="mx-1">·</span>
                    {new Date(cr.createdAt).toLocaleString()}
                  </div>
                  {cr.comment && (
                    <div className="rounded-md border border-[var(--border-color-regular)] bg-[var(--c-bacPri)] px-3 py-2">
                      <span className="font-medium text-[var(--c-texPri)]">Comment:</span> {cr.comment}
                    </div>
                  )}
                  {cr.decidedAt && (
                    <div className="text-xs text-[var(--c-texSec)]/80">
                      <span className="font-medium text-[var(--c-texPri)]">Decision by:</span> {cr.decidedBy?.email ?? cr.decidedBy?.name ?? "admin"}
                      <span className="mx-1">·</span>
                      {new Date(cr.decidedAt).toLocaleString()}
                      {cr.decisionComment ? ` - ${cr.decisionComment}` : ""}
                    </div>
                  )}
                  <pre className="rounded-md border border-[var(--border-color-regular)] bg-[var(--c-bacPri)] px-3 py-2 text-xs text-[var(--c-texSec)] overflow-auto">{JSON.stringify(cr.patch, null, 2)}</pre>
                </div>
                {canOverride && cr.status === "PENDING" && (
                  <div className="flex flex-col gap-2">
                    <Button variant="primary" size="sm" onClick={() => decideChange(cr, true)}>
                      Approve & apply
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => decideChange(cr, false)}>
                      Deny
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {changeRequests.length === 0 && (
            <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-6 text-center text-sm text-[var(--c-texSec)]">
              No change requests.
            </div>
          )}
        </div>
      </Card>
    </PageContainer>
  );
}