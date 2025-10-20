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
        <div>
          <h1 className="text-4xl font-bold text-neutral-900">Dashboard</h1>
          <p className="text-base text-neutral-600 mt-2">Overview of your audit platform</p>
        </div>
        <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6">
          <Card padding="lg">
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-neutral-200 rounded w-1/3"></div>
              <div className="h-10 bg-neutral-200 rounded w-1/4"></div>
            </div>
          </Card>
          <Card padding="lg">
            <div className="animate-pulse space-y-4">
              <div className="h-5 bg-neutral-200 rounded w-1/3"></div>
              <div className="h-10 bg-neutral-200 rounded w-1/4"></div>
            </div>
          </Card>
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-base text-neutral-600 mt-2">Overview of your audit platform</p>
      </div>

      <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audits Card */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Audits</h2>
            <Link
              href="/audits"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-4xl font-bold text-neutral-900">
                {auditMetrics?.total || 0}
              </div>
              <div className="text-sm text-neutral-600 mt-1">Total audits</div>
            </div>

            {auditMetrics && auditMetrics.total > 0 && (
              <div className="space-y-3 pt-4 border-t border-neutral-200">
                <div className="text-sm font-semibold text-neutral-700">Status breakdown:</div>
                <div className="space-y-2">
                  {Object.entries(auditMetrics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600 capitalize">
                        {status.toLowerCase().replace('_', ' ')}
                      </span>
                      <div className="min-w-[50px] flex justify-end">
                        <Badge variant={getStatusVariant(status)}>{count}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Observations Card */}
        <Card padding="lg">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-neutral-900">Observations</h2>
            <Link
              href="/observations"
              className="text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors flex items-center gap-1"
            >
              View all
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-4xl font-bold text-neutral-900">
                {observationMetrics?.total || 0}
              </div>
              <div className="text-sm text-neutral-600 mt-1">Total observations</div>
            </div>

            {observationMetrics && observationMetrics.total > 0 && (
              <div className="space-y-4 pt-4 border-t border-neutral-200">
                <div>
                  <div className="text-sm font-semibold text-neutral-700 mb-2">Status:</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Pending</span>
                      <div className="min-w-[50px] flex justify-end">
                        <Badge variant="neutral">{observationMetrics.statusCounts.PENDING}</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">In Progress</span>
                      <div className="min-w-[50px] flex justify-end">
                        <Badge variant="primary">{observationMetrics.statusCounts.IN_PROGRESS}</Badge>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-neutral-600">Resolved</span>
                      <div className="min-w-[50px] flex justify-end">
                        <Badge variant="success">{observationMetrics.statusCounts.RESOLVED}</Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="text-sm font-semibold text-neutral-700 mb-2">Risk levels:</div>
                  <div className="flex gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Badge variant="error">A</Badge>
                      <span className="text-sm text-neutral-600">{observationMetrics.byRisk.A}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="warning">B</Badge>
                      <span className="text-sm text-neutral-600">{observationMetrics.byRisk.B}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">C</Badge>
                      <span className="text-sm text-neutral-600">{observationMetrics.byRisk.C}</span>
                    </div>
                  </div>
                </div>

                {(observationMetrics.due.overdue > 0 || observationMetrics.due.dueSoon > 0) && (
                  <div className="pt-2">
                    <div className="text-sm font-semibold text-neutral-700 mb-2">Attention needed:</div>
                    <div className="space-y-2">
                      {observationMetrics.due.overdue > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="error">{observationMetrics.due.overdue}</Badge>
                          <span className="text-neutral-600">overdue</span>
                        </div>
                      )}
                      {observationMetrics.due.dueSoon > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Badge variant="warning">{observationMetrics.due.dueSoon}</Badge>
                          <span className="text-neutral-600">due soon</span>
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