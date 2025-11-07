"use client";

import { FormEvent, useEffect, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import {
  NotionTable,
  NotionTableCell,
  NotionTableHeader,
  NotionTableRow
} from "@/components/ui/NotionTable";

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
    <div className="space-y-8">
      {/* S-Tier: Enhanced typography hierarchy (4xl instead of 3xl) */}
      <div>
        <h1 className="text-4xl font-bold text-neutral-900">Plants</h1>
        <p className="text-base text-neutral-600 mt-2">Manage facilities and locations</p>
      </div>

      <Card>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Create Plant (Admin only)</h2>
        {error && (
          <div className="mb-4 text-sm text-error-700 bg-error-50 border border-error-200 p-3 rounded-md">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="flex gap-3">
          <Input
            placeholder="Code (e.g., PLT001)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-48"
            required
          />
          <Input
            placeholder="Plant Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit" variant="primary" isLoading={loading}>
            {loading ? "Adding..." : "Add Plant"}
          </Button>
        </form>
      </Card>

      <Card variant="feature">
        <NotionTableHeader
          title="Existing Plants"
          description="Review registered facilities and their codes."
        />
        {plants.length === 0 ? (
          <EmptyState
            title="No plants yet"
            description="Create your first plant to get started with audits."
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            }
          />
        ) : (
          <NotionTable>
            <thead>
              <NotionTableRow hoverable={false}>
                <NotionTableCell as="th" scope="col" nowrap>
                  Code
                </NotionTableCell>
                <NotionTableCell as="th" scope="col">
                  Name
                </NotionTableCell>
                <NotionTableCell as="th" scope="col" nowrap>
                  Created
                </NotionTableCell>
              </NotionTableRow>
            </thead>
            <tbody>
              {plants.map((plant) => (
                <NotionTableRow key={plant.id}>
                  <NotionTableCell className="font-semibold text-gray-900">
                    {plant.code}
                  </NotionTableCell>
                  <NotionTableCell>{plant.name}</NotionTableCell>
                  <NotionTableCell muted nowrap>
                    {new Date(plant.createdAt).toLocaleDateString()}
                  </NotionTableCell>
                </NotionTableRow>
              ))}
            </tbody>
          </NotionTable>
        )}
      </Card>
    </div>
  );
}