"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
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
    <div className="space-y-10">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900 sm:text-4xl">Plants</h1>
          <p className="text-sm text-text-light">Create and manage audit locations across your organization.</p>
        </div>
        <Button asChild variant="primary">
          <Link href="#create-plant">Add plant</Link>
        </Button>
      </div>

      <Card variant="feature" id="create-plant">
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900">Create plant</h2>
            <p className="text-sm text-text-light">Admins can add new facilities with a unique code and name.</p>
          </div>
          {error && (
            <div className="rounded-300 border border-pink-500/30 bg-pink-100 px-4 py-3 text-sm text-pink-500">
              {error}
            </div>
          )}
          <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <Input
              label="Plant code"
              placeholder="PLT-001"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            <Input
              label="Plant name"
              placeholder="Pune Manufacturing"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <div className="flex items-end">
              <Button type="submit" variant="primary" isLoading={loading} className="w-full">
                {loading ? "Adding…" : "Add plant"}
              </Button>
            </div>
          </form>
        </div>
      </Card>

      <Card variant="feature">
        <NotionTableHeader
          title="Existing plants"
          description="All plants available for assignment and reporting."
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
                  Created on
                </NotionTableCell>
              </NotionTableRow>
            </thead>
            <tbody>
              {plants.map((plant) => (
                <NotionTableRow key={plant.id}>
                  <NotionTableCell className="font-semibold text-gray-900">
                    {plant.code}
                  </NotionTableCell>
                  <NotionTableCell className="text-text-medium">{plant.name}</NotionTableCell>
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