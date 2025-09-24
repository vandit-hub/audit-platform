"use client";

import { FormEvent, useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";

type Plant = { id: string; code: string; name: string; createdAt: string };

export default function PlantsPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [plants, setPlants] = useState<Plant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useToast();

  async function load() {
    const res = await fetch("/api/v1/plants", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setPlants(json.plants);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/v1/plants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setCode("");
      setName("");
      await load();
      showSuccess(`Plant "${name}" created successfully!`);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to create plant (Admin only)";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Plants</h1>
      <form onSubmit={onSubmit} className="bg-white rounded p-4 shadow space-y-3 max-w-md">
        <div className="text-sm text-gray-600">Create a plant (Admin only)</div>
        {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}
        <div className="flex gap-2">
          <input
            className="border rounded px-3 py-2 w-40"
            placeholder="Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          <input
            className="border rounded px-3 py-2 flex-1"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button className="bg-black text-white px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? "Adding..." : "Add"}
          </button>
        </div>
      </form>

      <div className="bg-white rounded p-4 shadow">
        <h2 className="font-medium mb-2">Existing Plants</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-2">Code</th>
              <th className="py-2">Name</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
        <tbody>
          {plants.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="py-2">{p.code}</td>
              <td className="py-2">{p.name}</td>
              <td className="py-2">{new Date(p.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
}