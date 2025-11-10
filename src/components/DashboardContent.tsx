"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ClipboardList,
  Eye,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  ArrowRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Badge } from "@/components/ui/v2/badge";
import { Button } from "@/components/ui/v2/button";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { PageContainer } from "@/components/v2/PageContainer";
import { cn } from "@/lib/utils";

type AuditMetrics = {
  total: number;
  statusCounts: Record<string, number>;
};

type AuditListItem = {
  id: string;
  title?: string | null;
  plantCode: string;
  plantName: string;
  startDate?: string | null;
  endDate?: string | null;
  isLocked?: boolean;
  completedAt?: string | null;
  progress?: { done: number; total: number };
};

type ObservationMetrics = {
  ok: boolean;
  total: number;
  statusCounts: Record<string, number>;
  byRisk: { A: number; B: number; C: number };
  published: { published: number; unpublished: number };
  due: { overdue: number; dueSoon: number; windowDays: number };
};

type ObservationListItem = {
  id: string;
  title: string;
  riskCategory?: "A" | "B" | "C" | null;
  concernedProcess?: "O2C" | "P2P" | "R2R" | "INVENTORY" | null;
  currentStatus?: string | null;
  createdAt: string;
  audit: { id: string; title?: string | null; visitStartDate?: string | null; visitEndDate?: string | null };
  plant: { id: string; code: string; name: string };
};

const PROCESS_LABELS: Record<string, string> = {
  O2C: "Order to Cash",
  P2P: "Procure to Pay",
  R2R: "Record to Report",
  INVENTORY: "Inventory",
};

const STATUS_ORDER: Record<string, number> = {
  PENDING_MR: 1,
  MR_UNDER_REVIEW: 2,
  REFERRED_BACK: 3,
  OBSERVATION_FINALISED: 4,
  RESOLVED: 5,
};

const STATUS_DOT_CLASSES: Record<string, string> = {
  PENDING_MR: "bg-[var(--c-palUiRed600)]",
  MR_UNDER_REVIEW: "bg-[var(--c-palUiBlu700)]",
  REFERRED_BACK: "bg-[var(--cd-palOra500)]",
  OBSERVATION_FINALISED: "bg-[var(--c-palUiGre600)]",
  RESOLVED: "bg-[var(--c-texSec)]/60",
};

const RISK_BADGE_CLASSES: Record<NonNullable<ObservationListItem["riskCategory"]>, string> = {
  A: "bg-[var(--c-palUiRed100)] text-[var(--c-palUiRed600)] border-transparent",
  B: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent",
  C: "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent",
};

const STATUS_BADGE_CLASSES: Record<string, string> = {
  PENDING_MR: "bg-[var(--ca-palUiBlu100)] text-[var(--c-palUiBlu700)] border-transparent",
  MR_UNDER_REVIEW: "bg-[var(--ca-palUiBlu100)] text-[var(--c-palUiBlu700)] border-transparent",
  REFERRED_BACK: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent",
  OBSERVATION_FINALISED: "bg-[var(--cl-palGre100)] text-[var(--cd-palGre500)] border-transparent",
  RESOLVED: "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent",
};

function humanizeStatus(value?: string | null) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split(/[_\s-]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase().concat(part.slice(1)) ?? "")
    .join(" ");
}

function formatDateRange(start?: string | null, end?: string | null) {
  const startLabel = start ? new Date(start).toLocaleDateString() : "No start";
  const endLabel = end ? new Date(end).toLocaleDateString() : "No end";
  return `${startLabel} → ${endLabel}`;
}

function partitionDueSoon(count: number) {
  if (count <= 1) return { thisWeek: count, nextWeek: 0 };
  const thisWeek = Math.ceil(count / 2);
  return { thisWeek, nextWeek: count - thisWeek };
}

