"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

type Plant = { id: string; code: string; name: string };
type AuditListItem = {
  id: string;
  plant: Plant;
  title?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  createdAt: string;
  assignments: { id: string; name: string | null; email: string | null }[];
  progress: { done: number; total: number };
};

export default function AuditsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [plantId, setPlantId] = useState("");
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [visitStartDate, setVisitStartDate] = useState("");
  const [visitEndDate, setVisitEndDate] = useState("");
  const [visitDetails, setVisitDetails] = useState("");
  const [managementResponseDate, setManagementResponseDate] = useState("");
  const [finalPresentationDate, setFinalPresentationDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { showSuccess, showError } = useToast();

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
          title: title || undefined,
          purpose: purpose || undefined,
          visitStartDate: visitStartDate ? new Date(visitStartDate).toISOString() : undefined,
          visitEndDate: visitEndDate ? new Date(visitEndDate).toISOString() : undefined,
          visitDetails: visitDetails || undefined,
          managementResponseDate: managementResponseDate ? new Date(managementResponseDate).toISOString() : undefined,
          finalPresentationDate: finalPresentationDate ? new Date(finalPresentationDate).toISOString() : undefined
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create audit");
      const selectedPlant = plants.find(p => p.id === plantId);
      setPlantId("");
      setTitle("");
      setPurpose("");
      setVisitStartDate("");
      setVisitEndDate("");
      setVisitDetails("");
      setManagementResponseDate("");
      setFinalPresentationDate("");
      await load();
      showSuccess(`Audit created successfully for ${selectedPlant?.name || "selected plant"}!`);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create audit";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setBusy(false);
    }
  }

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
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Audits</h1>
        <p className="text-base text-neutral-600 mt-2">Create and manage audit schedules</p>
      </div>

      {isAdmin && (
        <Card padding="lg">
          <h2 className="text-xl font-semibold text-neutral-900 mb-6">Create Audit (Admin only)</h2>
          {error && (
            <div className="mb-6 text-sm text-error-700 bg-error-50 border border-error-200 p-3 rounded-md">
              {error}
            </div>
          )}
          <form onSubmit={onCreate} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <Select
                label="Plant"
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
              </Select>

              <div className="sm:col-span-2">
                <Input
                  label="Audit Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Q1 2024 Internal Audit"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">
                  Audit Purpose
                </label>
                <textarea
                  className="w-full px-3.5 py-2.5 border rounded-lg text-sm transition-all duration-200 ease-out shadow-sm border-neutral-300 bg-white hover:border-neutral-400 focus:border-primary-500 focus:ring-primary-100 focus:outline-none focus:ring-4"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Describe the purpose and scope of this audit..."
                  rows={3}
                />
              </div>

              <Input
                type="date"
                label="Visit Start Date"
                value={visitStartDate}
                onChange={(e) => setVisitStartDate(e.target.value)}
              />

              <Input
                type="date"
                label="Visit End Date"
                value={visitEndDate}
                onChange={(e) => setVisitEndDate(e.target.value)}
              />

              <Input
                type="date"
                label="Management Response Date"
                value={managementResponseDate}
                onChange={(e) => setManagementResponseDate(e.target.value)}
              />

              <Input
                type="date"
                label="Final Presentation Date"
                value={finalPresentationDate}
                onChange={(e) => setFinalPresentationDate(e.target.value)}
              />

              <div className="sm:col-span-2">
                <Input
                  label="Visit Details"
                  value={visitDetails}
                  onChange={(e) => setVisitDetails(e.target.value)}
                  placeholder="Additional visit information..."
                />
              </div>
            </div>

            <Button type="submit" variant="primary" isLoading={busy}>
              {busy ? "Creating…" : "Create Audit"}
            </Button>
          </form>
        </Card>
      )}

      {!isAdmin && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-5 text-sm text-primary-800">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>You can view audits assigned to you below.</p>
          </div>
        </div>
      )}

      <Card padding="lg">
        <h2 className="text-xl font-semibold text-neutral-900 mb-6">
          {isAdmin ? "All Audits" : "My Assigned Audits"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="text-left text-neutral-600 bg-neutral-100 border-b-2 border-neutral-200">
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Audit Title</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Plant</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Period</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Progress</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider">Auditors</th>
                <th className="py-4 px-6 font-semibold text-xs uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {audits.map((a, index) => (
                <tr key={a.id} className={`transition-all duration-150 hover:bg-primary-50 hover:shadow-sm ${index % 2 === 0 ? "bg-white" : "bg-neutral-25"}`}>
                  <td className="py-4 px-6 font-medium text-neutral-900">{a.title || "—"}</td>
                  <td className="py-4 px-6 text-neutral-700">
                    {a.plant.code} — {a.plant.name}
                  </td>
                  <td className="py-4 px-6 text-neutral-600 text-xs">
                    {a.visitStartDate ? new Date(a.visitStartDate).toLocaleDateString() : "—"}{" "}
                    → {a.visitEndDate ? new Date(a.visitEndDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="py-4 px-6">
                    <Badge variant={statusVariant(a.status)}>
                      {a.status.replace("_", " ")}
                    </Badge>
                  </td>
                  <td className="py-4 px-6 text-neutral-600">
                    <span className="font-medium text-neutral-900">{a.progress.done}</span>
                    <span className="text-neutral-500">/{a.progress.total}</span>
                  </td>
                  <td className="py-4 px-6 text-neutral-600 text-xs">
                    {a.assignments.map((u) => u.email ?? u.name).join(", ") || "—"}
                  </td>
                  <td className="py-4 px-6">
                    <Link
                      href={`/audits/${a.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      Open →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}