"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/v2/table";
import { Badge } from "@/components/ui/v2/badge";
import { Avatar, AvatarFallback } from "@/components/ui/v2/avatar";
import { Button } from "@/components/ui/v2/button";
import { AlertCircle, Loader2 } from "lucide-react";

// Type definitions based on actual Prisma schema
type ApprovalStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
type RiskCategory = "A" | "B" | "C" | null;

interface ObservationData {
  id: string;
  code?: string | null;
  observationText: string;
  approvalStatus: ApprovalStatus;
  riskCategory: RiskCategory;
  assignments?: Array<{
    auditee: {
      id: string;
      name: string;
      email: string;
    };
  }>;
}

interface ObservationsTableProps {
  auditId: string;
}

export function ObservationsTable({ auditId }: ObservationsTableProps) {
  const router = useRouter();
  const [observations, setObservations] = useState<ObservationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchObservations = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/observations?auditId=${auditId}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Failed to fetch observations");
        }

        const data = await response.json();
        setObservations(data.observations || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (auditId) {
      fetchObservations();
    }
  }, [auditId]);

  const handleRowClick = (observationId: string) => {
    router.push(`/observations/${observationId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  // Status badge styling
  const getApprovalStatusBadge = (status: ApprovalStatus) => {
    const styles = {
      DRAFT: {
        background: "var(--c-palUiGry100)",
        color: "var(--c-palUiGry600)",
        label: "Draft"
      },
      SUBMITTED: {
        background: "var(--ca-palUiBlu100)",
        color: "var(--c-palUiBlu700)",
        label: "Submitted"
      },
      APPROVED: {
        background: "var(--c-palUiGre100)",
        color: "var(--c-palUiGre600)",
        label: "Approved"
      },
      REJECTED: {
        background: "var(--c-palUiRed100)",
        color: "var(--c-palUiRed600)",
        label: "Rejected"
      }
    };

    const style = styles[status] || styles.DRAFT;

    return (
      <Badge
        style={{
          ...style,
          padding: "2px 8px",
          borderRadius: "var(--border-radius-300)",
          fontSize: "12px",
          fontWeight: 500,
          border: "none"
        }}
      >
        {style.label}
      </Badge>
    );
  };

  // Risk category badge styling
  const getRiskCategoryBadge = (category: RiskCategory) => {
    if (!category) {
      return (
        <Badge
          style={{
            background: "var(--c-palUiGry100)",
            color: "var(--c-palUiGry600)",
            padding: "2px 8px",
            borderRadius: "var(--border-radius-300)",
            fontSize: "12px",
            fontWeight: 500,
            border: "none"
          }}
        >
          Not Set
        </Badge>
      );
    }

    const styles = {
      A: {
        background: "var(--c-palUiRed100)",
        color: "var(--c-palUiRed600)",
        label: "Critical (A)"
      },
      B: {
        background: "var(--cl-palYel100)",
        color: "var(--cd-palYel500)",
        label: "High (B)"
      },
      C: {
        background: "var(--c-palUiGre100)",
        color: "var(--c-palUiGre600)",
        label: "Medium (C)"
      }
    };

    const style = styles[category];

    return (
      <Badge
        style={{
          ...style,
          padding: "2px 8px",
          borderRadius: "var(--border-radius-300)",
          fontSize: "12px",
          fontWeight: 500,
          border: "none"
        }}
      >
        {style.label}
      </Badge>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--c-texSec)" }} />
        <span className="ml-2 text-sm" style={{ color: "var(--c-texSec)" }}>
          Loading observations...
        </span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-10 w-10" style={{ color: "var(--c-palUiRed600)" }} />
        <div className="text-center space-y-2">
          <p className="text-sm font-medium" style={{ color: "var(--c-texPri)" }}>
            Failed to load observations
          </p>
          <p className="text-sm" style={{ color: "var(--c-texSec)" }}>
            {error}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  // Empty state
  if (observations.length === 0) {
    return (
      <div
        className="text-center py-12 border rounded-lg"
        style={{
          borderColor: "var(--border-color-regular)",
          background: "white"
        }}
      >
        <p className="text-sm" style={{ color: "var(--c-texSec)" }}>
          No observations linked to this audit yet
        </p>
      </div>
    );
  }

  // Table with data
  return (
    <div
      className="border rounded-lg overflow-x-auto"
      style={{
        borderColor: "var(--border-color-regular)",
        background: "white"
      }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk</TableHead>
            <TableHead>Assigned To</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {observations.map((obs) => (
            <TableRow
              key={obs.id}
              onClick={() => handleRowClick(obs.id)}
              className="cursor-pointer transition-colors hover:bg-gray-50"
            >
              <TableCell className="font-mono text-sm whitespace-nowrap">
                {obs.code || `OBS-${obs.id.slice(-6).toUpperCase()}`}
              </TableCell>
              <TableCell className="max-w-md">
                <span style={{ color: "var(--c-texPri)" }}>
                  {truncateText(obs.observationText)}
                </span>
              </TableCell>
              <TableCell>{getApprovalStatusBadge(obs.approvalStatus)}</TableCell>
              <TableCell>{getRiskCategoryBadge(obs.riskCategory)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {obs.assignments && obs.assignments.length > 0 ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-xs"
                          style={{
                            background: "var(--c-palUiBlu100)",
                            color: "var(--c-palUiBlu600)"
                          }}
                        >
                          {getInitials(obs.assignments[0].auditee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm" style={{ color: "var(--c-texPri)" }}>
                        {obs.assignments[0].auditee.name}
                      </span>
                      {obs.assignments.length > 1 && (
                        <Badge
                          variant="secondary"
                          className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                        >
                          +{obs.assignments.length - 1}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-sm" style={{ color: "var(--c-texSec)" }}>
                      Unassigned
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
