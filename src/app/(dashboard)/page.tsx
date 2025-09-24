"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

export default function DashboardHome() {
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
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 bg-white rounded shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="p-6 bg-white rounded shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audits Card */}
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Audits</h2>
            <Link href="/audits" className="text-sm text-blue-600 hover:text-blue-800">
              View all →
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {auditMetrics?.total || 0}
              </div>
              <div className="text-sm text-gray-500">Total audits</div>
            </div>

            {auditMetrics && auditMetrics.total > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">Status breakdown:</div>
                <div className="space-y-1">
                  {Object.entries(auditMetrics.statusCounts).map(([status, count]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="text-gray-600 capitalize">
                        {status.toLowerCase().replace('_', ' ')}
                      </span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Observations Card */}
        <div className="p-6 bg-white rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Observations</h2>
            <Link href="/observations" className="text-sm text-blue-600 hover:text-blue-800">
              View all →
            </Link>
          </div>

          <div className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {observationMetrics?.total || 0}
              </div>
              <div className="text-sm text-gray-500">Total observations</div>
            </div>

            {observationMetrics && observationMetrics.total > 0 && (
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Status:</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Pending</span>
                      <span className="font-medium">{observationMetrics.statusCounts.PENDING}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">In Progress</span>
                      <span className="font-medium">{observationMetrics.statusCounts.IN_PROGRESS}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Resolved</span>
                      <span className="font-medium text-green-600">{observationMetrics.statusCounts.RESOLVED}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-sm font-medium text-gray-700 mb-1">Risk levels:</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-red-600">High (A): {observationMetrics.byRisk.A}</span>
                    <span className="text-orange-600">Medium (B): {observationMetrics.byRisk.B}</span>
                    <span className="text-yellow-600">Low (C): {observationMetrics.byRisk.C}</span>
                  </div>
                </div>

                {(observationMetrics.due.overdue > 0 || observationMetrics.due.dueSoon > 0) && (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Attention needed:</div>
                    <div className="space-y-1">
                      {observationMetrics.due.overdue > 0 && (
                        <div className="text-sm text-red-600">
                          {observationMetrics.due.overdue} overdue
                        </div>
                      )}
                      {observationMetrics.due.dueSoon > 0 && (
                        <div className="text-sm text-orange-600">
                          {observationMetrics.due.dueSoon} due soon
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}