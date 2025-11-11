"use client";

import React from "react";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react";

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
  const [loading, setLoading] = React.useState(false);
  const [validating, setValidating] = React.useState(false);
  const [validationStatus, setValidationStatus] = React.useState<'idle' | 'validating' | 'success' | 'error'>('idle');
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleValidate = async () => {
    setError(null);
    setResult(null);
    if (!file) {
      const msg = "Select a file first";
      setError(msg);
      showError(msg);
      return;
    }

    setValidationStatus('validating');
    setValidating(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/v1/import/excel?dryRun=true`, {
        method: "POST",
        body: fd
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Validation failed");
      setResult(json as Result);

      if (json.ok && json.errors.length === 0) {
        setValidationStatus('success');
        showSuccess(
          `Validation successful! Ready to import: ${json.summary.create} create, ${json.summary.update} update`
        );
      } else if (json.errors.length > 0) {
        setValidationStatus('error');
        showError(`Validation found ${json.errors.length} error(s). Please fix them before importing.`);
      } else {
        setValidationStatus('error');
        showError("Validation failed. Please check the errors below.");
      }
    } catch (e: any) {
      const msg = e.message || String(e);
      setError(msg);
      setValidationStatus('error');
      showError(msg);
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    setError(null);
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
      const res = await fetch(`/api/v1/import/excel?dryRun=false`, {
        method: "POST",
        body: fd
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Import failed");
      setResult(json as Result);

      if (json.ok && json.errors.length === 0) {
        showSuccess(
          `Import completed successfully! Created: ${json.summary.create}, Updated: ${json.summary.update}`
        );
        // Reset state after successful import
        setFile(null);
        setValidationStatus('idle');
      } else if (json.errors.length > 0) {
        showError(`Import completed with ${json.errors.length} error(s). Some rows were skipped.`);
      } else {
        showError("Import failed. Please check the errors below.");
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
      {/* File Upload Area */}
      <div className="space-y-2">
        <Label htmlFor="file">Select Excel File</Label>
        <div className="border-2 border-dashed rounded-lg p-8 text-center border-border">
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <Input
            id="file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setValidationStatus('idle');
              setResult(null);
              setError(null);
            }}
            className="max-w-xs mx-auto"
          />
          <p className="text-sm mt-2 text-muted-foreground">
            Upload .xlsx files with Plants, Audits, and Observations sheets
          </p>
        </div>
      </div>

      {/* File Preview */}
      {file && (
        <div className="flex items-center justify-between p-3 rounded bg-muted">
          <span className="text-sm text-foreground">{file.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setValidationStatus('idle');
              setResult(null);
              setError(null);
            }}
          >
            Remove
          </Button>
        </div>
      )}

      {/* Validation Status Alerts */}
      {validationStatus === 'validating' && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Validating file... Please wait.
          </AlertDescription>
        </Alert>
      )}

      {validationStatus === 'success' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            Validation successful! File is ready to import.
          </AlertDescription>
        </Alert>
      )}

      {validationStatus === 'error' && result && result.errors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <p className="mb-3">Validation failed. Please fix the following errors:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {result.errors.map((err, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded text-xs bg-white border border-red-200"
                >
                  <div className="text-foreground font-semibold">
                    Sheet: {err.sheet}, Row: {err.row}, Column: {err.column || 'N/A'}
                  </div>
                  <div className="text-muted-foreground">{err.message}</div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="button"
          onClick={handleValidate}
          disabled={!file || validating || loading}
          className="gap-2"
          variant={validationStatus === 'success' ? 'outline' : 'default'}
        >
          <AlertCircle className="h-4 w-4" />
          {validating ? 'Validating...' : 'Validate File'}
        </Button>

        <Button
          type="button"
          onClick={handleImport}
          disabled={validationStatus !== 'success' || loading}
          className="gap-2 bg-green-600 hover:bg-green-700 text-white"
        >
          <Upload className="h-4 w-4" />
          {loading ? 'Importing...' : 'Import Data'}
        </Button>
      </div>

      {/* Results Summary */}
      {result && !error && (
        <div className="text-sm text-muted-foreground space-y-1">
          <div>
            Totals — Plants: {result.totals.plants}, Audits: {result.totals.audits}, Observations: {result.totals.observations}
          </div>
          <div>
            Summary — Create: {result.summary.create}, Update: {result.summary.update}, Errors: {result.errors.length}
          </div>
        </div>
      )}
    </div>
  );
}


