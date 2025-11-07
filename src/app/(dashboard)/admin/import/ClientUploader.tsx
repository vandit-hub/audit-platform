"use client";

import React from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  NotionTable,
  NotionTableCell,
  NotionTableHeader,
  NotionTableRow
} from "@/components/ui/NotionTable";

type Result = {
  ok: boolean;
  dryRun?: boolean;
  totals: { plants: number; audits: number; observations: number };
  summary: { create: number; update: number; skip: number; error: number };
  errors: { sheet: string; row: number; column?: string; message: string }[];
};

export function ClientUploader() {
  const { showSuccess, showError } = useToast();
  const [file, setFile] = React.useState<File | null>(null);
  const [dryRun, setDryRun] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (doDryRun: boolean) => {
    setError(null);
    setResult(null);
    if (!file) {
      const msg = "Select a file first";
      setError(msg);
      showError(msg);
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/import/excel?dryRun=${doDryRun ? "true" : "false"}`, {
        method: "POST",
        body: fd
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Import failed");
      setResult(json as Result);
      
      // Show toast notifications based on result
      if (doDryRun) {
        // Validation (dry-run)
        if (json.ok && json.errors.length === 0) {
          showSuccess(
            `Validation successful! Ready to import: ${json.summary.create} create, ${json.summary.update} update`
          );
        } else if (json.errors.length > 0) {
          showError(`Validation found ${json.errors.length} error(s). Please fix them before importing.`);
        } else {
          showError("Validation failed. Please check the errors below.");
        }
      } else {
        // Actual import
        if (json.ok && json.errors.length === 0) {
          showSuccess(
            `Import completed successfully! Created: ${json.summary.create}, Updated: ${json.summary.update}`
          );
        } else if (json.errors.length > 0) {
          showError(`Import completed with ${json.errors.length} error(s). Some rows were skipped.`);
        } else {
          showError("Import failed. Please check the errors below.");
        }
      }
    } catch (e: any) {
      const msg = e.message || String(e);
      setError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="border rounded p-2"
        />
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run
        </label>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
          disabled={!file || loading}
          onClick={() => submit(true)}
        >
          Validate
        </button>
        <button
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
          disabled={!file || loading || dryRun}
          onClick={() => submit(false)}
        >
          Import
        </button>
      </div>

      {loading && <p>Processing...</p>}
      {error && <p className="text-red-600">{error}</p>}

      {result && (
        <div className="space-y-3">
          <div className="text-sm text-gray-700">
            <div>Totals — Plants: {result.totals.plants}, Audits: {result.totals.audits}, Observations: {result.totals.observations}</div>
            <div>
              Planned — Create: {result.summary.create}, Update: {result.summary.update}, Errors: {result.errors.length}
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="space-y-2">
              <NotionTableHeader
                title="Errors"
                description="Rows that need attention before import."
                actions={
                  <span className="inline-flex items-center px-3 py-1.5 rounded-300 bg-notion-bacSec text-sm text-notion-texSec">
                    {result.errors.length} issue{result.errors.length === 1 ? "" : "s"}
                  </span>
                }
              />
              <NotionTable wrapperClassName="max-h-96 overflow-y-auto" density="compact">
                <thead>
                  <NotionTableRow hoverable={false}>
                    <NotionTableCell as="th" scope="col">
                      Sheet
                    </NotionTableCell>
                    <NotionTableCell as="th" scope="col">
                      Row
                    </NotionTableCell>
                    <NotionTableCell as="th" scope="col">
                      Column
                    </NotionTableCell>
                    <NotionTableCell as="th" scope="col">
                      Message
                    </NotionTableCell>
                  </NotionTableRow>
                </thead>
                <tbody>
                  {result.errors.map((err, index) => (
                    <NotionTableRow key={`${err.sheet}-${index}`}>
                      <NotionTableCell>{err.sheet}</NotionTableCell>
                      <NotionTableCell numeric>{err.row}</NotionTableCell>
                      <NotionTableCell>{err.column || "—"}</NotionTableCell>
                      <NotionTableCell className="max-w-xl notion-table-cell-muted">
                        {err.message}
                      </NotionTableCell>
                    </NotionTableRow>
                  ))}
                </tbody>
              </NotionTable>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


