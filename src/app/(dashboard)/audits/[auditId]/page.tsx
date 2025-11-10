"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { PageContainer } from "@/components/v2/PageContainer";
import { isCFOOrCXOTeam } from "@/lib/rbac";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/v2/select";
import { Avatar, AvatarFallback } from "@/components/ui/v2/avatar";
import { Separator } from "@/components/ui/v2/separator";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { cn } from "@/lib/utils";

type Plant = { id: string; code: string; name: string };
type User = { id: string; name: string | null; email: string | null; role: string };
type VisibilityPreset = "show_all" | "last_12m" | "hide_all";
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
  visibilityRules?: { mode?: VisibilityPreset } | null;
  auditHeadId?: string | null;
  auditHead?: User | null;
};
type Progress = { done: number; total: number };

const STATUS_BADGE_STYLES: Record<Audit["status"], string> = {
  PLANNED: "bg-[var(--c-bacSec)] text-[var(--c-texPri)] border-transparent",
  IN_PROGRESS: "bg-[var(--ca-palUiBlu200)] text-[var(--c-palUiBlu700)] border-transparent",
  SUBMITTED: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent",
  SIGNED_OFF: "bg-[var(--cl-palGre100)] text-[var(--cd-palGre500)] border-transparent",
};

const STATE_BADGE_STYLES = {
  open: "bg-[var(--ca-palUiBlu200)] text-[var(--c-palUiBlu700)] border-transparent",
  locked: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent",
  completed: "bg-[var(--cl-palGre100)] text-[var(--cd-palGre500)] border-transparent",
};

const VISIBILITY_COPY: Record<VisibilityPreset, { label: string; description: string }> = {
  show_all: {
    label: "Show all audits",
    description: "Auditors and Audit Heads can browse the full historical record.",
  },
  last_12m: {
    label: "Last 12 months",
    description: "Limits visibility to audits created in the previous 12 months.",
  },
  hide_all: {
    label: "Hide history",
    description: "Restricts access to the current audit only for assigned members.",
  },
};

const DEFAULT_VISIBILITY_MODE: VisibilityPreset = "show_all";

