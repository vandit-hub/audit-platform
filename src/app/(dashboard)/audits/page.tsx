"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { ExternalLink, Lock, ShieldCheck, Unlock } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { PageContainer } from "@/components/v2/PageContainer";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from "@/components/ui/v2";
import { isCFOOrCXOTeam } from "@/lib/rbac";
import {
  CreateAuditDialog,
  CreateAuditFormValues,
} from "./_components/CreateAuditDialog";

type Plant = { id: string; code: string; name: string };
type UserSummary = { id: string; name: string | null; email: string | null };
type AuditListItem = {
  id: string;
  plant: Plant;
  title?: string | null;
  purpose?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  status: "PLANNED" | "IN_PROGRESS" | "SUBMITTED" | "SIGNED_OFF";
  createdAt: string;
  assignments: UserSummary[];
  progress: { done: number; total: number };
  isLocked?: boolean;
  completedAt?: string | null;
  auditHead: UserSummary | null;
};

const STATUS_BADGE_CLASSES: Record<AuditListItem["status"], string> = {
  PLANNED: "bg-[var(--c-bacSec)] text-[var(--c-texPri)] border-transparent",
  IN_PROGRESS:
    "bg-[var(--ca-palUiBlu200)] border-transparent text-[var(--c-palUiBlu700)]",
  SUBMITTED:
    "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]",
  SIGNED_OFF:
    "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]",
};

