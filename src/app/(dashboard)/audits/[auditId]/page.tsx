"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useToast } from "@/contexts/ToastContext";
import { PageContainer } from "@/components/v2/PageContainer";
import { Card, CardContent } from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";
import { Avatar, AvatarFallback } from "@/components/ui/v2/avatar";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { cn } from "@/lib/utils";
import { AuditActionButtons } from "../_components/AuditActionButtons";
import { ObservationsTable } from "../_components/ObservationsTable";
import { ChecklistsTable } from "../_components/ChecklistsTable";
import type { AuditForEdit } from "../_components/EditAuditDialog";

type Plant = { id: string; code: string; name: string };
type User = { id: string; name: string | null; email: string | null; role: string };
type Audit = AuditForEdit & {
  plant: Plant;
  code?: string | null;
};
type Progress = { done: number; total: number };

const STATUS_BADGE_STYLES: Record<Audit["status"], string> = {
  PLANNED: "bg-[var(--c-bacSec)] text-[var(--c-texPri)] border-transparent",
  IN_PROGRESS: "bg-[var(--ca-palUiBlu200)] text-[var(--c-palUiBlu700)] border-transparent",
  SUBMITTED: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent",
  SIGNED_OFF: "bg-[var(--cl-palGre100)] text-[var(--cd-palGre500)] border-transparent",
};

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
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  const { showError } = useToast();

  const [audit, setAudit] = useState<Audit | null>(null);
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadAudit = useCallback(async () => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load audit.";
      setAudit(null);
      setProgress({ done: 0, total: 0 });
      setError(message);
      showError(message);
    } finally {
      setIsLoading(false);
    }
  }, [auditId, showError]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

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
            <Button variant="default" className="mt-4" onClick={() => void loadAudit()}>
              Try again
            </Button>
          </div>
        )}
      </PageContainer>
    );
  }

  const progressPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  // Build page title
  const pageTitle = audit.code
    ? `${audit.code}${audit.title ? `: ${audit.title}` : ""}`
    : audit.title || `${audit.plant.code} ${audit.plant.name}`;

  // Build status badge content
  const statusBadgeContent = audit.isLocked
    ? `${toTitleCase(audit.status)} (Locked)`
    : toTitleCase(audit.status);

  return (
    <PageContainer className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--c-texSec)]">
        <Link href="/audits" className="transition-colors hover:text-[var(--c-texPri)] hover:underline">
          Audits
        </Link>
        <span className="text-[var(--c-texSec)]/60">/</span>
        <span className="font-medium text-[var(--c-texPri)]">{audit.code || audit.plant.code}</span>
      </nav>

      {/* Header with Title + Action Buttons */}
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-[var(--c-texPri)]">
          {pageTitle}
        </h1>
        <AuditActionButtons
          audit={audit}
          userRole={session?.user?.role}
          onRefresh={loadAudit}
        />
      </div>

      {/* Purpose description (if exists) */}
      {audit.purpose && (
        <p className="text-sm text-[var(--c-texSec)]">
          {audit.purpose}
        </p>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-2xl border border-[var(--c-palUiRed100)] bg-[var(--c-palUiRed100)]/50 px-4 py-3 text-sm text-[var(--c-palUiRed600)]">
          {error}
        </div>
      )}

      {/* Overall Progress Card */}
      <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
        <CardContent className="space-y-3 py-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--c-texSec)]">Overall Progress</span>
            <span className="font-medium text-[var(--c-texPri)]">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--border-color-regular)]/60">
            <div
              className="h-full rounded-full bg-[var(--c-palUiBlu600)] transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-[var(--c-texSec)]">
            {progress.done} of {progress.total} observations resolved
          </p>
        </CardContent>
      </Card>

      {/* Audit Info Grid Card */}
      <Card className="rounded-3xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]">
        <CardContent className="py-8">
          <div className="grid gap-x-16 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Status */}
            <div className="space-y-1.5">
              <p className="text-sm text-[var(--c-texSec)]">Status</p>
              <Badge
                variant="secondary"
                className={cn("border", STATUS_BADGE_STYLES[audit.status])}
              >
                {statusBadgeContent}
              </Badge>
            </div>

            {/* Audit Head */}
            <div className="space-y-1.5">
              <p className="text-sm text-[var(--c-texSec)]">Audit Head</p>
              {audit.auditHead ? (
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback
                      className="text-xs"
                      style={{
                        background: "var(--c-palUiBlu100)",
                        color: "var(--c-palUiBlu600)",
                      }}
                    >
                      {getUserInitials(audit.auditHead)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-[var(--c-texPri)]">
                    {getUserLabel(audit.auditHead)}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-[var(--c-texPri)]">Not assigned</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <p className="text-sm text-[var(--c-texSec)]">Start Date</p>
              <p className="text-sm text-[var(--c-texPri)]">
                {formatDate(audit.visitStartDate)}
              </p>
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <p className="text-sm text-[var(--c-texSec)]">End Date</p>
              <p className="text-sm text-[var(--c-texPri)]">
                {formatDate(audit.visitEndDate)}
              </p>
            </div>

            {/* Associated Plants */}
            <div className="space-y-1.5">
              <p className="text-sm text-[var(--c-texSec)]">Associated Plant</p>
              <p className="text-sm text-[var(--c-texPri)]">
                {audit.plant.code} · {audit.plant.name}
              </p>
            </div>

            {/* Assigned Auditors */}
            <div className="space-y-1.5">
              <p className="text-sm text-[var(--c-texSec)]">Assigned Auditors</p>
              {audit.assignments.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3">
                  {audit.assignments.slice(0, 3).map((assignment) => (
                    <div key={assignment.auditor.id} className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-xs"
                          style={{
                            background: "var(--c-palUiBlu100)",
                            color: "var(--c-palUiBlu600)",
                          }}
                        >
                          {getUserInitials(assignment.auditor)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-[var(--c-texPri)]">
                        {getUserLabel(assignment.auditor)}
                      </span>
                    </div>
                  ))}
                  {audit.assignments.length > 3 && (
                    <Badge
                      variant="secondary"
                      className="h-6 w-6 rounded-full p-0 flex items-center justify-center text-xs"
                    >
                      +{audit.assignments.length - 3}
                    </Badge>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--c-texPri)]">No auditors assigned</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Linked Observations Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "var(--c-texPri)" }}>
          Linked Observations
        </h2>
        <ObservationsTable auditId={auditId} />
      </div>

      {/* Checklists Section */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold" style={{ color: "var(--c-texPri)" }}>
          Checklists
        </h2>
        <ChecklistsTable auditId={auditId} />
      </div>
    </PageContainer>
  );
}
