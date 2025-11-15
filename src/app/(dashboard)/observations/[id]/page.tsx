"use client";

import React, { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { useObservationWebSocket } from "@/lib/websocket/hooks";
import PresenceBadge from "@/components/PresenceBadge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/v2/button";
import { Badge } from "@/components/ui/v2/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/v2/select";
import { Label } from "@/components/ui/v2/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { isCFO, isCFOOrCXOTeam, isCXOTeam, isAuditHead, isAuditorOrAuditHead, isAuditee, canApproveObservations } from "@/lib/rbac";
import { PageContainer } from "@/components/v2/PageContainer";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { cn } from "@/lib/utils";
import { ChevronRight, Clock, Send, Plus, Upload, Download, Trash2, CheckCircle, XCircle, Lock, Unlock } from "lucide-react";

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
  audit: { id: string; visitStartDate: string | null; visitEndDate: string | null; isLocked?: boolean; completedAt?: string | null; auditHeadId?: string | null };
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
  "auditeeFeedback"
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

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return "??";
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
  const [noteSending, setNoteSending] = useState(false);

  const [apPlan, setApPlan] = useState("");
  const [apOwner, setApOwner] = useState("");
  const [apDate, setApDate] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isChangeRequestDialogOpen, setIsChangeRequestDialogOpen] = useState(false);
  const [changeRequestComment, setChangeRequestComment] = useState("");

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
  const [auditees, setAuditees] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [selectedAuditee, setSelectedAuditee] = useState("");
  const [auditors, setAuditors] = useState<{ id: string; name: string | null; email: string | null }[]>([]);

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
      // load change requests, auditees list, and auditors list
      const [crRes, auditeeRes, auditorRes] = await Promise.all([
        fetch(`/api/v1/observations/${id}/change-requests`, { cache: "no-store" }),
        fetch(`/api/v1/users?role=AUDITEE`, { cache: "no-store" }),
        fetch(`/api/v1/users?role=AUDITOR`, { cache: "no-store" })
      ]);
      if (crRes.ok) {
        const crJ = await crRes.json();
        setChangeRequests(crJ.requests || []);
      }
      if (auditeeRes.ok) {
        const auditeeJ = await auditeeRes.json();
        setAuditees(auditeeJ.users || []);
      }
      if (auditorRes.ok) {
        const auditorJ = await auditorRes.json();
        setAuditors(auditorJ.users || []);
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
      const j = await res.json().catch(() => ({}));
      showError(j.error || `Failed to ${shouldPublish ? 'publish' : 'unpublish'} observation!`);
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
        targetDate: apDate ? new Date(apDate).toISOString() : undefined
      })
    });
    if (res.ok) {
      setApPlan("");
      setApOwner("");
      setApDate("");
      setIsAddDialogOpen(false);
      await load();
      showSuccess("Action plan added successfully!");
    } else {
      showError("Failed to add action plan!");
    }
  }

  async function toggleActionPlanStatus(actionId: string, currentStatus: string | null | undefined) {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    const res = await fetch(`/api/v1/observations/${id}/actions/${actionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) {
      await load();
      showSuccess(`Action plan marked as ${newStatus}!`);
    } else {
      showError("Failed to update action plan status!");
    }
  }

  async function updateRetestStatus(actionId: string, retestValue: "RETEST_DUE" | "PASS" | "FAIL") {
    const res = await fetch(`/api/v1/observations/${id}/actions/${actionId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ retest: retestValue })
    });
    if (res.ok) {
      await load();
      showSuccess(`Retest status updated to ${formatRetest(retestValue)}!`);
    } else {
      showError("Failed to update retest status!");
    }
  }

  async function sendNote() {
    if (!note.trim() || noteSending) return;
    setNoteSending(true);
    try {
      const res = await fetch(`/api/v1/observations/${id}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text: note,
          visibility: noteVis
        })
      });
      if (res.ok) {
        setNote("");
        await load();
        showSuccess("Note added successfully!");
      } else {
        const j = await res.json();
        showError(j.error || "Failed to add note!");
      }
    } catch (error) {
      showError("Failed to add note!");
    } finally {
      setNoteSending(false);
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

  function openChangeRequestDialog() {
    const patch = computeAuditorPatch();
    if (Object.keys(patch).length === 0) {
      setError("No changes detected to request.");
      showInfo("No changes detected to request.");
      return;
    }
    setIsChangeRequestDialogOpen(true);
  }

  async function submitChangeRequest() {
    const patch = computeAuditorPatch();
    if (Object.keys(patch).length === 0) {
      setError("No changes detected to request.");
      showError("No changes detected to request.");
      return;
    }
    const res = await fetch(`/api/v1/observations/${id}/change-requests`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patch, comment: changeRequestComment || undefined })
    });
    const j = await res.json();
    if (!res.ok) {
      const errorMessage = j.error || "Failed to submit change request";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Change request submitted successfully!");
      setIsChangeRequestDialogOpen(false);
      setChangeRequestComment("");
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

  // Wait for both session and observation to load
  if (!session || !role || !o) return (
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

  const isCfo = isCFO(role);
  const isAuditHeadRole = isAuditHead(role);
  const canOverride = isCfo;
  const isAuditorRole = isAuditorOrAuditHead(role) && !isAuditHeadRole; // Pure auditor (not audit head)
  const canApprove = canApproveObservations(role);
  const isAuditHeadForThisAudit = isAuditHeadRole && o.audit?.auditHeadId === session.user.id;
  const isAuditLocked = !!o.audit?.isLocked;
  const canPublish = isCfo || (isAuditHeadForThisAudit && !isAuditLocked);
  const canSubmit = isAuditorOrAuditHead(role);
  const canRetest = isAuditorOrAuditHead(role);
  const canUploadAnnex = isAuditorOrAuditHead(role);
  const canUploadMgmt = isAuditorOrAuditHead(role) || isAuditee(role);
  const auditorLockedByApproval = isAuditorRole && o.approvalStatus === "APPROVED";
  const canSave = canOverride || (!auditorLockedByApproval);
  const canDelete = isCfo || (isAuditHeadRole && !o.audit.isLocked);
  const canManageAssignments = isCFOOrCXOTeam(role) || isAuditHead(role) || isAuditorOrAuditHead(role);

  // Debug: Verify button conditions
  console.log('[Request Change Button] isAuditorRole:', isAuditorRole, 'approvalStatus:', o.approvalStatus, 'shouldShow:', isAuditorRole && o.approvalStatus === 'APPROVED');

  const getApprovalBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "DRAFT": return "outline";
      case "SUBMITTED": return "secondary";
      case "APPROVED": return "default";
      case "REJECTED": return "destructive";
      default: return "outline";
    }
  };
  const approvalLabel = humanizeStatus(o.approvalStatus);
  const workflowLabel = humanizeStatus(o.currentStatus);
  const riskLabel = o.riskCategory ? `Risk ${o.riskCategory}` : "Unclassified";
  const targetDateLabel = formatDate(o.targetDate);
  const publishedLabel = o.isPublished ? "Published" : "Unpublished";
  const retestLabel = o.reTestResult ? formatRetest(o.reTestResult) : "Not recorded";


  return (
    <PageContainer className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-texSec)' }}>
        <span
          className="hover:underline cursor-pointer"
          onClick={() => router.push('/audits')}
        >
          Audit #{o.audit.id}
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span
          className="hover:underline cursor-pointer"
          onClick={() => router.push('/observations')}
        >
          Observations
        </span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>OBS-{id}</span>
      </div>

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

      {/* Header Section */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-3xl" style={{ color: 'var(--c-texPri)' }}>
                {o.observationText}
              </h1>
              {o.approvalStatus === 'APPROVED' && (
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: 'var(--c-palUiGre100)',
                    color: 'var(--c-palUiGre700)'
                  }}
                >
                  Approved
                </span>
              )}
              {o.isPublished && (
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background: 'var(--c-palUiBlu100)',
                    color: 'var(--c-palUiBlu700)'
                  }}
                >
                  Published
                </span>
              )}
              {o.currentStatus && (
                <span
                  className="px-2 py-1 rounded text-xs"
                  style={{
                    background:
                      o.currentStatus === 'PENDING_MR' ? 'var(--c-palUiYel100)' :
                      o.currentStatus === 'MR_UNDER_REVIEW' ? 'var(--c-palUiBlu100)' :
                      o.currentStatus === 'REFERRED_BACK' ? 'var(--c-palUiRed100)' :
                      o.currentStatus === 'OBSERVATION_FINALISED' ? 'var(--c-palUiGre100)' :
                      o.currentStatus === 'RESOLVED' ? 'var(--c-palUiGre100)' :
                      'var(--c-palUiBlu100)',
                    color:
                      o.currentStatus === 'PENDING_MR' ? 'var(--c-palUiYel700)' :
                      o.currentStatus === 'MR_UNDER_REVIEW' ? 'var(--c-palUiBlu700)' :
                      o.currentStatus === 'REFERRED_BACK' ? 'var(--c-palUiRed700)' :
                      o.currentStatus === 'OBSERVATION_FINALISED' ? 'var(--c-palUiGre700)' :
                      o.currentStatus === 'RESOLVED' ? 'var(--c-palUiGre700)' :
                      'var(--c-palUiBlu700)'
                  }}
                >
                  {o.currentStatus === 'PENDING_MR' ? 'Pending MR' :
                   o.currentStatus === 'MR_UNDER_REVIEW' ? 'MR Under Review' :
                   o.currentStatus === 'REFERRED_BACK' ? 'Referred Back' :
                   o.currentStatus === 'OBSERVATION_FINALISED' ? 'Observation Finalised' :
                   o.currentStatus === 'RESOLVED' ? 'Resolved' :
                   o.currentStatus}
                </span>
              )}
            </div>
            <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
              OBS-{id} • Created on {new Date(o.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
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

        <Separator />

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              className="h-8 px-3"
              onClick={save}
              disabled={isFieldDisabled("observationText")}
              style={{
                background: isFieldDisabled("observationText") ? 'var(--c-texTer)' : 'var(--c-palUiBlu600)',
                color: 'white',
                cursor: isFieldDisabled("observationText") ? 'not-allowed' : 'pointer',
                opacity: isFieldDisabled("observationText") ? 0.5 : 1
              }}
            >
              Save
            </Button>

            {/* Publish / Unpublish button */}
            {canPublish && (
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={() => publish(!o.isPublished)}
                disabled={!o.isPublished && o.approvalStatus !== 'APPROVED'}
                title={!o.isPublished && o.approvalStatus !== 'APPROVED'
                  ? 'Approve the observation before publishing.'
                  : undefined}
                style={{
                  background: o.isPublished ? 'var(--cd-palOra500)' : 'var(--c-palUiGre600)',
                  color: 'white',
                  opacity: !o.isPublished && o.approvalStatus !== 'APPROVED' ? 0.5 : 1,
                  cursor: !o.isPublished && o.approvalStatus !== 'APPROVED' ? 'not-allowed' : 'pointer'
                }}
              >
                {o.isPublished ? 'Unpublish' : 'Publish'}
              </Button>
            )}

            {/* Audit Head / CFO approval buttons */}
            {canApprove && (
              <>
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => approve(true)}
                  disabled={o.approvalStatus === 'APPROVED'}
                  style={{
                    background: o.approvalStatus === 'APPROVED' ? 'var(--c-palUiGre700)' : 'var(--c-palUiGre600)',
                    color: 'white',
                    opacity: o.approvalStatus === 'APPROVED' ? 0.7 : 1
                  }}
                >
                  {o.approvalStatus === 'APPROVED' ? 'Approved' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => approve(false)}
                  disabled={!(o.approvalStatus === 'SUBMITTED' || o.approvalStatus === 'APPROVED')}
                  title={o.approvalStatus === 'DRAFT'
                    ? 'Submit the observation before rejecting.'
                    : undefined}
                  style={{
                    background: 'var(--c-palUiRed600)',
                    color: 'white',
                    opacity: !(o.approvalStatus === 'SUBMITTED' || o.approvalStatus === 'APPROVED') ? 0.5 : 1,
                    cursor: !(o.approvalStatus === 'SUBMITTED' || o.approvalStatus === 'APPROVED') ? 'not-allowed' : 'pointer'
                  }}
                >
                  Reject
                </Button>
              </>
            )}

            {/* Submit / Resubmit for Approval button for auditors */}
            {isAuditorOrAuditHead(role) && (o.approvalStatus === 'DRAFT' || o.approvalStatus === 'REJECTED') && (
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={submitForApproval}
                style={{
                  background: 'var(--c-palUiBlu600)',
                  color: 'white'
                }}
              >
                {o.approvalStatus === 'REJECTED' ? 'Resubmit for Approval' : 'Submit for Approval'}
              </Button>
            )}

            {/* Request Change button for auditors with approved observations */}
            {isAuditorRole && o.approvalStatus === 'APPROVED' && (
              <Button
                size="sm"
                className="h-8 px-3"
                onClick={openChangeRequestDialog}
                style={{
                  background: 'var(--cd-palOra500)',
                  color: 'white'
                }}
              >
                Request Change
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="gap-2 h-8"
            onClick={deleteObservation}
            style={{ color: 'var(--c-palUiRed600)' }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-error-700 bg-error-50 border border-error-200 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Visual Indicator for Locked Approved Observations */}
      {auditorLockedByApproval && (
        <div className="rounded-lg border px-4 py-3" style={{
          background: 'var(--cl-palOra100)/60',
          borderColor: 'var(--cd-palOra500)'
        }}>
          <div className="flex items-start gap-3" style={{ color: 'var(--cd-palOra500)' }}>
            <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">
                Observation Approved & Locked
              </h4>
              <p className="text-sm">
                This observation has been approved and fields are locked for editing.
                To modify this observation, make your changes and click the
                <strong> "Request Change" </strong> button to submit a change request to the Audit Head.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Two-Column Layout: Main Content + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-4">
        <form onSubmit={save} className="space-y-4">
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

          {/* Auditor Section */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'var(--c-bacSec)' }}>
            <CardHeader
              className="border-b"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <div>
                <h2 className="text-base mb-0" style={{ color: 'var(--c-texPri)' }}>
                  Auditor Section
                </h2>
                <p className="text-xs leading-tight" style={{ color: 'var(--c-texSec)' }}>
                  Information captured by auditors during the audit process
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Observation Text */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="observationText" className="text-xs">
                    Observation Text <span style={{ color: 'var(--c-palUiRed600)' }}>*</span>
                  </Label>
                  {renderLockPill("observationText")}
                </div>
                <textarea
                  id="observationText"
                  className={getFieldClassName("observationText", "min-h-20 resize-none text-sm")}
                  value={draft.observationText}
                  onChange={(e) => setField("observationText", e.target.value)}
                  disabled={isFieldDisabled("observationText")}
                  required
                />
              </div>

              {/* Risks Involved */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="risksInvolved" className="text-xs">Risks Involved</Label>
                  {renderLockPill("risksInvolved")}
                </div>
                <textarea
                  id="risksInvolved"
                  className={getFieldClassName("risksInvolved", "min-h-16 resize-none text-sm")}
                  value={draft.risksInvolved}
                  onChange={(e) => setField("risksInvolved", e.target.value)}
                  disabled={isFieldDisabled("risksInvolved")}
                  placeholder="Describe potential risks..."
                />
              </div>

              {/* Risk Category & Likely Impact */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="riskCategory" className="text-xs">Risk Category</Label>
                    {renderLockPill("riskCategory")}
                  </div>
                  <select
                    id="riskCategory"
                    className={getFieldClassName("riskCategory", "h-9 text-sm appearance-none pr-8")}
                    value={draft.riskCategory}
                    onChange={(e) => setField("riskCategory", e.target.value)}
                    disabled={isFieldDisabled("riskCategory")}
                  >
                    <option value="">Select</option>
                    <option value="A">A - Critical</option>
                    <option value="B">B - High</option>
                    <option value="C">C - Medium</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="likelyImpact" className="text-xs">Likely Impact</Label>
                    {renderLockPill("likelyImpact")}
                  </div>
                  <select
                    id="likelyImpact"
                    className={getFieldClassName("likelyImpact", "h-9 text-sm appearance-none pr-8")}
                    value={draft.likelyImpact}
                    onChange={(e) => setField("likelyImpact", e.target.value)}
                    disabled={isFieldDisabled("likelyImpact")}
                  >
                    <option value="">Select</option>
                    <option value="LOCAL">Local</option>
                    <option value="ORG_WIDE">Org-wide</option>
                  </select>
                </div>
              </div>

              {/* Concerned Process & Auditor */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="concernedProcess" className="text-xs">Concerned Process</Label>
                    {renderLockPill("concernedProcess")}
                  </div>
                  <select
                    id="concernedProcess"
                    className={getFieldClassName("concernedProcess", "h-9 text-sm appearance-none pr-8")}
                    value={draft.concernedProcess}
                    onChange={(e) => setField("concernedProcess", e.target.value)}
                    disabled={isFieldDisabled("concernedProcess")}
                  >
                    <option value="">Select</option>
                    <option value="O2C">O2C - Order to Cash</option>
                    <option value="P2P">P2P - Procure to Pay</option>
                    <option value="R2R">R2R - Record to Report</option>
                    <option value="INVENTORY">Inventory</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auditorPerson" className="text-xs">Auditor</Label>
                    {renderLockPill("auditorPerson")}
                  </div>
                  <select
                    id="auditorPerson"
                    className={getFieldClassName("auditorPerson", "h-9 text-sm appearance-none pr-8")}
                    value={draft.auditorPerson}
                    onChange={(e) => setField("auditorPerson", e.target.value)}
                    disabled={isFieldDisabled("auditorPerson")}
                  >
                    <option value="">Select auditor...</option>
                    {auditors.map((auditor) => (
                      <option key={auditor.id} value={auditor.name || auditor.email || ""}>
                        {auditor.name || auditor.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Assigned Auditees */}
              <div className="space-y-1.5">
                <Label className="text-xs">Assigned Auditees</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {o.assignments?.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-sm"
                      style={{
                        background: 'var(--c-palUiBlu100)',
                        color: 'var(--c-palUiBlu700)'
                      }}
                    >
                      <span>{assignment.auditee.name || assignment.auditee.email}</span>
                      {!isFieldDisabled("observationText") && (
                        <button
                          type="button"
                          onClick={() => removeAuditee(assignment.id)}
                          className="hover:opacity-70"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!isFieldDisabled("observationText") && (
                  <div className="flex gap-2">
                    <select
                      className={cn(BASE_FIELD_CLASS, "h-9 text-sm flex-1")}
                      value={selectedAuditee}
                      onChange={(e) => setSelectedAuditee(e.target.value)}
                    >
                      <option value="">Select auditee to assign...</option>
                      {auditees.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={assignAuditee}
                      disabled={!selectedAuditee}
                      style={{
                        background: selectedAuditee ? 'var(--c-palUiBlu600)' : 'var(--c-texTer)',
                        color: 'white'
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                )}
              </div>

              {/* Auditor Response to Auditee Remarks */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auditorResponse" className="text-xs">Auditor Response to Auditee Remarks</Label>
                  {renderLockPill("auditorResponseToAuditee")}
                </div>
                <textarea
                  id="auditorResponse"
                  className={getFieldClassName("auditorResponseToAuditee", "min-h-16 resize-none text-sm")}
                  value={draft.auditorResponseToAuditee}
                  onChange={(e) => setField("auditorResponseToAuditee", e.target.value)}
                  disabled={isFieldDisabled("auditorResponseToAuditee")}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auditee Section */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'var(--c-bacPri)' }}>
            <CardHeader
              className="border-b"
              style={{ borderColor: 'var(--c-borPri)' }}
            >
              <div>
                <h2 className="text-base mb-0" style={{ color: 'var(--c-texPri)' }}>
                  Auditee Section
                </h2>
                <p className="text-xs leading-tight" style={{ color: 'var(--c-texSec)' }}>
                  Response and action plans from assigned auditees
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {/* Auditee Person Tier 1 & 2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auditeePerson1" className="text-xs">Auditee Person (Tier 1)</Label>
                    {renderLockPill("auditeePersonTier1")}
                  </div>
                  <input
                    id="auditeePerson1"
                    className={getFieldClassName("auditeePersonTier1", "h-9 text-sm")}
                    value={draft.auditeePersonTier1}
                    onChange={(e) => setField("auditeePersonTier1", e.target.value)}
                    disabled={isFieldDisabled("auditeePersonTier1")}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="auditeePerson2" className="text-xs">Auditee Person (Tier 2)</Label>
                    {renderLockPill("auditeePersonTier2")}
                  </div>
                  <input
                    id="auditeePerson2"
                    className={getFieldClassName("auditeePersonTier2", "h-9 text-sm")}
                    value={draft.auditeePersonTier2}
                    onChange={(e) => setField("auditeePersonTier2", e.target.value)}
                    disabled={isFieldDisabled("auditeePersonTier2")}
                  />
                </div>
              </div>

              {/* Auditee Feedback */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auditeeFeedback" className="text-xs">Auditee Feedback</Label>
                  {renderLockPill("auditeeFeedback")}
                </div>
                <textarea
                  id="auditeeFeedback"
                  className={getFieldClassName("auditeeFeedback", "min-h-20 resize-none text-sm")}
                  value={draft.auditeeFeedback}
                  onChange={(e) => setField("auditeeFeedback", e.target.value)}
                  disabled={isFieldDisabled("auditeeFeedback")}
                  placeholder="Monitoring system procurement in progress, expected implementation in Q1 2025"
                />
              </div>

              {/* Action Plans */}
              <div className="space-y-3 pt-4 mt-4 border-t" style={{ borderColor: 'var(--c-borPri)' }}>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Action Plans</Label>
                  <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add Plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Add Action Plan</DialogTitle>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="plan-desc">Plan Description</Label>
                          <textarea
                            id="plan-desc"
                            className={cn(BASE_FIELD_CLASS, "min-h-[100px] resize-none")}
                            placeholder="Describe the action plan..."
                            value={apPlan}
                            onChange={(e) => setApPlan(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="plan-owner">Owner</Label>
                          <input
                            id="plan-owner"
                            className={BASE_FIELD_CLASS}
                            placeholder="Plan owner..."
                            value={apOwner}
                            onChange={(e) => setApOwner(e.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="plan-date">Due Date</Label>
                          <input
                            id="plan-date"
                            type="date"
                            className={BASE_FIELD_CLASS}
                            value={apDate}
                            onChange={(e) => setApDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={addActionPlan}
                          disabled={!apPlan.trim()}
                        >
                          Add Plan
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Action Plans List */}
                <div className="space-y-2">
                  {o.actionPlans.map((ap) => (
                    <div
                      key={ap.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                      style={{
                        borderColor: 'var(--c-borPri)',
                        background: 'white'
                      }}
                    >
                      {/* Checkbox */}
                      <Checkbox
                        checked={ap.status === "Completed"}
                        onCheckedChange={() => toggleActionPlanStatus(ap.id, ap.status)}
                        className="flex-shrink-0"
                      />

                      {/* Plan Details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="font-medium text-sm" style={{ color: 'var(--c-texPri)' }}>
                          {ap.plan}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {ap.owner && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded" style={{
                              background: 'var(--c-palUiBlu100)',
                              color: 'var(--c-palUiBlu700)'
                            }}>
                              {ap.owner}
                            </span>
                          )}
                          {ap.targetDate && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded" style={{
                              background: 'var(--c-bacSec)',
                              color: 'var(--c-texSec)'
                            }}>
                              Due: {new Date(ap.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Retest Buttons - Only for Auditor/Audit Head */}
                      {isAuditorOrAuditHead(role) && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Button
                            type="button"
                            size="sm"
                            variant={ap.retest === "RETEST_DUE" ? "default" : "outline"}
                            onClick={() => updateRetestStatus(ap.id, "RETEST_DUE")}
                            className="text-xs h-7 px-2"
                            style={ap.retest === "RETEST_DUE" ? {
                              background: 'var(--c-palUiYel600)',
                              color: 'white',
                              borderColor: 'var(--c-palUiYel600)'
                            } : {}}
                          >
                            Retest Due
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={ap.retest === "PASS" ? "default" : "outline"}
                            onClick={() => updateRetestStatus(ap.id, "PASS")}
                            className="text-xs h-7 px-2"
                            style={ap.retest === "PASS" ? {
                              background: 'var(--c-palUiGre600)',
                              color: 'white',
                              borderColor: 'var(--c-palUiGre600)'
                            } : {}}
                          >
                            Pass
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={ap.retest === "FAIL" ? "default" : "outline"}
                            onClick={() => updateRetestStatus(ap.id, "FAIL")}
                            className="text-xs h-7 px-2"
                            style={ap.retest === "FAIL" ? {
                              background: 'var(--c-palUiRed600)',
                              color: 'white',
                              borderColor: 'var(--c-palUiRed600)'
                            } : {}}
                          >
                            Fail
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                  {o.actionPlans.length === 0 && (
                    <div className="text-center py-4 text-xs" style={{ color: 'var(--c-texSec)' }}>
                      No action plans yet
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CFO Field Unlock Controls */}
          {canOverride && o.lockedFields && o.lockedFields.length > 0 && (
            <Card style={{ borderColor: 'var(--cl-palOra100)', background: 'var(--cl-palOra100)' }}>
              <CardContent className="p-4">
                <div className="text-sm font-medium" style={{ color: 'var(--cd-palOra500)' }}>
                  Locked fields ({o.lockedFields.length}):
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {o.lockedFields.map((field) => (
                    <div
                      key={field}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium"
                      style={{
                        background: 'var(--ca-palUiBlu100)',
                        color: 'var(--c-palUiBlu700)'
                      }}
                    >
                      <span>{getFieldLabel(field)}</span>
                      <button
                        type="button"
                        className="transition-colors hover:opacity-70"
                        style={{ color: 'var(--cd-palOra500)' }}
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
                    size="sm"
                    onClick={() => lock(o.lockedFields!, false)}
                    style={{
                      background: 'var(--c-palUiBlu600)',
                      color: 'white'
                    }}
                  >
                    <Unlock className="h-4 w-4 mr-1" />
                    Unlock all
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </form>

      {/* Attachments Section */}
      <Card style={{ borderColor: 'var(--c-borPri)', background: 'var(--c-bacSec)' }}>
        <CardHeader
          className="border-b"
          style={{ borderColor: 'var(--c-borPri)' }}
        >
          <div>
            <h2 className="text-base mb-0" style={{ color: 'var(--c-texPri)' }}>
              Attachments
            </h2>
            <p className="text-xs leading-tight" style={{ color: 'var(--c-texSec)' }}>
              Supporting documents and evidence captured for this observation
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 p-4 md:grid-cols-2">
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
        </CardContent>
      </Card>

        </div>
        {/* End of left column */}

        {/* Right Column - Sidebar */}
        <div className="lg:col-span-1 space-y-4">

          {/* Running Notes Widget */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'white' }}>
            <CardHeader className="border-b pb-3" style={{ borderColor: 'var(--c-borPri)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--c-texPri)' }}>
                Running Notes
              </h3>
            </CardHeader>
            <CardContent className="p-0">
              {/* Messages Area */}
              <div className="p-3 space-y-3 max-h-96 overflow-y-auto">
                {o.notes.length > 0 ? (
                  o.notes.map((n) => (
                    <div key={n.id} className="flex gap-2">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarFallback style={{ background: 'var(--c-palUiBlu600)', color: 'white' }}>
                          {getInitials(n.actor.name, n.actor.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold" style={{ color: 'var(--c-texPri)' }}>
                            {n.actor.name || n.actor.email || "User"}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                            {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div
                          className="rounded-lg px-3 py-2 text-sm"
                          style={{
                            background: 'var(--c-bacSec)',
                            color: 'var(--c-texPri)',
                            border: '1px solid var(--c-borPri)'
                          }}
                        >
                          {n.text}
                        </div>
                        {n.visibility === "INTERNAL" && (
                          <Badge variant="secondary" className="text-xs mt-1">Internal</Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-center py-8" style={{ color: 'var(--c-texSec)' }}>No messages yet</p>
                )}
              </div>

              {/* Message Input */}
              <div className="border-t p-3" style={{ borderColor: 'var(--c-borPri)' }}>
                <div className="flex gap-2">
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback style={{ background: 'var(--c-palUiBlu600)', color: 'white' }}>
                      {getInitials(session?.user?.name, session?.user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex gap-2">
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendNote();
                        }
                      }}
                      placeholder="Type your message..."
                      className="flex-1 resize-none rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2"
                      style={{
                        borderColor: 'var(--c-borPri)',
                        background: 'var(--c-bacPri)',
                        color: 'var(--c-texPri)'
                      }}
                      rows={2}
                      disabled={noteSending}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={sendNote}
                      disabled={!note.trim() || noteSending}
                      className="px-3"
                      style={{
                        background: 'var(--c-palUiBlu600)',
                        color: 'white'
                      }}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Requests Widget */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'white' }}>
            <CardHeader className="border-b pb-3" style={{ borderColor: 'var(--c-borPri)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--c-texPri)' }}>
                Change Requests
              </h3>
            </CardHeader>
            <CardContent className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {changeRequests.length > 0 ? (
                changeRequests.map((cr) => (
                  <div key={cr.id} className="flex gap-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--c-borSec)' }}>
                    <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-texSec)' }} />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold" style={{ color: 'var(--c-texPri)' }}>
                          {cr.requester.name || cr.requester.email || "User"}
                        </span>
                        <Badge
                          variant={cr.status === "APPROVED" ? "default" : cr.status === "DENIED" ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {cr.status}
                        </Badge>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                        {new Date(cr.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      {cr.comment && (
                        <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>{cr.comment}</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--c-texSec)' }}>No change requests</p>
              )}
            </CardContent>
          </Card>

          {/* Approval History Widget */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'white' }}>
            <CardHeader className="border-b pb-3" style={{ borderColor: 'var(--c-borPri)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--c-texPri)' }}>
                Approval History
              </h3>
            </CardHeader>
            <CardContent className="p-3 space-y-3 max-h-96 overflow-y-auto">
              {o.approvals.length > 0 ? (
                o.approvals.map((ap) => {
                  // Determine display properties based on approval status
                  const getStatusDisplay = () => {
                    switch (ap.status) {
                      case "APPROVED":
                        return {
                          bgColor: 'var(--c-palUiGre100)',
                          icon: <CheckCircle className="h-5 w-5" style={{ color: 'var(--c-palUiGre700)' }} />,
                          title: "Observation Approved",
                          description: "approved the observation"
                        };
                      case "REJECTED":
                        return {
                          bgColor: 'var(--c-palUiRed100)',
                          icon: <XCircle className="h-5 w-5" style={{ color: 'var(--c-palUiRed700)' }} />,
                          title: "Observation Rejected",
                          description: "rejected the observation"
                        };
                      case "SUBMITTED":
                        return {
                          bgColor: 'var(--c-palUiBlu100)',
                          icon: <Clock className="h-5 w-5" style={{ color: 'var(--c-palUiBlu700)' }} />,
                          title: "Observation Submitted",
                          description: "submitted the observation for approval"
                        };
                      default:
                        return {
                          bgColor: 'var(--c-bacSec)',
                          icon: <Clock className="h-5 w-5" style={{ color: 'var(--c-texSec)' }} />,
                          title: `Observation ${ap.status}`,
                          description: `performed action: ${ap.status}`
                        };
                    }
                  };

                  const display = getStatusDisplay();

                  return (
                    <div key={ap.id} className="flex gap-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--c-borSec)' }}>
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: display.bgColor }}
                      >
                        {display.icon}
                      </div>
                      <div className="flex-1 space-y-1">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--c-texPri)' }}>
                          {display.title}
                        </h4>
                        <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                          {new Date(ap.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                          {ap.actor.name || ap.actor.email || "User"} {display.description}.
                        </p>
                        {ap.comment && (
                          <p className="text-xs italic" style={{ color: 'var(--c-texSec)' }}>"{ap.comment}"</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-center py-4" style={{ color: 'var(--c-texSec)' }}>No approvals yet</p>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail Widget */}
          <Card style={{ borderColor: 'var(--c-borPri)', background: 'white' }}>
            <CardHeader className="border-b pb-3" style={{ borderColor: 'var(--c-borPri)' }}>
              <h3 className="text-base font-semibold" style={{ color: 'var(--c-texPri)' }}>
                Audit Trail
              </h3>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="space-y-3">
                {/* Creation Event */}
                <div className="flex gap-3 pb-3 border-b" style={{ borderColor: 'var(--c-borSec)' }}>
                  <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-texSec)' }} />
                  <div className="flex-1 space-y-1">
                    <h4 className="text-sm font-semibold" style={{ color: 'var(--c-texPri)' }}>
                      Observation Created
                    </h4>
                    <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                      {new Date(o.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                      Created by {session?.user?.name || session?.user?.email || "User"}.
                    </p>
                  </div>
                </div>

                {/* Approval Events */}
                {o.approvals.map((ap) => {
                  // Get appropriate description based on status
                  const getDescription = () => {
                    switch (ap.status) {
                      case 'APPROVED':
                        return `Approved by ${ap.actor.name || ap.actor.email || "User"}.`;
                      case 'REJECTED':
                        return `Rejected by ${ap.actor.name || ap.actor.email || "User"}.`;
                      case 'SUBMITTED':
                        return `Submitted for approval by ${ap.actor.name || ap.actor.email || "User"}.`;
                      default:
                        return `${ap.status} by ${ap.actor.name || ap.actor.email || "User"}.`;
                    }
                  };

                  return (
                    <div key={ap.id} className="flex gap-3 pb-3 border-b last:border-0" style={{ borderColor: 'var(--c-borSec)' }}>
                      {ap.status === 'APPROVED' ? (
                        <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-palUiGre700)' }} />
                      ) : ap.status === 'REJECTED' ? (
                        <XCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-palUiRed700)' }} />
                      ) : ap.status === 'SUBMITTED' ? (
                        <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-palUiBlu700)' }} />
                      ) : (
                        <Clock className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-texSec)' }} />
                      )}
                      <div className="flex-1 space-y-1">
                        <h4 className="text-sm font-semibold" style={{ color: 'var(--c-texPri)' }}>
                          Observation {ap.status === 'APPROVED' ? 'Approved' : ap.status === 'REJECTED' ? 'Rejected' : ap.status}
                        </h4>
                        <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                          {new Date(ap.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                          {getDescription()}
                        </p>
                      </div>
                    </div>
                  );
                })}

                {/* Published Event */}
                {o.isPublished && (
                  <div className="flex gap-3">
                    <Send className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--c-palUiBlu700)' }} />
                    <div className="flex-1 space-y-1">
                      <h4 className="text-sm font-semibold" style={{ color: 'var(--c-texPri)' }}>
                        Observation Published
                      </h4>
                      <p className="text-xs" style={{ color: 'var(--c-texSec)' }}>
                        Current status
                      </p>
                      <p className="text-sm" style={{ color: 'var(--c-texPri)' }}>
                        Published to stakeholders.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

        </div>
        {/* End of right column */}

      </div>
      {/* End of two-column grid */}

      {/* Change Request Dialog */}
      <Dialog open={isChangeRequestDialogOpen} onOpenChange={setIsChangeRequestDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Request Change to Approved Observation</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <p className="text-sm" style={{ color: 'var(--c-texSec)' }}>
                This observation is approved and locked. You can request changes from the Audit Head.
                Your current field edits will be included in the change request.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="change-comment">Comment (Optional)</Label>
              <textarea
                id="change-comment"
                className={cn(BASE_FIELD_CLASS, "min-h-[120px] resize-none")}
                placeholder="Explain why these changes are needed..."
                value={changeRequestComment}
                onChange={(e) => setChangeRequestComment(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsChangeRequestDialogOpen(false);
                setChangeRequestComment("");
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={submitChangeRequest}
              style={{
                background: 'var(--cd-palOra500)',
                color: 'white'
              }}
            >
              Submit Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </PageContainer>
  );
}