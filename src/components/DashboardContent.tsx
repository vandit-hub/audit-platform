"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

type AuditMetrics = {
  total: number;
  statusCounts: Record<string, number>;
};

type ObservationMetrics = {
  total: number;
  statusCounts: { PENDING: number; IN_PROGRESS: number; RESOLVED: number };
  byRisk: { A: number; B: number; C: number };
  published: { published: number; unpublished: number };
  due: { overdue: number; dueSoon: number };
};

export default function DashboardContent() {
  const [auditMetrics, setAuditMetrics] = useState<AuditMetrics | null>(null);
  const [observationMetrics, setObservationMetrics] = useState<ObservationMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const [auditsRes, obsRes] = await Promise.all([
          fetch("/api/v1/audits", { cache: "no-store" }),
          fetch("/api/v1/reports/overview", { cache: "no-store" })
        ]);

        if (auditsRes.ok) {
          const auditsData = await auditsRes.json();
          if (auditsData.ok) {
            const audits = auditsData.audits;
            const statusCounts: Record<string, number> = {};

            audits.forEach((audit: any) => {
              statusCounts[audit.status] = (statusCounts[audit.status] || 0) + 1;
            });

            setAuditMetrics({
              total: audits.length,
              statusCounts
            });
          }
        }

        if (obsRes.ok) {
          const obsData = await obsRes.json();
          if (obsData.ok) {
            setObservationMetrics(obsData);
          }
        }
      } catch (error) {
        console.error("Failed to load dashboard metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-300 bg-gray-200 animate-pulse" />
          <div className="h-4 w-64 rounded-300 bg-gray-100 animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} variant="stat">
              <div className="space-y-3 py-4 text-center">
                <div className="mx-auto h-3 w-20 rounded-300 bg-gray-200 animate-pulse" />
                <div className="mx-auto h-10 w-16 rounded-300 bg-gray-100 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <Card key={index} variant="feature">
              <div className="space-y-4">
                <div className="h-5 w-32 rounded-300 bg-gray-200 animate-pulse" />
                <div className="h-4 w-48 rounded-300 bg-gray-100 animate-pulse" />
                <div className="h-32 rounded-400 bg-gray-100 animate-pulse" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getStatusVariant = (status: string): "neutral" | "primary" | "warning" | "success" | "error" => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('planned')) return 'neutral';
    if (statusLower.includes('progress')) return 'primary';
    if (statusLower.includes('submitted')) return 'warning';
    if (statusLower.includes('signed')) return 'success';
    return 'neutral';
  };

  const formatNumber = (value?: number) =>
    typeof value === "number" ? value.toLocaleString() : "—";

  const statCards = [
    { label: "Total audits", value: auditMetrics?.total },
    { label: "Observations", value: observationMetrics?.total },
    { label: "Overdue actions", value: observationMetrics?.due.overdue },
    { label: "Due soon", value: observationMetrics?.due.dueSoon }
  ];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Dashboard</h1>
        <p className="text-lg text-text-medium">
          Overview of audits, observations, and follow-up progress
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(({ label, value }) => (
          <Card key={label} variant="stat">
            <div className="space-y-3 py-4 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-text-light">
                {label}
              </p>
              <p className="text-4xl font-semibold text-gray-900">{formatNumber(value)}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card variant="feature" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Audits</h2>
              <p className="text-sm text-text-light">Live status of planned and active audits</p>
            </div>
            <Link
              href="/audits"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-4xl font-semibold text-gray-900">{formatNumber(auditMetrics?.total)}</p>
              <p className="mt-1 text-sm text-text-light">Total audits</p>
            </div>

            {auditMetrics && auditMetrics.total > 0 && (
              <div className="space-y-3 border-t border-border-regular pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-text-light">
                  Status breakdown
                </p>
                <div className="space-y-2">
                  {Object.entries(auditMetrics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-text-medium">
                        {status.toLowerCase().replace('_', ' ')}
                      </span>
                      <Badge variant={getStatusVariant(status)}>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card variant="feature" className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Observations</h2>
              <p className="text-sm text-text-light">Workflow and risk insights</p>
            </div>
            <Link
              href="/observations"
              className="flex items-center gap-1 text-sm font-medium text-blue-600 transition-colors duration-200 hover:text-blue-700"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-4xl font-semibold text-gray-900">{formatNumber(observationMetrics?.total)}</p>
              <p className="mt-1 text-sm text-text-light">Total observations</p>
            </div>

            {observationMetrics && observationMetrics.total > 0 && (
              <div className="space-y-4 border-t border-border-regular pt-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Status</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-medium">Pending</span>
                      <Badge variant="neutral">{observationMetrics.statusCounts.PENDING}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-medium">In Progress</span>
                      <Badge variant="primary">{observationMetrics.statusCounts.IN_PROGRESS}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-text-medium">Resolved</span>
                      <Badge variant="success">{observationMetrics.statusCounts.RESOLVED}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Risk levels</p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="error">A</Badge>
                      <span className="text-text-medium">{formatNumber(observationMetrics.byRisk.A)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="warning">B</Badge>
                      <span className="text-text-medium">{formatNumber(observationMetrics.byRisk.B)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="neutral">C</Badge>
                      <span className="text-text-medium">{formatNumber(observationMetrics.byRisk.C)}</span>
                    </div>
                  </div>
                </div>

                {(observationMetrics.due.overdue > 0 || observationMetrics.due.dueSoon > 0) && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-light">Attention needed</p>
                    <div className="space-y-2 text-sm">
                      {observationMetrics.due.overdue > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="error">{observationMetrics.due.overdue}</Badge>
                          <span className="text-text-medium">overdue</span>
                        </div>
                      )}
                      {observationMetrics.due.dueSoon > 0 && (
                        <div className="flex items-center gap-2">
                          <Badge variant="warning">{observationMetrics.due.dueSoon}</Badge>
                          <span className="text-text-medium">due soon</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}