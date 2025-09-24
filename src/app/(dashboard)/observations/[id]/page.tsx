"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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

export default function ObservationDetailPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [o, setO] = useState<Observation | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Editable fields (we'll send only what changed)
  const [draft, setDraft] = useState<any>({});

  // Upload controls
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileM, setFileM] = useState<File | null>(null);

  // Notes
  const [note, setNote] = useState("");
  const [noteVis, setNoteVis] = useState<"ALL" | "INTERNAL">("ALL");

  // Action plan
  const [apPlan, setApPlan] = useState("");
  const [apOwner, setApOwner] = useState("");
  const [apDate, setApDate] = useState("");
  const [apStatus, setApStatus] = useState("");

  async function load() {
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
    } else {
      setError(j.error || "Failed to load");
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);

  function setField(k: string, v: any) { setDraft((d: any) => ({ ...d, [k]: v })); }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
    if (!res.ok) setError(j.error || "Failed to save");
    else await load();
  }

  async function submitForApproval() {
    const res = await fetch(`/api/v1/observations/${id}/submit`, { method: "POST" });
    if (res.ok) await load();
  }

  async function approve(approve: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/approve`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approve })
    });
    if (res.ok) await load();
  }

  async function publish(published: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ published })
    });
    if (res.ok) await load();
  }

  async function retest(result: "PASS" | "FAIL") {
    const res = await fetch(`/api/v1/observations/${id}/retest`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ result })
    });
    if (res.ok) await load();
  }

  async function upload(kind: "ANNEXURE" | "MGMT_DOC", file: File) {
    const pres = await fetch(`/api/v1/observations/${id}/attachments/presign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, fileName: file.name, contentType: file.type || "application/octet-stream" })
    });
    const pj = await pres.json();
    if (!pres.ok) throw new Error(pj.error || "presign failed");
    const put = await fetch(pj.url, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
    if (!put.ok) throw new Error("upload failed");
    const fin = await fetch(`/api/v1/observations/${id}/attachments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, key: pj.key, fileName: file.name, contentType: file.type, size: file.size })
    });
    if (!fin.ok) throw new Error("finalize failed");
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
    }
  }

  async function lock(fields: string[], lock: boolean) {
    const res = await fetch(`/api/v1/observations/${id}/locks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fields, lock })
    });
    if (res.ok) await load();
  }

  async function addAction() {
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
      setApPlan(""); setApOwner(""); setApDate(""); setApStatus("");
      await load();
    }
  }

  async function updateAction(a: ActionPlan, patch: Partial<ActionPlan>) {
    const res = await fetch(`/api/v1/observations/${id}/actions/${a.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        plan: patch.plan,
        owner: patch.owner === undefined ? undefined : (patch.owner ?? null),
        targetDate: patch.targetDate ? new Date(patch.targetDate).toISOString() : (patch.targetDate === null ? null : undefined),
        status: patch.status === undefined ? undefined : (patch.status ?? null)
      })
    });
    if (res.ok) await load();
  }

  async function deleteAction(a: ActionPlan) {
    const res = await fetch(`/api/v1/observations/${id}/actions/${a.id}`, { method: "DELETE" });
    if (res.ok) await load();
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

  return (
    <div className="space-y-6">
      <button className="text-sm underline" onClick={() => router.back()}>&larr; Back</button>
      <h1 className="text-2xl font-semibold">Observation — {o.plant.code} {o.plant.name}</h1>
      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

      <form onSubmit={save} className="bg-white rounded p-4 shadow space-y-3">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Observation (Auditor)</label>
            <textarea className="border rounded px-3 py-2 w-full" rows={3} value={draft.observationText} onChange={(e) => setField("observationText", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Risks Involved (Auditor)</label>
            <textarea className="border rounded px-3 py-2 w-full" rows={3} value={draft.risksInvolved} onChange={(e) => setField("risksInvolved", e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Risk Category (A/B/C)</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.riskCategory} onChange={(e) => setField("riskCategory", e.target.value)}>
              <option value="">—</option><option value="A">A</option><option value="B">B</option><option value="C">C</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Likely Impact</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.likelyImpact} onChange={(e) => setField("likelyImpact", e.target.value)}>
              <option value="">—</option><option value="LOCAL">Local</option><option value="ORG_WIDE">Organisation wide</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Process</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.concernedProcess} onChange={(e) => setField("concernedProcess", e.target.value)}>
              <option value="">—</option><option value="O2C">O2C</option><option value="P2P">P2P</option><option value="R2R">R2R</option><option value="INVENTORY">Inventory</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Auditor Person</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.auditorPerson} onChange={(e) => setField("auditorPerson", e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Auditee Tier 1</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.auditeePersonTier1} onChange={(e) => setField("auditeePersonTier1", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Auditee Tier 2</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.auditeePersonTier2} onChange={(e) => setField("auditeePersonTier2", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Auditee Feedback</label>
            <textarea className="border rounded px-3 py-2 w-full" rows={3} value={draft.auditeeFeedback} onChange={(e) => setField("auditeeFeedback", e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">HOD Action Plan</label>
            <textarea className="border rounded px-3 py-2 w-full" rows={3} value={draft.hodActionPlan} onChange={(e) => setField("hodActionPlan", e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Target Date</label>
            <input type="date" className="border rounded px-3 py-2 w-full" value={draft.targetDate} onChange={(e) => setField("targetDate", e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Responsible Person</label>
            <input className="border rounded px-3 py-2 w-full" value={draft.personResponsibleToImplement} onChange={(e) => setField("personResponsibleToImplement", e.target.value)} />
          </div>

          <div>
            <label className="block text-sm mb-1">Current Status</label>
            <select className="border rounded px-3 py-2 w-full" value={draft.currentStatus} onChange={(e) => setField("currentStatus", e.target.value)}>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In progress</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="bg-black text-white px-4 py-2 rounded">Save</button>
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

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded p-4 shadow space-y-3">
          <h2 className="font-medium">Attachments</h2>
          {canUploadAnnex && (
            <div className="flex items-center gap-2">
              <input type="file" onChange={(e) => setFileA(e.target.files?.[0] ?? null)} />
              <button className="border px-3 py-1 rounded" disabled={!fileA} onClick={async () => { if (fileA) { await upload("ANNEXURE", fileA); setFileA(null); await load(); }}}>Upload Annexure</button>
            </div>
          )}
          {canUploadMgmt && (
            <div className="flex items-center gap-2">
              <input type="file" onChange={(e) => setFileM(e.target.files?.[0] ?? null)} />
              <button className="border px-3 py-1 rounded" disabled={!fileM} onClick={async () => { if (fileM) { await upload("MGMT_DOC", fileM); setFileM(null); await load(); }}}>Upload Mgmt Doc</button>
            </div>
          )}

          <ul className="text-sm space-y-1">
            {o.attachments.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b py-1">
                <span>{a.kind}: {a.fileName}</span>
                <span className="text-xs text-gray-500">{a.key}</span>
              </li>
            ))}
            {o.attachments.length === 0 && <li className="text-gray-500">No attachments.</li>}
          </ul>
        </div>

        <div className="bg-white rounded p-4 shadow space-y-3">
          <h2 className="font-medium">Running notes</h2>
          <div className="flex gap-2">
            <input className="border rounded px-3 py-2 flex-1" placeholder="Add note…" value={note} onChange={(e) => setNote(e.target.value)} />
            <select className="border rounded px-3 py-2" value={noteVis} onChange={(e) => setNoteVis(e.target.value as any)}>
              <option value="ALL">Visible to all</option>
              <option value="INTERNAL">Internal</option>
            </select>
            <button className="border px-3 py-2 rounded" onClick={addNote}>Add</button>
          </div>
          <ul className="text-sm space-y-1">
            {o.notes.map((n) => (
              <li key={n.id} className="border-b py-1">
                <div className="flex items-center gap-2">
                  <span>{n.text}</span>
                  {n.visibility === "INTERNAL" && <span className="text-[10px] px-1 rounded border bg-yellow-50 text-yellow-800">INTERNAL</span>}
                </div>
                <div className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()} — {n.actor.email ?? n.actor.name ?? "user"}</div>
              </li>
            ))}
            {o.notes.length === 0 && <li className="text-gray-500">No notes yet.</li>}
          </ul>
        </div>
      </div>

      <div className="bg-white rounded p-4 shadow space-y-3">
        <h2 className="font-medium">Action Plans</h2>
        <div className="grid sm:grid-cols-4 gap-2">
          <input className="border rounded px-3 py-2 sm:col-span-2" placeholder="Action plan..." value={apPlan} onChange={(e) => setApPlan(e.target.value)} />
          <input className="border rounded px-3 py-2" placeholder="Owner (optional)" value={apOwner} onChange={(e) => setApOwner(e.target.value)} />
          <input className="border rounded px-3 py-2" type="date" value={apDate} onChange={(e) => setApDate(e.target.value)} />
          <input className="border rounded px-3 py-2 sm:col-span-3" placeholder="Status (optional)" value={apStatus} onChange={(e) => setApStatus(e.target.value)} />
          <div>
            <button className="border px-3 py-2 rounded" onClick={addAction}>Add</button>
          </div>
        </div>

        <ul className="text-sm space-y-2">
          {o.actionPlans.map((a) => (
            <li key={a.id} className="border rounded p-2">
              <div className="font-medium">{a.plan}</div>
              <div className="text-xs text-gray-600">
                Owner: {a.owner || "—"} | Target: {a.targetDate ? new Date(a.targetDate).toLocaleDateString() : "—"} | Status: {a.status || "—"}
              </div>
              <div className="flex gap-2 mt-2">
                <button className="border px-2 py-1 rounded" onClick={() => updateAction(a, { status: "Done" })}>Mark Done</button>
                {(role === "ADMIN" || role === "AUDITOR") && (
                  <button className="text-red-600 underline" onClick={() => deleteAction(a)}>Delete</button>
                )}
              </div>
            </li>
          ))}
          {o.actionPlans.length === 0 && <li className="text-gray-500">No action plans.</li>}
        </ul>
      </div>

      <div className="bg-white rounded p-4 shadow">
        <h2 className="font-medium mb-2">Approvals</h2>
        <ul className="text-sm space-y-1">
          {o.approvals.map((a) => (
            <li key={a.id} className="border-b py-1">
              {a.status} — {a.actor.email ?? a.actor.name ?? "user"} {a.comment ? `: ${a.comment}` : ""} <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {o.approvals.length === 0 && <li className="text-gray-500">No approval history.</li>}
        </ul>
      </div>
    </div>
  );
}