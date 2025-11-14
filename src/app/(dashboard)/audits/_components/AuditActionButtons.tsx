"use client";

import * as React from "react";
import { useToast } from "@/contexts/ToastContext";
import { isCFO, isCXOTeam } from "@/lib/rbac";
import { Button } from "@/components/ui/v2/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/v2/alert-dialog";
import {
  Pencil,
  Download,
  Lock,
  Unlock,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { EditAuditDialog } from "./EditAuditDialog";
import type { AuditForEdit } from "./EditAuditDialog";

interface AuditActionButtonsProps {
  audit: AuditForEdit;
  userRole?: string | null;
  onRefresh: () => void;
}

export function AuditActionButtons({
  audit,
  userRole,
  onRefresh,
}: AuditActionButtonsProps) {
  const { showSuccess, showError } = useToast();

  // Permission checks
  const canManageAudit = isCFO(userRole) || isCXOTeam(userRole);

  // State management
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = React.useState(false);
  const [lockLoading, setLockLoading] = React.useState(false);
  const [unlockLoading, setUnlockLoading] = React.useState(false);
  const [completeLoading, setCompleteLoading] = React.useState(false);
  const [exportLoading, setExportLoading] = React.useState(false);

  // Check if any action is loading
  const anyLoading =
    lockLoading || unlockLoading || completeLoading || exportLoading;

  /**
   * Lock the audit
   */
  async function handleLock() {
    setLockLoading(true);
    try {
      const res = await fetch(`/api/v1/audits/${audit.id}/lock`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error || "Failed to lock audit.");
      }

      showSuccess("Audit locked successfully!");
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to lock audit.";
      showError(message);
    } finally {
      setLockLoading(false);
    }
  }

  /**
   * Unlock the audit
   */
  async function handleUnlock() {
    setUnlockLoading(true);
    try {
      const res = await fetch(`/api/v1/audits/${audit.id}/unlock`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error || "Failed to unlock audit.");
      }

      showSuccess("Audit unlocked successfully!");
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to unlock audit.";
      showError(message);
    } finally {
      setUnlockLoading(false);
    }
  }

  /**
   * Mark audit as complete
   */
  async function handleComplete() {
    setCompleteLoading(true);
    try {
      const res = await fetch(`/api/v1/audits/${audit.id}/complete`, {
        method: "POST",
      });

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(json.error || "Failed to complete audit.");
      }

      showSuccess("Audit marked as complete!");
      setCompleteDialogOpen(false);
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to complete audit.";
      showError(message);
    } finally {
      setCompleteLoading(false);
    }
  }

  /**
   * Export audit report
   * TODO: Implement proper PDF export with audit details and observations
   * For now, this opens the print dialog
   */
  function handleExport() {
    setExportLoading(true);
    try {
      // Open print dialog for now
      // In the future, this should generate a PDF report with:
      // - Audit details (plant, dates, purpose, team)
      // - All observations with their status
      // - Checklists and completion status
      // - Attachments and notes
      window.print();
      showSuccess("Print dialog opened. Use 'Save as PDF' to export.");
    } catch (err) {
      showError("Failed to open print dialog.");
    } finally {
      setExportLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {/* Edit Audit Button - CFO and CXO_TEAM only */}
        {canManageAudit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditDialogOpen(true)}
            disabled={anyLoading}
            className="gap-2 px-3 h-8"
          >
            <Pencil className="size-4" />
            Edit Audit
          </Button>
        )}

        {/* Export Report Button - Everyone can export */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          disabled={anyLoading}
          className="gap-2 px-3 h-8"
        >
          {exportLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export Report
        </Button>

        {/* Lock/Unlock Button - CFO and CXO_TEAM only, not shown if completed */}
        {canManageAudit && !audit.completedAt && (
          <>
            {audit.isLocked ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUnlock}
                disabled={anyLoading}
                className="gap-2 px-3 h-8"
              >
                {unlockLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Unlock className="size-4" />
                )}
                Unlock Audit
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLock}
                disabled={anyLoading}
                className="gap-2 px-3 h-8"
              >
                {lockLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Lock className="size-4" />
                )}
                Lock Audit
              </Button>
            )}
          </>
        )}

        {/* Mark Complete Button - CFO and CXO_TEAM only */}
        {canManageAudit && !audit.completedAt && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setCompleteDialogOpen(true)}
            disabled={anyLoading}
            className="gap-2 px-3 h-8"
          >
            <CheckCircle className="size-4" />
            Mark Complete
          </Button>
        )}
      </div>

      {/* Edit Audit Dialog */}
      {canManageAudit && (
        <EditAuditDialog
          audit={audit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={onRefresh}
        />
      )}

      {/* Mark Complete Confirmation Dialog */}
      <AlertDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Audit as Complete?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark this audit as complete? This will
              lock the audit and prevent further edits.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={completeLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={completeLoading}
            >
              {completeLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Completing...
                </>
              ) : (
                "Mark Complete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