export default function DashboardContent() {
  const [auditMetrics, setAuditMetrics] = useState<AuditMetrics | null>(null);
  const [recentAudits, setRecentAudits] = useState<AuditListItem[]>([]);
  const [observationMetrics, setObservationMetrics] = useState<ObservationMetrics | null>(null);
  const [observations, setObservations] = useState<ObservationListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [auditsRes, overviewRes, observationsRes] = await Promise.all([
          fetch("/api/v1/audits", { cache: "no-store" }),
          fetch("/api/v1/reports/overview", { cache: "no-store" }),
          fetch("/api/v1/observations?sortBy=createdAt&sortOrder=desc", { cache: "no-store" }),
        ]);

        if (auditsRes.ok) {
          const auditsJson = await auditsRes.json();
          if (auditsJson.ok) {
            const audits = auditsJson.audits as any[];
            const statusCounts: Record<string, number> = {};
            audits.forEach((audit) => {
              statusCounts[audit.status] = (statusCounts[audit.status] || 0) + 1;
            });
            setAuditMetrics({
              total: audits.length,
              statusCounts,
            });

            const recentList: AuditListItem[] = audits
              .map((audit) => ({
                id: audit.id,
                title: audit.title,
                plantCode: audit.plant.code,
                plantName: audit.plant.name,
                startDate: audit.visitStartDate,
                endDate: audit.visitEndDate,
                isLocked: audit.status !== "PLANNED" && audit.status !== "IN_PROGRESS",
                completedAt: audit.status === "SIGNED_OFF" ? audit.completedAt ?? audit.visitEndDate : null,
                progress: audit.progress,
              }))
              .sort((a, b) => {
                const aDate = new Date(a.startDate ?? a.completedAt ?? "").getTime() || 0;
                const bDate = new Date(b.startDate ?? b.completedAt ?? "").getTime() || 0;
                return bDate - aDate;
              })
              .slice(0, 3);
            setRecentAudits(recentList);
          }
        }

        if (overviewRes.ok) {
          const overviewJson = await overviewRes.json();
          if (overviewJson.ok) {
            setObservationMetrics(overviewJson);
          }
        }

        if (observationsRes.ok) {
          const observationsJson = await observationsRes.json();
          if (observationsJson.ok) {
            const shaped = (observationsJson.observations as any[]).map((obs) => ({
              id: obs.id,
              title: obs.title,
              riskCategory: obs.riskCategory,
              concernedProcess: obs.concernedProcess,
              currentStatus: obs.currentStatus,
              createdAt: obs.createdAt,
              audit: obs.audit,
              plant: obs.plant,
            }));
            setObservations(shaped);
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const totalObservations = observationMetrics?.total ?? 0;
  const overdue = observationMetrics?.due.overdue ?? 0;
  const dueSoon = observationMetrics?.due.dueSoon ?? 0;
  const dueSplit = partitionDueSoon(dueSoon);
  const signedOff = auditMetrics?.statusCounts["SIGNED_OFF"] ?? 0;
  const activeAudits = (auditMetrics?.total ?? 0) - signedOff;

  const topCards = [
    {
      id: "audits",
      label: "Total Audits",
      subLabel: `${activeAudits} active, ${signedOff} completed`,
      value: auditMetrics?.total ?? 0,
      icon: ClipboardList,
      accent: "bg-[var(--c-bacSec)] text-[var(--c-texPri)]",
    },
    {
      id: "observations",
      label: "Total Observations",
      subLabel: `${totalObservations - (observationMetrics?.statusCounts?.RESOLVED ?? 0)} open, ${
        observationMetrics?.statusCounts?.RESOLVED ?? 0
      } resolved`,
      value: totalObservations,
      icon: Eye,
      accent: "bg-[var(--ca-palUiBlu100)] text-[var(--c-palUiBlu700)]",
    },
    {
      id: "overdue",
      label: "Overdue Actions",
      subLabel: `${Math.max(overdue - 1, 0)} high priority outstanding`,
      value: overdue,
      icon: AlertTriangle,
      accent: "bg-[var(--cl-palPin100)] text-[var(--cd-palPin500)]",
    },
    {
      id: "dueSoon",
      label: "Due Soon",
      subLabel: `${dueSplit.thisWeek} this week, ${dueSplit.nextWeek} next week`,
      value: dueSoon,
      icon: Clock,
      accent: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)]",
    },
  ];

  const riskBreakdown = observationMetrics
    ? [
        { key: "A", label: "Category A (Critical)", value: observationMetrics.byRisk.A, color: "bg-[var(--c-palUiRed600)]" },
        { key: "B", label: "Category B (High)", value: observationMetrics.byRisk.B, color: "bg-[var(--cd-palOra500)]" },
        { key: "C", label: "Category C (Medium)", value: observationMetrics.byRisk.C, color: "bg-[var(--c-texSec)]/70" },
      ]
    : [];

  const observationStatuses = useMemo(() => {
    if (!observationMetrics?.statusCounts) return [];
    return Object.entries(observationMetrics.statusCounts)
      .map(([status, count]) => ({
        status,
        label: humanizeStatus(status),
        count,
        dotClass: STATUS_DOT_CLASSES[status] ?? "bg-[var(--c-texSec)]/40",
      }))
      .sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99),
      );
  }, [observationMetrics]);

  const processAreas = useMemo(() => {
    if (!observations.length) return { max: 0, entries: [] as Array<{ key: string; label: string; count: number }> };
    const map = new Map<string, number>();
    observations.forEach((obs) => {
      if (!obs.concernedProcess) return;
      const key = obs.concernedProcess;
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    const entries = Array.from(map.entries())
      .map(([key, count]) => ({ key, label: PROCESS_LABELS[key] ?? humanizeStatus(key), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4);
    const max = entries.reduce((acc, item) => (item.count > acc ? item.count : acc), 0);
    return { max, entries };
  }, [observations]);

  const actionItems = useMemo(() => {
    if (!observations.length) return [] as ObservationListItem[];
    const riskOrder: Record<string, number> = { A: 3, B: 2, C: 1 };
    return observations
      .filter((obs) => obs.currentStatus && obs.currentStatus !== "RESOLVED")
      .sort((a, b) => {
        const riskDiff = (riskOrder[a.riskCategory ?? "C"] ?? 0) - (riskOrder[b.riskCategory ?? "C"] ?? 0);
        if (riskDiff !== 0) return riskDiff > 0 ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
      .slice(0, 3);
  }, [observations]);

  if (loading) {
    return (
      <PageContainer className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-72 rounded-xl" />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-40 rounded-3xl" />
          ))}
            </div>
        <div className="grid gap-5 xl:grid-cols-3">
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
          <Skeleton className="h-72 rounded-3xl" />
            </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-3xl" />
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--c-texPri)]">Dashboard</h1>
          <p className="text-sm md:text-base text-[var(--c-texSec)]">
            Overview of audit progress, observation health, and high-priority actions.
          </p>
      </div>
        <Button asChild variant="ghost" size="sm" className="text-[var(--c-palUiBlu700)]">
          <Link href="/reports">Go to reports</Link>
        </Button>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {topCards.map((card) => (
          <Card
            key={card.id}
            className={cn(
              "rounded-3xl border-none shadow-none transition-shadow hover:shadow-card",
              card.accent,
            )}
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardDescription className="text-xs uppercase tracking-wide text-[var(--c-texSec)]/80">
                  {card.label}
                </CardDescription>
                <CardTitle className="text-5xl font-semibold leading-none text-[inherit]">
                  {card.value}
                </CardTitle>
          </div>
              <div className="rounded-full border border-[var(--border-color-regular)] bg-[rgba(255,255,255,0.45)] p-2">
                <card.icon className="h-5 w-5 text-[inherit]" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--c-texSec)]">{card.subLabel}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <Card className="rounded-3xl border-[var(--border-color-regular)]">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--c-texPri)]">Risk distribution</CardTitle>
            <CardDescription className="text-sm text-[var(--c-texSec)]">
              Observations by criticality tier.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {riskBreakdown.map((row) => {
              const percentage = totalObservations ? Math.round((row.value / totalObservations) * 100) : 0;
              return (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-[var(--c-texPri)]">
                    <span>{row.label}</span>
                    <span>{row.value}</span>
                      </div>
                  <div className="h-2 w-full rounded-full bg-[var(--c-bacSec)]">
                    <div
                      className={cn("h-2 rounded-full transition-all", row.color)}
                      style={{ width: `${percentage}%` }}
                    />
                    </div>
                </div>
              );
            })}
            {riskBreakdown.length === 0 && (
              <p className="text-sm text-[var(--c-texTer)]">
                No active observations yet. Once observations are recorded, we’ll visualise their risk distribution here.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[var(--border-color-regular)]">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--c-texPri)]">Observation status</CardTitle>
            <CardDescription className="text-sm text-[var(--c-texSec)]">
              Current workflow stages across open items.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {observationStatuses.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-4 py-6 text-sm text-[var(--c-texTer)]">
                No observations available yet. Once data is captured, the distribution will display here.
              </div>
            )}
            {observationStatuses.map((item) => (
              <div
                key={item.status}
                className="flex items-center justify-between rounded-xl border border-[var(--border-color-regular)] px-4 py-3"
              >
                <div className="flex items-center gap-3 text-sm text-[var(--c-texPri)]">
                  <span className={cn("h-2.5 w-2.5 rounded-full", item.dotClass)} />
                  <span>{item.label}</span>
                </div>
                <Badge className="bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent px-3 py-1 text-xs">
                  {item.count}
                </Badge>
          </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[var(--border-color-regular)]">
          <CardHeader>
            <CardTitle className="text-lg text-[var(--c-texPri)]">Process areas</CardTitle>
            <CardDescription className="text-sm text-[var(--c-texSec)]">
              Top areas with open observations this cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {processAreas.entries.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-4 py-6 text-sm text-[var(--c-texTer)]">
                Process insights will appear once observations include a process mapping.
              </div>
            )}
            {processAreas.entries.map((area) => {
              const width = processAreas.max ? Math.round((area.count / processAreas.max) * 100) : 0;
              return (
                <div key={area.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-[var(--c-texPri)]">
                    <span>{area.label}</span>
                    <span>{area.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[var(--c-bacSec)]">
                    <div className="h-2 rounded-full bg-[var(--c-palUiBlu600)]" style={{ width: `${width}%` }} />
                  </div>
          </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card className="rounded-3xl border-[var(--border-color-regular)]">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
            <div>
                <CardTitle className="text-lg text-[var(--c-texPri)]">Recent audits</CardTitle>
                <CardDescription className="text-sm text-[var(--c-texSec)]">
                  Latest audit activity across plants with quick access to detail.
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-[var(--c-texSec)]">
                <Link href="/audits">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentAudits.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-5 py-6 text-sm text-[var(--c-texTer)]">
                No audits yet. Create one to see activity here.
                      </div>
            )}
            {recentAudits.map((audit) => {
              const badgeClasses = audit.completedAt
                ? "bg-[var(--cl-palGre100)] text-[var(--cd-palGre500)] border-transparent"
                : audit.isLocked
                ? "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent"
                : "bg-[var(--ca-palUiBlu100)] text-[var(--c-palUiBlu700)] border-transparent";
              return (
                <div key={audit.id} className="space-y-3 rounded-2xl border border-[var(--border-color-regular)] p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-[var(--c-texPri)]">
                        {audit.title ?? "Untitled audit"}
                      </h4>
                      <p className="text-xs text-[var(--c-texSec)]">
                        {audit.plantCode} — {audit.plantName}
                      </p>
                    </div>
                    <Badge className={cn("w-fit text-xs", badgeClasses)}>
                      {audit.completedAt ? "Completed" : audit.isLocked ? "Locked" : "In progress"}
                    </Badge>
                      </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--c-texTer)]">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>{formatDateRange(audit.startDate, audit.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ClipboardList className="h-3.5 w-3.5" />
                      <span>
                        {audit.progress?.done ?? 0}/{audit.progress?.total ?? 0} resolved
                      </span>
                    </div>
                    <Link href={`/audits/${audit.id}`} className="ml-auto text-[var(--c-palUiBlu700)]">
                      View
                    </Link>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-[var(--border-color-regular)]">
          <CardHeader className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg text-[var(--c-texPri)]">Action items requiring attention</CardTitle>
                <CardDescription className="text-sm text-[var(--c-texSec)]">
                  Critical and high priority observations to follow up.
                </CardDescription>
                    </div>
              <Button asChild variant="ghost" size="sm" className="gap-1 text-xs text-[var(--c-texSec)]">
                <Link href="/observations">
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
                    </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {actionItems.length === 0 && (
              <div className="rounded-xl border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-5 py-6 text-sm text-[var(--c-texTer)]">
                No high priority observations at the moment. Outstanding items will surface here automatically.
                    </div>
            )}
            {actionItems.map((obs) => (
              <div key={obs.id} className="space-y-3 rounded-2xl border border-[var(--border-color-regular)] p-5">
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium text-[var(--c-texPri)]">{obs.title}</h4>
                  <p className="text-xs text-[var(--c-texSec)]">
                    {obs.audit?.title ?? "Audit"} • {obs.plant.code} {obs.plant.name}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {obs.riskCategory && (
                    <Badge className={cn("text-xs", RISK_BADGE_CLASSES[obs.riskCategory])}>
                      {obs.riskCategory === "A"
                        ? "Critical"
                        : obs.riskCategory === "B"
                        ? "High"
                        : "Medium"}
                    </Badge>
                  )}
                  {obs.currentStatus && (
                    <Badge className={cn("text-xs", STATUS_BADGE_CLASSES[obs.currentStatus] ?? "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent")}>
                      {humanizeStatus(obs.currentStatus)}
                    </Badge>
                      )}
                  {obs.concernedProcess && (
                    <Badge className="text-xs bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent">
                      {PROCESS_LABELS[obs.concernedProcess] ?? humanizeStatus(obs.concernedProcess)}
                    </Badge>
                      )}
                    </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
