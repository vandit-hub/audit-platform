"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Button } from "@/components/ui/v2/button";
import { Input } from "@/components/ui/v2/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/v2/select";
import { Badge } from "@/components/ui/v2/badge";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { PageContainer } from "@/components/v2/PageContainer";

type KPI = {
  total: number;
  statusCounts: { PENDING: number; IN_PROGRESS: number; RESOLVED: number };
  approvalCounts: { DRAFT: number; SUBMITTED: number; APPROVED: number; REJECTED: number };
  byRisk: { A: number; B: number; C: number };
  published: { published: number; unpublished: number };
  due: { overdue: number; dueSoon: number; windowDays: number };
};

type TargetRow = {
  id: string;
  observationId: string;
  plan: string;
  owner?: string | null;
  targetDate: string;
  status?: string | null;
  retest?: "RETEST_DUE" | "PASS" | "FAIL" | null;
  plant: { code: string; name: string };
  observationStatus: string;
};

type Plant = { id: string; code: string; name: string };
type Audit = {
  id: string;
  title?: string | null;
  visitStartDate?: string | null;
  visitEndDate?: string | null;
  plant: Plant;
};

export default function ReportsPage() {
  const { showSuccess } = useToast();
  const [days, setDays] = useState(14);
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [overdue, setOverdue] = useState<TargetRow[]>([]);
  const [dueSoon, setDueSoon] = useState<TargetRow[]>([]);
  const [fetchingReports, setFetchingReports] = useState(false);

  // Filter data
  const [plants, setPlants] = useState<Plant[]>([]);
  const [audits, setAudits] = useState<Audit[]>([]);

  // Filter state
  const [plantId, setPlantId] = useState("");
  const [auditId, setAuditId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [risk, setRisk] = useState("");
  const [process, setProcess] = useState("");
  const [status, setStatus] = useState("");
  const [published, setPublished] = useState("");

  const ALL_VALUE = "__all";
  const toSelectValue = (value: string) => (value === "" ? ALL_VALUE : value);
  const fromSelectValue = (value: string) => (value === ALL_VALUE ? "" : value);

  const savePreset = useCallback(() => {
    localStorage.setItem("reports.filters", JSON.stringify({ plantId, auditId, startDate, endDate, risk, process, status, published, days }));
  }, [plantId, auditId, startDate, endDate, risk, process, status, published, days]);

  const loadPreset = useCallback(() => {
    const raw = localStorage.getItem("reports.filters");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProcess(v.process || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      if (v.days) setDays(v.days);
    } catch {
      // Ignore
    }
  }, []);

  const loadPresetManual = () => {
    const raw = localStorage.getItem("reports.filters");
    if (!raw) return;
    try {
      const v = JSON.parse(raw);
      setPlantId(v.plantId || "");
      setAuditId(v.auditId || "");
      setStartDate(v.startDate || "");
      setEndDate(v.endDate || "");
      setRisk(v.risk || "");
      setProcess(v.process || "");
      setStatus(v.status || "");
      setPublished(v.published || "");
      if (v.days) setDays(v.days);
    } catch {
      // Ignore
    }
  };

  const resetFilters = useCallback(() => {
    setPlantId("");
    setAuditId("");
    setStartDate("");
    setEndDate("");
    setRisk("");
    setProcess("");
    setStatus("");
    setPublished("");
    setDays(14);
    localStorage.removeItem("reports.filters");
  }, []);

  const exportPeriodReport = () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    window.location.href = `/api/v1/reports/period/export?${qs.toString()}`;
    showSuccess("Period report export started! Download will begin shortly.");
  };

  const exportRetestReport = () => {
    const qs = new URLSearchParams();
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);
    window.location.href = `/api/v1/reports/retest/export?${qs.toString()}`;
    showSuccess("Retest report export started! Download will begin shortly.");
  };

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    qs.set("days", days.toString());
    if (plantId) qs.set("plantId", plantId);
    if (auditId) qs.set("auditId", auditId);
    if (startDate) qs.set("startDate", startDate);
    if (endDate) qs.set("endDate", endDate);
    if (risk) qs.set("risk", risk);
    if (process) qs.set("process", process);
    if (status) qs.set("status", status);
    if (published) qs.set("published", published);

    setFetchingReports(true);
    try {
    const [oRes, tRes] = await Promise.all([
        fetch(`/api/v1/reports/overview?${qs.toString()}`, {
          cache: "no-store",
        }),
        fetch(`/api/v1/reports/targets?${qs.toString()}`, {
          cache: "no-store",
        }),
    ]);

      if (oRes.ok) {
        setKpi(await oRes.json());
      } else {
        setKpi(null);
      }

      if (tRes.ok) {
    const tj = await tRes.json();
      setOverdue(tj.overdue || []);
      setDueSoon(tj.dueSoon || []);
      } else {
        setOverdue([]);
        setDueSoon([]);
      }
    } catch (error) {
      console.error("Failed to load reports overview", error);
      setKpi(null);
      setOverdue([]);
      setDueSoon([]);
    } finally {
      setFetchingReports(false);
    }
  }, [
    days,
    plantId,
    auditId,
    startDate,
    endDate,
    risk,
    process,
    status,
    published,
  ]);

  const loadMeta = async () => {
    const [pRes, aRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/audits", { cache: "no-store" })
    ]);
    const pJ = await pRes.json();
    const aJ = await aRes.json();
    if (pRes.ok) setPlants(pJ.plants || []);
    if (aRes.ok) setAudits(aJ.audits || []);
  };

  useEffect(() => {
    loadPreset();
    loadMeta();
  }, [loadPreset]);

  useEffect(() => {
    load();
  }, [load]);

  const overviewCards = useMemo(
    () => [
      {
        id: "total",
        label: "Total observations",
        value: kpi?.total ?? 0,
        helper: "Across current filters",
        style: { background: "var(--c-bacSec)" },
      },
      {
        id: "pending",
        label: "Pending MR",
        value: kpi?.statusCounts.PENDING ?? 0,
        helper: "Awaiting management response",
        style: {
          background: "var(--cl-palOra100)",
          color: "var(--cd-palOra500)",
        },
      },
      {
        id: "overdue",
        label: "Overdue actions",
        value: overdue.length,
        helper: "Action plans past target date",
        style: {
          background: "var(--cl-palPin100)",
          color: "var(--cd-palPin500)",
        },
      },
      {
        id: "dueSoon",
        label: "Due soon",
        value: dueSoon.length,
        helper: `Due within next ${days} days`,
        style: {
          background: "var(--ca-palUiBlu100)",
          color: "var(--c-palUiBlu700)",
        },
      },
    ],
    [kpi, overdue.length, dueSoon.length, days],
  );

  const approvalItems = [
    { label: "Draft", value: kpi?.approvalCounts.DRAFT ?? 0, color: "var(--c-texSec)" },
    { label: "Submitted", value: kpi?.approvalCounts.SUBMITTED ?? 0, color: "var(--cd-palOra500)" },
    { label: "Approved", value: kpi?.approvalCounts.APPROVED ?? 0, color: "var(--cd-palGre500)" },
    { label: "Rejected", value: kpi?.approvalCounts.REJECTED ?? 0, color: "var(--c-palUiRed600)" },
  ];

  const publishingItems = [
    {
      label: "Published",
      value: kpi?.published.published ?? 0,
      className:
        "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]",
    },
    {
      label: "Unpublished",
      value: kpi?.published.unpublished ?? 0,
      className:
        "bg-[var(--c-bacSec)] border-transparent text-[var(--c-texSec)]",
    },
  ];

  const riskItems = [
    {
      label: "Category A (Critical)",
      value: kpi?.byRisk.A ?? 0,
      className:
        "bg-[var(--c-palUiRed100)] border-transparent text-[var(--c-palUiRed600)]",
    },
    {
      label: "Category B (High)",
      value: kpi?.byRisk.B ?? 0,
      className:
        "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]",
    },
    {
      label: "Category C (Medium)",
      value: kpi?.byRisk.C ?? 0,
      className:
        "bg-[var(--c-bacSec)] border-transparent text-[var(--c-texSec)]",
    },
  ];

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString();

  const retestBadgeClass = (state: TargetRow["retest"]) => {
    if (state === "RETEST_DUE") {
      return "bg-[var(--cl-palOra100)] border-transparent text-[var(--cd-palOra500)]";
    }
    if (state === "PASS") {
      return "bg-[var(--cl-palGre100)] border-transparent text-[var(--cd-palGre500)]";
    }
    if (state === "FAIL") {
      return "bg-[var(--c-palUiRed100)] border-transparent text-[var(--c-palUiRed600)]";
    }
    return "";
  };

  return (
    <PageContainer className="space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--c-texPri)]">
            Reports
          </h1>
          <p className="text-sm md:text-base text-[var(--c-texSec)]">
            Analyse observation trends, manage exports, and monitor deadlines.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            Refresh data
          </Button>
          <Button variant="outline" size="sm" onClick={savePreset}>
            Save preset
          </Button>
          <Button variant="outline" size="sm" onClick={loadPresetManual}>
            Load preset
          </Button>
      </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => (
          <Card
            key={card.id}
            className="border-none shadow-none"
            style={card.style}
          >
            <CardHeader className="space-y-1">
              <CardDescription className="text-xs uppercase tracking-wide">
                {card.label}
              </CardDescription>
              <CardTitle className="text-3xl font-semibold">
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-[var(--c-texSec)]">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Adjust filters to refine analytics and exports. Settings persist for
            your next visit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-plant"
              >
                Plant
              </label>
              <Select
                value={toSelectValue(plantId)}
                onValueChange={(value) => setPlantId(fromSelectValue(value))}
              >
                <SelectTrigger id="reports-plant">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-audit"
              >
                Audit
              </label>
              <Select
                value={toSelectValue(auditId)}
                onValueChange={(value) => setAuditId(fromSelectValue(value))}
              >
                <SelectTrigger id="reports-audit">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  {audits.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title || "Untitled"} — {a.plant.code} (
                      {a.visitStartDate
                        ? new Date(a.visitStartDate).toLocaleDateString()
                        : "?"}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-start-date"
              >
                Start date
              </label>
            <Input
                id="reports-start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-end-date"
              >
                End date
              </label>
            <Input
                id="reports-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-risk"
              >
                Risk category
              </label>
              <Select
                value={toSelectValue(risk)}
                onValueChange={(value) => setRisk(fromSelectValue(value))}
              >
                <SelectTrigger id="reports-risk">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-process"
              >
                Process
              </label>
              <Select
                value={toSelectValue(process)}
                onValueChange={(value) => setProcess(fromSelectValue(value))}
              >
                <SelectTrigger id="reports-process">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="O2C">O2C</SelectItem>
                  <SelectItem value="P2P">P2P</SelectItem>
                  <SelectItem value="R2R">R2R</SelectItem>
                  <SelectItem value="INVENTORY">Inventory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-status"
              >
                Status
              </label>
              <Select
                value={toSelectValue(status)}
                onValueChange={(value) => setStatus(fromSelectValue(value))}
              >
                <SelectTrigger id="reports-status">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All</SelectItem>
                  <SelectItem value="PENDING_MR">Pending MR</SelectItem>
                  <SelectItem value="MR_UNDER_REVIEW">
                    MR Under Review
                  </SelectItem>
                  <SelectItem value="REFERRED_BACK">Referred Back</SelectItem>
                  <SelectItem value="OBSERVATION_FINALISED">
                    Observation Finalised
                  </SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label
                className="text-sm font-medium text-[var(--c-texSec)]"
                htmlFor="reports-published"
              >
                Published
              </label>
              <Select
                value={toSelectValue(published)}
                onValueChange={(value) => setPublished(fromSelectValue(value))}
              >
                <SelectTrigger id="reports-published">
                  <SelectValue placeholder="Any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Any</SelectItem>
                  <SelectItem value="1">Published</SelectItem>
                  <SelectItem value="0">Unpublished</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border-color-regular)] pt-4">
            <Button variant="secondary" size="sm" onClick={resetFilters}>
              Reset filters
            </Button>
            <div className="ml-auto flex flex-wrap gap-3">
              <Button size="sm" onClick={exportPeriodReport}>
                Download period report
              </Button>
              <Button size="sm" onClick={exportRetestReport}>
                Download retest report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Due window</CardTitle>
            <CardDescription>
              Adjust the upcoming timeframe to highlight action plans due soon.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label
            className="text-sm font-medium text-[var(--c-texSec)]"
            htmlFor="due-window"
          >
            Days
          </label>
          <Input
            id="due-window"
            type="number"
            min={1}
            max={60}
            value={days.toString()}
            onChange={(e) =>
              setDays(parseInt(e.target.value || "14", 10))
            }
            className="w-24"
          />
          <p className="text-sm text-[var(--c-texSec)]">
            Show action plans due within this timeframe.
          </p>
        </CardContent>
      </Card>

      {fetchingReports ? (
        <div className="grid gap-5 xl:grid-cols-3">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : kpi ? (
        <>
          <section className="grid gap-5 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-[var(--c-texTer)]">
                  Approvals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {approvalItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-[var(--border-color-regular)] px-3 py-2"
                  >
                    <span style={{ color: item.color }}>{item.label}</span>
                    <span className="font-semibold text-[var(--c-texPri)]">
                      {item.value}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-[var(--c-texTer)]">
                  Publication status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {publishingItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[var(--c-texSec)]">
                      {item.label}
                    </span>
                    <Badge className={item.className}>{item.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wide text-[var(--c-texTer)]">
                  Risk categories
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {riskItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[var(--c-texSec)]">
                      {item.label}
                    </span>
                    <Badge className={item.className}>{item.value}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <Card className="border border-dashed border-[var(--border-color-regular)]">
              <CardHeader>
                <CardTitle>Observation trend</CardTitle>
                <CardDescription>
                  Placeholder for monthly observation trend chart from the Figma
                  design.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--c-texSec)]">
                  Requires backend support to provide time-series data grouped
                  by month.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-dashed border-[var(--border-color-regular)]">
              <CardHeader>
                <CardTitle>Process heatmap</CardTitle>
                <CardDescription>
                  Placeholder for process heatmap demonstrating the new design’s
                  analytics vision.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--c-texSec)]">
                  We’ll surface this once process-level metrics are available
                  from the reporting API.
                </p>
              </CardContent>
            </Card>
          </section>
        </>
      ) : (
        <Card>
          <CardContent className="rounded-lg border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-5 py-6 text-sm text-[var(--c-texSec)]">
            No report data available yet. Adjust filters and refresh to generate
            analytics.
          </CardContent>
        </Card>
      )}

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Overdue action plans</CardTitle>
            <CardDescription>
              Action plans past their target date requiring immediate attention.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetchingReports ? (
              <Skeleton className="h-48 rounded-md" />
            ) : overdue.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-5 py-8 text-center text-sm text-[var(--c-texSec)]">
                No overdue action plans.
              </div>
            ) : (
          <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-[var(--c-bacSec)] text-[var(--c-texTer)]">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Plant
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Plan
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Target
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Owner
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Retest
                      </th>
                </tr>
              </thead>
                  <tbody>
                    {overdue.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`border-b border-[var(--border-color-regular)] last:border-0 ${
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-[var(--c-bacSec)]/40"
                        }`}
                      >
                        <td className="px-5 py-4 font-semibold text-[var(--c-texPri)]">
                          {row.plant.code}
                        </td>
                        <td
                          className="px-5 py-4 text-[var(--c-texSec)]"
                          title={row.plan}
                        >
                          {row.plan}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {formatDate(row.targetDate)}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {row.owner ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {row.retest ? (
                            <Badge className={retestBadgeClass(row.retest)}>
                              {row.retest === "RETEST_DUE"
                                ? "Due"
                                : row.retest === "PASS"
                                ? "Pass"
                                : "Fail"}
                            </Badge>
                          ) : (
                            <span className="text-[var(--c-texTer)]">—</span>
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-col gap-1">
            <CardTitle>Due soon</CardTitle>
            <CardDescription>
              Action plans scheduled within the next {days} days.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetchingReports ? (
              <Skeleton className="h-48 rounded-md" />
            ) : dueSoon.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-5 py-8 text-center text-sm text-[var(--c-texSec)]">
                No action plans due in this window.
              </div>
            ) : (
          <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="bg-[var(--c-bacSec)] text-[var(--c-texTer)]">
                    <tr>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Plant
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Plan
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Target
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Owner
                      </th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                        Retest
                      </th>
                </tr>
              </thead>
                  <tbody>
                    {dueSoon.map((row, index) => (
                      <tr
                        key={row.id}
                        className={`border-b border-[var(--border-color-regular)] last:border-0 ${
                          index % 2 === 0
                            ? "bg-white"
                            : "bg-[var(--c-bacSec)]/40"
                        }`}
                      >
                        <td className="px-5 py-4 font-semibold text-[var(--c-texPri)]">
                          {row.plant.code}
                        </td>
                        <td
                          className="px-5 py-4 text-[var(--c-texSec)]"
                          title={row.plan}
                        >
                          {row.plan}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {formatDate(row.targetDate)}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {row.owner ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-[var(--c-texSec)]">
                          {row.retest ? (
                            <Badge className={retestBadgeClass(row.retest)}>
                              {row.retest === "RETEST_DUE"
                                ? "Due"
                                : row.retest === "PASS"
                                ? "Pass"
                                : "Fail"}
                            </Badge>
                          ) : (
                            <span className="text-[var(--c-texTer)]">—</span>
                          )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            )}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}