function toTitleCase(value?: string | null) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split(/[_\s-]/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function formatDateRange(start?: string | null, end?: string | null) {
  const startLabel = formatDate(start);
  const endLabel = formatDate(end);
  if (startLabel === "—" && endLabel === "—") return "—";
  if (startLabel === "—") return endLabel;
  if (endLabel === "—") return startLabel;
  return `${startLabel} → ${endLabel}`;
}

function getInitialsFromText(value?: string | null) {
  if (!value) return "U";
  const parts = value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  const initials = parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  if (initials) return initials;
  return value[0]?.toUpperCase() ?? "U";
}

function getUserInitials(user?: User | null) {
  return getInitialsFromText(user?.name ?? user?.email ?? "");
}

function getUserLabel(user?: User | null) {
  return user?.name ?? user?.email ?? "Unassigned";
}

export default function AuditDetailPage({ params }: { params: Promise<{ auditId: string }> }) {
  const { auditId } = React.use(params);
  const { data: session } = useSession();
  const canManageAudit = isCFOOrCXOTeam(session?.user?.role);
  const { showSuccess, showError } = useToast();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 });
  const [auditors, setAuditors] = useState<User[]>([]);
  const [auditHeads, setAuditHeads] = useState<User[]>([]);
  const [selectedAuditor, setSelectedAuditor] = useState<string>("");
  const [selectedAuditHead, setSelectedAuditHead] = useState<string>("");
  const [selectedVisibilityPreset, setSelectedVisibilityPreset] = useState<VisibilityPreset | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
    const res = await fetch(`/api/v1/audits/${auditId}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((json as { error?: string }).error || "Failed to load audit.");
      }

      const payload = json as { audit: Audit; progress: Progress };
      setAudit(payload.audit);
      setProgress(payload.progress ?? { done: 0, total: 0 });

      if (canManageAudit) {
      const [audRes, ahRes] = await Promise.all([
        fetch(`/api/v1/users?role=AUDITOR`, { cache: "no-store" }),
          fetch(`/api/v1/users?role=AUDIT_HEAD`, { cache: "no-store" }),
      ]);

      if (audRes.ok) {
          const audJson = await audRes.json().catch(() => ({}));
          setAuditors((audJson as { users?: User[] }).users ?? []);
        } else {
          setAuditors([]);
      }

      if (ahRes.ok) {
          const ahJson = await ahRes.json().catch(() => ({}));
          setAuditHeads((ahJson as { users?: User[] }).users ?? []);
        } else {
          setAuditHeads([]);
        }
      } else {
        setAuditors([]);
        setAuditHeads([]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audit.";
      setAudit(null);
      setProgress({ done: 0, total: 0 });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [auditId, canManageAudit]);

  useEffect(() => {
    void load();
  }, [load]);

  async function addAuditor() {
    if (!selectedAuditor) return;
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/assign`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: selectedAuditor }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = (j as { error?: string }).error || "Failed to add auditor.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      const selectedUser = auditors.find((u) => u.id === selectedAuditor);
      setSelectedAuditor("");
      await load();
      showSuccess(`Auditor ${selectedUser?.email ?? selectedUser?.name ?? "user"} added successfully!`);
    }
  }

  async function removeAuditor(userId: string) {
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/assign?userId=${userId}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = (j as { error?: string }).error || "Failed to remove auditor.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Auditor removed successfully!");
    }
  }

  async function lockAudit() {
    if (typeof window !== "undefined" && !window.confirm("Lock this audit? This will restrict most operations.")) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/lock`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = (j as { error?: string }).error || "Failed to lock audit.";
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
      const errorMessage = (j as { error?: string }).error || "Failed to unlock audit.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Audit unlocked successfully!");
    }
  }

  async function completeAudit() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Mark this audit as complete? This will lock the audit.")
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}/complete`, { method: "POST" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = (j as { error?: string }).error || "Failed to complete audit.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      await load();
      showSuccess("Audit marked as complete!");
    }
  }

  async function assignAuditHead() {
    if (!selectedAuditHead) return;
    const selectedUser = auditHeads.find((u) => u.id === selectedAuditHead);
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Assign ${selectedUser?.email ?? selectedUser?.name ?? "user"} as Audit Head?`)
    ) {
      return;
    }
    setError(null);
    const res = await fetch(`/api/v1/audits/${auditId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ auditHeadId: selectedAuditHead }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = (j as { error?: string }).error || "Failed to assign audit head.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      setSelectedAuditHead("");
      await load();
      showSuccess(`${selectedUser?.email ?? selectedUser?.name ?? "User"} assigned as Audit Head!`);
    }
  }

  async function updateVisibility() {
    if (!selectedVisibilityPreset) return;
    setError(null);

    const visibilityRules = { mode: selectedVisibilityPreset };

    const res = await fetch(`/api/v1/audits/${auditId}/visibility`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visibilityRules }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      const errorMessage = (j as { error?: string }).error || "Failed to update visibility rules.";
      setError(errorMessage);
      showError(errorMessage);
    } else {
      setSelectedVisibilityPreset("");
      await load();
      showSuccess("Visibility rules updated successfully!");
    }
  }

  if (!audit) {
    return (
      <PageContainer className="space-y-8">
        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-4 w-32" />
            <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
              <CardContent className="space-y-4 py-8">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
      </div>
        ) : (
          <div className="rounded-3xl border border-[var(--border-color-regular)] bg-[var(--c-bacPri)] px-8 py-12 text-center">
            <p className="text-sm text-[var(--c-texSec)]">
              {error ? error : "We couldn't load this audit right now."}
            </p>
            <Button variant="default" className="mt-4" onClick={() => void load()}>
              Try again
            </Button>
    </div>
        )}
      </PageContainer>
    );
  }

  const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const stateBadge = audit.completedAt
    ? { label: "Completed", className: STATE_BADGE_STYLES.completed, meta: formatDateTime(audit.completedAt) }
    : audit.isLocked
      ? {
          label: "Locked",
          className: STATE_BADGE_STYLES.locked,
          meta: audit.lockedAt ? formatDateTime(audit.lockedAt) : null,
        }
      : { label: "Open", className: STATE_BADGE_STYLES.open, meta: null };
  const visibilityMode = (audit.visibilityRules?.mode as VisibilityPreset | undefined) ?? DEFAULT_VISIBILITY_MODE;
  const visibilityCopy = VISIBILITY_COPY[visibilityMode];
  const infoItems: Array<{ key: string; label: string; value: React.ReactNode }> = [
    { key: "plant", label: "Plant", value: `${audit.plant.code} · ${audit.plant.name}` },
    { key: "auditHead", label: "Audit head", value: audit.auditHead ? getUserLabel(audit.auditHead) : "Not assigned" },
    { key: "visit", label: "Visit window", value: formatDateRange(audit.visitStartDate, audit.visitEndDate) },
    { key: "managementResponse", label: "Management response", value: formatDate(audit.managementResponseDate) },
    { key: "finalPresentation", label: "Final presentation", value: formatDate(audit.finalPresentationDate) },
    { key: "visibility", label: "Visibility rule", value: visibilityCopy.label },
  ];

  return (
    <PageContainer className="space-y-8">
      <div className="space-y-4">
        <nav className="flex items-center gap-2 text-sm text-[var(--c-texSec)]">
          <Link href="/audits" className="transition-colors hover:text-[var(--c-texPri)] hover:underline">
            Audits
          </Link>
          <span className="text-[var(--c-texSec)]/60">/</span>
          <span className="font-medium text-[var(--c-texPri)]">{audit.plant.code}</span>
        </nav>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold text-[var(--c-texPri)]">
              {audit.title?.trim() || `${audit.plant.code} ${audit.plant.name}`}
        </h1>
            <p className="text-sm text-[var(--c-texSec)]">
              {audit.purpose ? audit.purpose : "Overview of audit ownership, progress, and visibility controls."}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={cn("self-start border border-transparent", STATUS_BADGE_STYLES[audit.status])}
          >
            {toTitleCase(audit.status)}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-[var(--c-palUiRed100)] bg-[var(--c-palUiRed100)]/50 px-4 py-3 text-sm text-[var(--c-palUiRed600)]">
          {error}
        </div>
      )}

      <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">Audit overview</CardTitle>
          <CardDescription className="text-sm text-[var(--c-texSec)]">
            Snapshot of schedule, ownership, and completion progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <div className="rounded-2xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--c-texSec)]">
              <span>Overall progress</span>
              <span className="font-medium text-[var(--c-texPri)]">{progressPercent}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[var(--border-color-regular)]/60">
              <div
                className="h-full rounded-full bg-[var(--c-palUiBlu600)] transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between text-xs text-[var(--c-texSec)]">
              <span>
                {progress.done} of {progress.total} observations resolved
              </span>
              {audit.visitDetails && <span>{audit.visitDetails}</span>}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {infoItems.map((item) => (
              <div key={item.key} className="space-y-1.5">
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--c-texSec)]/80">
                  {item.label}
                </div>
                <div className="text-sm text-[var(--c-texPri)]">{item.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">Audit controls</CardTitle>
            <CardDescription className="text-sm text-[var(--c-texSec)]">
              Lock, unlock, or mark the audit complete once reviews wrap up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pb-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[var(--c-texPri)]">Current state</span>
              <Badge variant="secondary" className={cn("border-transparent", stateBadge.className)}>
                {stateBadge.label}
              </Badge>
              {stateBadge.meta && (
                <span className="text-xs text-[var(--c-texSec)]">updated {stateBadge.meta}</span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
            {audit.isLocked && audit.lockedAt && (
                <div className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3 text-sm text-[var(--c-texSec)]">
                  <div className="font-medium text-[var(--c-texPri)]">Locked on</div>
                  <div>{formatDateTime(audit.lockedAt)}</div>
              </div>
            )}
            {audit.completedAt && (
                <div className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3 text-sm text-[var(--c-texSec)]">
                  <div className="font-medium text-[var(--c-texPri)]">Completed on</div>
                  <div>{formatDateTime(audit.completedAt)}</div>
              </div>
              )}
            </div>

            {canManageAudit ? (
              <div className="flex flex-wrap items-center gap-3">
                {!audit.isLocked && !audit.completedAt && (
                  <>
                    <Button variant="destructive" size="sm" onClick={() => void lockAudit()}>
                      Lock audit
                    </Button>
                    <Button variant="default" size="sm" onClick={() => void completeAudit()}>
                      Mark complete
                    </Button>
                  </>
                )}
                {audit.isLocked && !audit.completedAt && (
                  <Button variant="outline" size="sm" onClick={() => void unlockAudit()}>
                    Unlock audit
                  </Button>
                )}
                {audit.completedAt && (
                  <span className="text-xs text-[var(--c-texSec)]">
                    Completed audits remain locked for integrity. Contact CFO to reopen.
                  </span>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-4 py-3 text-sm text-[var(--c-texSec)]">
                Only CFO and CXO team members can update audit locking controls.
              </div>
            )}

            <p className="text-xs text-[var(--c-texSec)]">
              Locking an audit freezes assignments and edits. Completing an audit automatically locks it and records the
              finisher for the audit trail.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
          <CardHeader className="gap-2">
            <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">Visibility settings</CardTitle>
            <CardDescription className="text-sm text-[var(--c-texSec)]">
              Configure which historical audits assigned teams can browse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pb-8">
            <div className="rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-medium uppercase tracking-wide text-[var(--c-texSec)]/80">
                    Current visibility
                  </div>
                  <div className="mt-1 text-sm text-[var(--c-texPri)]">{visibilityCopy.label}</div>
                  <p className="mt-2 text-xs text-[var(--c-texSec)]">{visibilityCopy.description}</p>
                </div>
                <Badge variant="secondary" className="border-transparent bg-[var(--c-bacPri)] text-[var(--c-texSec)]">
                  {visibilityMode.replace("_", " ")}
                </Badge>
              </div>
            </div>

            {canManageAudit ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={selectedVisibilityPreset || undefined}
                  onValueChange={(value) => setSelectedVisibilityPreset(value as VisibilityPreset)}
                >
                  <SelectTrigger className="w-full sm:w-60">
                    <SelectValue placeholder="Select visibility preset" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="show_all">Show all audits</SelectItem>
                    <SelectItem value="last_12m">Last 12 months only</SelectItem>
                    <SelectItem value="hide_all">Hide historical audits</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!selectedVisibilityPreset}
                  onClick={() => void updateVisibility()}
                >
                  Apply
                </Button>
              </div>
            ) : (
              <div className="text-xs text-[var(--c-texSec)]">
                Only CFO and CXO team members can modify visibility rules. Current rules still apply to your view.
              </div>
            )}
          </CardContent>
        </Card>
                  </div>

      <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
        <CardHeader className="gap-2">
          <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">Team & ownership</CardTitle>
          <CardDescription className="text-sm text-[var(--c-texSec)]">
            Manage audit head assignment and supporting auditor roster.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pb-8">
          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--c-texSec)]/80">Audit head</div>
                <div className="mt-1 text-sm text-[var(--c-texPri)]">
                  {audit.auditHead ? getUserLabel(audit.auditHead) : "Not assigned"}
                </div>
              </div>
              {audit.auditHead && (
                <Badge className="border-transparent bg-[var(--ca-palUiBlu200)] text-[var(--c-palUiBlu700)]">
                  Lead owner
                </Badge>
              )}
                  </div>

                {canManageAudit && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Select
                  value={selectedAuditHead || undefined}
                  onValueChange={(value) => setSelectedAuditHead(value)}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Select audit head" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditHeads.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        No eligible audit heads found
                      </SelectItem>
                    )}
                      {auditHeads.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {getUserLabel(u)}
                      </SelectItem>
                      ))}
                  </SelectContent>
                    </Select>
                    <Button
                  variant="default"
                  size="sm"
                  disabled={!selectedAuditHead || selectedAuditHead === "__empty"}
                  onClick={() => void assignAuditHead()}
                >
                  {audit.auditHead ? "Change audit head" : "Assign audit head"}
                    </Button>
                  </div>
                )}
          </section>

          <Separator className="bg-[var(--border-color-regular)]" />

          <section className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--c-texSec)]/80">
                  Team members (auditors)
                </div>
                <p className="text-sm text-[var(--c-texSec)]">
                  Add or remove auditors responsible for fieldwork and observation closure.
                </p>
              </div>
              <Badge className="border-transparent bg-[var(--c-bacSec)] text-[var(--c-texSec)]">
                {audit.assignments.length} assigned
              </Badge>
          </div>

            {canManageAudit && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Select
                  value={selectedAuditor || undefined}
                  onValueChange={(value) => setSelectedAuditor(value)}
                >
                  <SelectTrigger className="w-full sm:w-72">
                    <SelectValue placeholder="Select auditor" />
                  </SelectTrigger>
                  <SelectContent>
                    {auditors.length === 0 && (
                      <SelectItem value="__empty" disabled>
                        No available auditors
                      </SelectItem>
                    )}
                  {auditors.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {getUserLabel(u)}
                      </SelectItem>
                  ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!selectedAuditor || selectedAuditor === "__empty"}
                  onClick={() => void addAuditor()}
                >
                  Add auditor
                </Button>
              </div>
            )}

            <div className="space-y-3">
              {audit.assignments.map((assignment) => (
                <div
                  key={assignment.auditor.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 bg-[var(--ca-palUiBlu200)]">
                      <AvatarFallback className="text-sm font-medium text-[var(--c-palUiBlu700)]">
                        {getUserInitials(assignment.auditor)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium text-[var(--c-texPri)]">
                        {getUserLabel(assignment.auditor)}
                      </div>
                      <div className="text-xs text-[var(--c-texSec)]">{toTitleCase(assignment.auditor.role)}</div>
                    </div>
                  </div>
                  {canManageAudit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[var(--c-palUiRed600)] hover:bg-[var(--c-palUiRed100)] hover:text-[var(--c-palUiRed600)]"
                      onClick={() => void removeAuditor(assignment.auditor.id)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}

              {audit.assignments.length === 0 && (
                <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-6 py-8 text-center text-sm text-[var(--c-texSec)]">
                  No auditors assigned yet.
                </div>
              )}
            </div>
          </section>
        </CardContent>
        </Card>
    </PageContainer>
  );
}
