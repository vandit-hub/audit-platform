"use client";

import React, { useEffect, useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";

type Plant = { id: string; code: string; name: string };
type Attachment = { id: string; kind: "ANNEXURE" | "MGMT_DOC"; fileName: string; key: string };
type Approval = { id: string; status: "SUBMITTED" | "APPROVED" | "REJECTED"; comment?: string | null; actor: { email?: string | null; name?: string | null } ; createdAt: string };
type Note = { id: string; text: string; visibility: "INTERNAL" | "ALL"; actor: { email?: string | null; name?: string | null }; createdAt: string };
type ActionPlan = { id: string; plan: string; owner?: string | null; targetDate?: string | null; status?: string | null; createdAt: string };
type Observation = {
  id: string;
  plant: Plant;
  audit: { id: string; startDate: string | null; endDate: string | null };
  observationText: string;
  risksInvolved?: string | null;
  riskCategory?: "A" | "B" | "C" | null;
  likelyImpact?: "LOCAL" | "ORG_WIDE" | null;
  concernedProcess?: "O2C" | "P2P" | "R2R" | "INVENTORY" | null;
  auditorPerson?: string | null;
  auditeePersonTier1?: string | null;
  auditeePersonTier2?: string | null;
  auditeeFeedback?: string | null;
  hodActionPlan?: string | null;
  targetDate?: string | null;
  personResponsibleToImplement?: string | null;
  currentStatus: "PENDING" | "IN_PROGRESS" | "RESOLVED";
  implementationDate?: string | null;
  reTestResult?: "PASS" | "FAIL" | null;
  approvalStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  isPublished: boolean;
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

  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);

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
        hodActionPlan: j.observation.hodActionPlan ?? "",
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
    const comment = window.prompt("Optional comment:");
    const res = await fetch(`/api/v1/observations/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve: isApprove, comment: comment || undefined })
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
    const res = await fetch(`/api/v1/observations/${id}/lock`, {
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

  async function addActionPlan() {
    if (!apPlan.trim()) return;
    const res = await fetch(`/api/v1/observations/${id}/actions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan: apPlan,
        owner: apOwner || undefined,
        targetDate: apDate ? new Date(apDate).toISOString() : undefined,
        status: apStatus || undefined
      })
    });
    if (res.ok) {
      setApPlan("");
      setApOwner("");
      setApDate("");
      setApStatus("");
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

  if (!o) return <div>Loading…</div>;

  const isAdmin = role === "ADMIN";
  const isAuditor = role === "AUDITOR";
  const canApprove = isAdmin;
  const canPublish = isAdmin;
  const canSubmit = isAdmin || isAuditor;
  const canRetest = isAdmin || isAuditor;
  const canUploadAnnex = isAdmin || isAuditor;
  const canUploadMgmt = isAdmin || isAuditor || role === "AUDITEE";
  const auditorLockedByApproval = isAuditor && o.approvalStatus === "APPROVED";
  const canSave = isAdmin || (!auditorLockedByApproval);

  return (
    <div className="space-y-6">
      <button className="text-sm underline" onClick={() => router.back()}>&larr; Back</button>
      <h1 className="text-2xl font-semibold">Observation — {o.plant.code} {o.plant.name}</h1>
      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

      <form onSubmit={save} className="bg-white rounded p-4 shadow space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Observation Text *</label>
            <textarea className="border rounded px-3 py-2 w-full h-24" value={draft.observationText} onChange={(e) => setField("observationText", e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Risks Involved</label>
            <textarea className="border rounded px-3 py-2 w-full h-24" value={draft.risksInvolved} onChange={(e) => setField("risksInvolved", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Risk Category</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.riskCategory} onChange={(e) => setField("riskCategory", e.target.value)}>
              <option value="">Select</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Likely Impact</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.likelyImpact} onChange={(e) => setField("likelyImpact", e.target.value)}>
              <option value="">Select</option>
              <option value="LOCAL">Local</option>
              <option value="ORG_WIDE">Org-wide</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Concerned Process</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.concernedProcess} onChange={(e) => setField("concernedProcess", e.target.value)}>
              <option value="">Select</option>
              <option value="O2C">O2C</option>
              <option value="P2P">P2P</option>
              <option value="R2R">R2R</option>
              <option value="INVENTORY">Inventory</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Auditor Person</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.auditorPerson} onChange={(e) => setField("auditorPerson", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Auditee Person (Tier 1)</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.auditeePersonTier1} onChange={(e) => setField("auditeePersonTier1", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Auditee Person (Tier 2)</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.auditeePersonTier2} onChange={(e) => setField("auditeePersonTier2", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Auditee Feedback</label>
            <textarea className="border rounded px-3 py-2 w-full" value={draft.auditeeFeedback} onChange={(e) => setField("auditeeFeedback", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">HOD Action Plan</label>
            <textarea className="border rounded px-3 py-2 w-full" value={draft.hodActionPlan} onChange={(e) => setField("hodActionPlan", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Target Date</label>
            <input className="border rounded px-3 py-2 w-full" type="date" value={draft.targetDate} onChange={(e) => setField("targetDate", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Person Responsible</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.personResponsibleToImplement} onChange={(e) => setField("personResponsibleToImplement", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Current Status</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.currentStatus} onChange={(e) => setField("currentStatus", e.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="bg-black text-white px-4 py-2 rounded">Save</button>
          {auditorLockedByApproval && (
            <button type="button" className="border px-4 py-2 rounded" onClick={requestChange}>
              Request change (Auditor)
            </button>
          )}
          {canSubmit && <button type="button" className="border px-4 py-2 rounded" onClick={submitForApproval}>Submit for approval</button>}
          {canApprove && (
            <>
              <button type="button" className="border px-4 py-2 rounded" onClick={() => approve(true)}>Approve</button>
              <button type="button" className="border px-4 py-2 rounded" onClick={() => approve(false)}>Reject</button>
            </>
          )}
          {canPublish && (
            <button type="button" className="border px-4 py-2 rounded" onClick={() => publish(!o.isPublished)}>
              {o.isPublished ? "Unpublish" : "Publish"}
            </button>
          )}
          {canRetest && (
            <>
              <button type="button" className="border px-4 py-2 rounded" onClick={() => retest("PASS")}>Retest: Pass</button>
              <button type="button" className="border px-4 py-2 rounded" onClick={() => retest("FAIL")}>Retest: Fail</button>
            </>
          )}
          {isAdmin && (
            <button type="button" className="border px-4 py-2 rounded" onClick={() => lock(["observationText","riskCategory"], true)}>Lock sample fields</button>
          )}
        </div>
      </form>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <h2 className="font-medium">Attachments</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-2">Annexures ({o.attachments.filter(a => a.kind === "ANNEXURE").length})</div>
            <ul className="text-sm space-y-1 mb-3">
              {o.attachments.filter(a => a.kind === "ANNEXURE").map(a => (
                <li key={a.id}><a href={`/api/v1/observations/${id}/attachments/${a.id}/download`} className="underline">{a.fileName}</a></li>
              ))}
            </ul>
            {canUploadAnnex && (
              <div className="flex gap-2">
                <input type="file" onChange={(e) => setFileA(e.target.files?.[0] || null)} />
                <button className="border px-3 py-2 rounded" onClick={() => upload("ANNEXURE")} disabled={!fileA}>Upload</button>
              </div>
            )}
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Management Docs ({o.attachments.filter(a => a.kind === "MGMT_DOC").length})</div>
            <ul className="text-sm space-y-1 mb-3">
              {o.attachments.filter(a => a.kind === "MGMT_DOC").map(a => (
                <li key={a.id}><a href={`/api/v1/observations/${id}/attachments/${a.id}/download`} className="underline">{a.fileName}</a></li>
              ))}
            </ul>
            {canUploadMgmt && (
              <div className="flex gap-2">
                <input type="file" onChange={(e) => setFileM(e.target.files?.[0] || null)} />
                <button className="border px-3 py-2 rounded" onClick={() => upload("MGMT_DOC")} disabled={!fileM}>Upload</button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <h2 className="font-medium">Notes ({o.notes.length})</h2>
        <div className="flex gap-2 mb-3">
          <textarea className="border rounded px-3 py-2 flex-1" placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)} />
          <select className="border rounded px-3 py-2" value={noteVis} onChange={(e) => setNoteVis(e.target.value as "ALL" | "INTERNAL")}>
            <option value="ALL">All</option>
            <option value="INTERNAL">Internal</option>
          </select>
          <button className="border px-3 py-2 rounded" onClick={addNote}>Add</button>
        </div>
        <ul className="text-sm space-y-2">
          {o.notes.map(n => (
            <li key={n.id} className="border-b pb-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{n.actor.email ?? n.actor.name ?? "User"}</span>
                <span className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()} · {n.visibility}</span>
              </div>
              <div>{n.text}</div>
            </li>
          ))}
          {o.notes.length === 0 && <li className="text-gray-500">No notes yet.</li>}
        </ul>
      </div>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <h2 className="font-medium">Action Plans ({o.actionPlans.length})</h2>
        <div className="grid sm:grid-cols-4 gap-2 mb-3">
          <input className="border rounded px-3 py-2" placeholder="Plan..." value={apPlan} onChange={(e) => setApPlan(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Owner" value={apOwner} onChange={(e) => setApOwner(e.target.value)} />
          <input className="border rounded px-3 py-2" type="date" value={apDate} onChange={(e) => setApDate(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Status" value={apStatus} onChange={(e) => setApStatus(e.target.value)} />
          <button className="border px-3 py-2 rounded" onClick={addActionPlan}>Add Action Plan</button>
        </div>
        <ul className="text-sm space-y-2">
          {o.actionPlans.map(ap => (
            <li key={ap.id} className="border rounded p-2">
              <div className="font-medium">{ap.plan}</div>
              <div className="text-gray-600">Owner: {ap.owner ?? "—"} · Target: {ap.targetDate ? new Date(ap.targetDate).toLocaleDateString() : "—"} · Status: {ap.status ?? "—"}</div>
              <div className="text-xs text-gray-500">{new Date(ap.createdAt).toLocaleString()}</div>
            </li>
          ))}
          {o.actionPlans.length === 0 && <li className="text-gray-500">No action plans yet.</li>}
        </ul>
      </div>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <h2 className="font-medium">Approvals ({o.approvals.length})</h2>
        <ul className="text-sm space-y-2">
          {o.approvals.map(ap => (
            <li key={ap.id} className="border rounded p-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{ap.status}</span>
                <span className="text-xs text-gray-500">{new Date(ap.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-gray-600">By: {ap.actor.email ?? ap.actor.name ?? "User"}</div>
              {ap.comment && <div className="text-gray-700">Comment: {ap.comment}</div>}
            </li>
          ))}
          {o.approvals.length === 0 && <li className="text-gray-500">No approval history yet.</li>}
        </ul>
      </div>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <h2 className="font-medium">Change Requests</h2>
        <ul className="text-sm space-y-2">
          {changeRequests.map((cr) => (
            <li key={cr.id} className="border rounded p-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{cr.status}</div>
                  <div className="text-xs text-gray-600">
                    By: {cr.requester.email ?? cr.requester.name ?? "user"} · {new Date(cr.createdAt).toLocaleString()}
                  </div>
                  {cr.comment && <div className="text-xs text-gray-700">Comment: {cr.comment}</div>}
                  {cr.decidedAt && (
                    <div className="text-xs text-gray-600">
                      Decision by: {cr.decidedBy?.email ?? cr.decidedBy?.name ?? "admin"} on {new Date(cr.decidedAt).toLocaleString()}
                      {cr.decisionComment ? ` — ${cr.decisionComment}` : ""}
                    </div>
                  )}
                </div>
                {isAdmin && cr.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button className="border px-2 py-1 rounded" onClick={() => decideChange(cr, true)}>Approve & apply</button>
                    <button className="border px-2 py-1 rounded" onClick={() => decideChange(cr, false)}>Deny</button>
                  </div>
                )}
              </div>
              <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">{JSON.stringify(cr.patch, null, 2)}</pre>
            </li>
          ))}
          {changeRequests.length === 0 && <li className="text-gray-500">No change requests.</li>}
        </ul>
      </div>
    </div>
  );
}