"use client";

import React from "react";

type Result = {
  ok: boolean;
  dryRun?: boolean;
  totals: { plants: number; audits: number; observations: number };
  summary: { create: number; update: number; skip: number; error: number };
  errors: { sheet: string; row: number; column?: string; message: string }[];
};

export function ClientUploader() {
  const [file, setFile] = React.useState<File | null>(null);
  const [dryRun, setDryRun] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (doDryRun: boolean) => {
    setError(null);
    setResult(null);
    if (!file) {
      setError("Select a file first");
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
    } catch (e: any) {
      setError(e.message || String(e));
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
            <div>
              <h3 className="font-semibold mb-2">Errors</h3>
              <div className="overflow-auto max-h-96">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left">
                      <th className="px-2 py-1">Sheet</th>
                      <th className="px-2 py-1">Row</th>
                      <th className="px-2 py-1">Column</th>
                      <th className="px-2 py-1">Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors.map((e, i) => (
                      <tr key={i} className="odd:bg-gray-50">
                        <td className="px-2 py-1">{e.sheet}</td>
                        <td className="px-2 py-1">{e.row}</td>
                        <td className="px-2 py-1">{e.column || ""}</td>
                        <td className="px-2 py-1">{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