export default function AuditsPage() {
  const { data: session } = useSession();
  const canManageAudits = isCFOOrCXOTeam(session?.user?.role);
  const { showSuccess, showError } = useToast();

  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<AuditListItem[]>([]);
  const [auditHeads, setAuditHeads] = useState<UserSummary[]>([]);
  const [auditors, setAuditors] = useState<UserSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const [plantsRes, auditsRes] = await Promise.all([
        fetch("/api/v1/plants", { cache: "no-store" }),
        fetch("/api/v1/audits", { cache: "no-store" }),
      ]);

      const plantsJson = await plantsRes.json().catch(() => ({}));
      if (!plantsRes.ok) {
        throw new Error(
          (plantsJson as { error?: string }).error || "Failed to load plants.",
        );
      }
      setPlants(plantsJson.plants ?? []);

      const auditsJson = await auditsRes.json().catch(() => ({}));
      if (!auditsRes.ok) {
        throw new Error(
          (auditsJson as { error?: string }).error || "Failed to load audits.",
        );
      }
      setAudits(auditsJson.audits ?? []);

      if (canManageAudits) {
        const [headsRes, auditorsRes] = await Promise.all([
          fetch("/api/v1/users?role=AUDIT_HEAD", { cache: "no-store" }),
          fetch("/api/v1/users?role=AUDITOR", { cache: "no-store" }),
        ]);

        if (headsRes.ok) {
          const headsJson = await headsRes.json().catch(() => ({}));
          setAuditHeads((headsJson as { users?: UserSummary[] }).users ?? []);
        } else {
          setAuditHeads([]);
        }

        if (auditorsRes.ok) {
          const auditorJson = await auditorsRes.json().catch(() => ({}));
          setAuditors(
            (auditorJson as { users?: UserSummary[] }).users ?? [],
          );
        } else {
          setAuditors([]);
        }
      } else {
        setAuditHeads([]);
        setAuditors([]);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load audit data.";
      setLoadError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [canManageAudits, showError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = useCallback(
    async (values: CreateAuditFormValues) => {
      const payload = {
        plantId: values.plantId,
        title: values.title?.trim() || undefined,
        purpose: values.purpose?.trim() || undefined,
        visitStartDate: values.visitStartDate
          ? new Date(values.visitStartDate).toISOString()
          : undefined,
        visitEndDate: values.visitEndDate
          ? new Date(values.visitEndDate).toISOString()
          : undefined,
        auditHeadId: values.auditHeadId,
        auditorIds: values.auditorIds,
      };

      const res = await fetch("/api/v1/audits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          (json as { error?: string }).error || "Failed to create audit.";
        showError(message);
        throw new Error(message);
      }

      await load();
      const plantName =
        plants.find((plant) => plant.id === values.plantId)?.name ??
        "selected plant";
      showSuccess(`Audit created successfully for ${plantName}!`);
    },
    [load, plants, showError, showSuccess],
  );

  const toggleLock = useCallback(
    async (audit: AuditListItem) => {
      if (!canManageAudits || audit.completedAt) return;

      setActionBusy(audit.id);
      const action = audit.isLocked ? "unlock" : "lock";
      try {
        const res = await fetch(`/api/v1/audits/${audit.id}/${action}`, {
          method: "POST",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            (json as { error?: string }).error ||
              `Failed to ${action} audit.`,
          );
        }

        showSuccess(
          audit.isLocked ? "Audit unlocked successfully!" : "Audit locked successfully!",
        );
        await load();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to update audit state.";
        showError(message);
      } finally {
        setActionBusy(null);
      }
    },
    [canManageAudits, load, showError, showSuccess],
  );

  const tableRows = useMemo(() => {
    return audits.map((audit) => {
      const start = audit.visitStartDate
        ? new Date(audit.visitStartDate).toLocaleDateString()
        : "—";
      const end = audit.visitEndDate
        ? new Date(audit.visitEndDate).toLocaleDateString()
        : "—";
      const percent =
        audit.progress.total > 0
          ? Math.round((audit.progress.done / audit.progress.total) * 100)
          : 0;

      const lockState = audit.completedAt
        ? {
            label: "Completed",
            icon: ShieldCheck,
            className:
              "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]",
          }
        : audit.isLocked
        ? {
            label: "Locked",
            icon: Lock,
            className:
              "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]",
          }
        : {
            label: "Unlocked",
            icon: Unlock,
            className:
              "bg-[var(--ca-palUiBlu100)] border-transparent text-[var(--c-palUiBlu700)]",
          };

      const teamLabel = audit.auditHead
        ? audit.auditHead.name ?? audit.auditHead.email ?? "Audit head"
        : "Not assigned";
      const additionalAuditors = audit.assignments.length;

      return {
        audit,
        start,
        end,
        percent,
        lockState,
        teamLabel,
        additionalAuditors,
      };
    });
  }, [audits]);

  return (
    <PageContainer className="space-y-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--c-texPri)]">
            Audits
          </h1>
          <p className="text-sm text-[var(--c-texSec)]">
            Manage audit processes and keep track of progress across plants.
          </p>
        </div>
        {canManageAudits && (
          <CreateAuditDialog
            plants={plants}
            auditHeads={auditHeads}
            auditors={auditors}
            onCreate={handleCreate}
          />
        )}
      </header>

      {!canManageAudits && (
        <div className="rounded-xl border border-[var(--ca-palUiBlu200)] bg-[var(--ca-palUiBlu100)]/40 px-5 py-4 text-sm text-[var(--c-palUiBlu700)]">
          Only CFO and CXO team members can create new audits. You can still
          review audits assigned to you below.
        </div>
      )}

      <Card className="border-none bg-[var(--c-bacSec)]">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">
              {canManageAudits ? "All Audits" : "My Assigned Audits"}
            </CardTitle>
            <CardDescription>
              Complete list of audit processes with real-time status.
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/reports">
              <ExternalLink className="mr-2 size-4" />
              Export summary
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl bg-[var(--c-bacPri)]"
                />
              ))}
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-[var(--c-palUiRed200)] bg-[var(--c-palUiRed100)]/60 px-4 py-6 text-sm text-[var(--c-palUiRed700)]">
              {loadError}
            </div>
          ) : audits.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-color-regular)] bg-white px-6 py-12 text-center">
              <h3 className="text-lg font-semibold text-[var(--c-texPri)]">
                No audits yet
              </h3>
              <p className="mt-1 text-sm text-[var(--c-texSec)]">
                Once audits are created, they will appear here for tracking.
              </p>
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="text-xs uppercase tracking-wide text-[var(--c-texSec)]">
                <tr className="bg-white/60 text-left">
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Plant</th>
                  <th className="px-5 py-3 font-medium">Period</th>
                  <th className="px-5 py-3 font-medium">Lock Status</th>
                  <th className="px-5 py-3 font-medium">Progress</th>
                  <th className="px-5 py-3 font-medium">Auditors</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map(
                  ({ audit, start, end, percent, lockState, teamLabel, additionalAuditors }) => {
                    const LockIcon = lockState.icon;

                    return (
                      <tr
                        key={audit.id}
                        className="border-b border-[var(--border-color-regular)] bg-white last:border-b-0"
                      >
                        <td className="px-5 py-4 text-[var(--c-texPri)]">
                          <div className="space-y-1">
                            <p className="font-medium">
                              {audit.title?.trim() || "Untitled audit"}
                            </p>
                            {audit.purpose && (
                              <p className="text-xs text-[var(--c-texSec)] line-clamp-1">
                                {audit.purpose}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {audit.plant.code} · {audit.plant.name}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {start} – {end}
                        </td>
                        <td className="px-5 py-4">
                          <Badge className={`flex items-center gap-1 ${lockState.className}`}>
                            <LockIcon className="size-3" />
                            {lockState.label}
                          </Badge>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-28">
                              <Progress value={percent} />
                            </div>
                            <span className="text-sm font-medium text-[var(--c-texPri)]">
                              {percent}%
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[var(--c-texSec)]">
                            {audit.progress.done} of {audit.progress.total} resolved
                          </p>
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          <div className="space-y-1">
                            <p className="font-medium text-[var(--c-texPri)]">
                              {teamLabel}
                            </p>
                            <p className="text-xs text-[var(--c-texSec)]">
                              {additionalAuditors > 0
                                ? `+${additionalAuditors} auditors`
                                : "No additional auditors"}
                            </p>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              asChild
                              variant="outline"
                              size="sm"
                              className="gap-2"
                            >
                              <Link href={`/audits/${audit.id}`}>
                                <ExternalLink className="size-3" />
                                Open
                              </Link>
                            </Button>
                            {canManageAudits && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionBusy === audit.id || audit.completedAt}
                                onClick={() => toggleLock(audit)}
                                aria-label={audit.isLocked ? "Unlock audit" : "Lock audit"}
                              >
                                {actionBusy === audit.id ? (
                                  <span className="size-4 animate-spin rounded-full border-2 border-[var(--c-texSec)] border-t-transparent" />
                                ) : audit.isLocked ? (
                                  <Unlock className="size-4" />
                                ) : (
                                  <Lock className="size-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
