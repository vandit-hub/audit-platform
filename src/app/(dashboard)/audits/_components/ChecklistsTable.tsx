"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/v2/table";
import { Badge } from "@/components/ui/v2/badge";
import { Avatar, AvatarFallback } from "@/components/ui/v2/avatar";
import { Button } from "@/components/ui/v2/button";
import { Progress } from "@/components/ui/v2/progress";
import { AlertCircle, Loader2 } from "lucide-react";

// Type definitions
type ChecklistStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";

interface AssignedAuditor {
  id: string;
  name: string;
  email: string;
}

interface ChecklistData {
  id: string;
  checklistId: string;
  name: string;
  description: string | null;
  status: ChecklistStatus;
  progress: number;
  totalItems: number;
  completedItems: number;
  assignedAuditor: AssignedAuditor | null;
  createdAt: string;
}

interface ChecklistsTableProps {
  auditId: string;
}

export function ChecklistsTable({ auditId }: ChecklistsTableProps) {
  const router = useRouter();
  const [checklists, setChecklists] = useState<ChecklistData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChecklists = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/v1/audits/${auditId}/checklists`, {
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Failed to fetch checklists");
        }

        const data = await response.json();
        setChecklists(data.checklists || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (auditId) {
      fetchChecklists();
    }
  }, [auditId]);

  const handleRowClick = (checklistId: string) => {
    // Check if checklist detail route exists
    // For now, we'll navigate to a placeholder route
    // TODO: Update this when checklist detail page is implemented
    router.push(`/checklists/${checklistId}`);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Status badge styling
  const getStatusBadge = (status: ChecklistStatus) => {
    const styles = {
      NOT_STARTED: {
        background: "var(--c-palUiGry100)",
        color: "var(--c-palUiGry600)",
        label: "Not Started"
      },
      IN_PROGRESS: {
        background: "var(--ca-palUiBlu100)",
        color: "var(--c-palUiBlu700)",
        label: "In Progress"
      },
      COMPLETED: {
        background: "var(--c-palUiGre100)",
        color: "var(--c-palUiGre600)",
        label: "Completed"
      }
    };

    const style = styles[status];

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

  // Get progress indicator class based on completion
  const getProgressIndicatorClass = (progress: number) => {
    if (progress === 100) {
      return "bg-[var(--c-palUiGre600)]"; // Green for completed
    }
    return "bg-[var(--c-palUiBlu600)]"; // Blue for in progress
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--c-texSec)" }} />
        <span className="ml-2 text-sm" style={{ color: "var(--c-texSec)" }}>
          Loading checklists...
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
            Failed to load checklists
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
  if (checklists.length === 0) {
    return (
      <div
        className="text-center py-12 border rounded-lg"
        style={{
          borderColor: "var(--border-color-regular)",
          background: "white"
        }}
      >
        <p className="text-sm" style={{ color: "var(--c-texSec)" }}>
          No checklists linked to this audit yet
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
            <TableHead>Checklist Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Assigned To</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checklists.map((checklist) => (
            <TableRow
              key={checklist.id}
              onClick={() => handleRowClick(checklist.id)}
              className="cursor-pointer transition-colors hover:bg-gray-50"
            >
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium" style={{ color: "var(--c-texPri)" }}>
                    {checklist.name}
                  </p>
                  {checklist.description && (
                    <p className="text-xs" style={{ color: "var(--c-texSec)" }}>
                      {checklist.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>{getStatusBadge(checklist.status)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Progress
                    value={checklist.progress}
                    className="h-1.5 w-32"
                    indicatorClassName={getProgressIndicatorClass(checklist.progress)}
                  />
                  <span
                    className="text-sm font-medium whitespace-nowrap min-w-[3rem]"
                    style={{ color: "var(--c-texPri)" }}
                  >
                    {checklist.progress}%
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {checklist.assignedAuditor ? (
                    <>
                      <Avatar className="h-6 w-6">
                        <AvatarFallback
                          className="text-xs"
                          style={{
                            background: "var(--c-palUiBlu100)",
                            color: "var(--c-palUiBlu600)"
                          }}
                        >
                          {getInitials(checklist.assignedAuditor.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm" style={{ color: "var(--c-texPri)" }}>
                        {checklist.assignedAuditor.name}
                      </span>
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
