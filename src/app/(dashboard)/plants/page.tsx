"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/v2/card";
import { Button } from "@/components/ui/v2/button";
import { Input } from "@/components/ui/v2/input";
import { Badge } from "@/components/ui/v2/badge";
import { Skeleton } from "@/components/ui/v2/skeleton";
import { PageContainer } from "@/components/v2/PageContainer";

type Plant = { id: string; code: string; name: string; createdAt: string };

export default function PlantsPage() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [plants, setPlants] = useState<Plant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const { showSuccess, showError } = useToast();

  async function load() {
    setIsFetching(true);
    try {
      const res = await fetch("/api/v1/plants", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setPlants(json.plants);
      }
    } catch (err) {
      console.error("Failed to load plants", err);
    } finally {
      setIsFetching(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/v1/plants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setCode("");
      setName("");
      await load();
      showSuccess(`Plant "${name}" created successfully!`);
    } catch (err: any) {
      const errorMessage =
        err.message || "Failed to create plant (Admin only)";
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setCreating(false);
    }
  }

  const totalPlants = plants.length;
  const newestPlant = useMemo(() => {
    if (!plants.length) return null;
    return [...plants].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [plants]);

  const recentPlants = useMemo(
    () =>
      [...plants]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        )
        .slice(0, 5),
    [plants],
  );

  return (
    <PageContainer className="space-y-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-[var(--c-texPri)]">
            Plants
          </h1>
          <p className="text-sm md:text-base text-[var(--c-texSec)]">
            Manage facilities and locations that audits are assigned to.
          </p>
        </div>
        <Button asChild variant="ghost" size="sm">
          <a href="/audits">View related audits</a>
        </Button>
      </header>

      <section className="grid gap-5 md:grid-cols-3">
        <Card className="border-none shadow-none bg-[var(--c-bacSec)]">
          <CardHeader className="space-y-1">
            <CardDescription>Total plants</CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {totalPlants}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--c-texSec)]">
              Locations configured for audit scheduling.
            </p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-none bg-[var(--ca-palUiBlu100)] text-[var(--c-palUiBlu700)]">
          <CardHeader className="space-y-1">
            <CardDescription className="text-[var(--c-palUiBlu700)]">
              Latest addition
            </CardDescription>
            <CardTitle className="text-3xl font-semibold">
              {newestPlant
                ? newestPlant.code
                : totalPlants === 0
                ? "—"
                : "Unknown"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {newestPlant
                ? `${newestPlant.name} • ${new Date(
                    newestPlant.createdAt,
                  ).toLocaleDateString()}`
                : "Add your first plant to begin assigning audits."}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60">
          <CardHeader>
            <CardTitle className="text-lg">Regional coverage</CardTitle>
            <CardDescription>
              Planned enhancement: visual map of plant distribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--c-texSec)]">
              Once we enrich the backend with region metadata, this card will
              display geographic coverage and gaps.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle>Create plant</CardTitle>
            <CardDescription>
              Add a new facility to make it available for audit scheduling.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md border border-[var(--c-palUiRed100)] bg-[var(--c-palUiRed100)]/40 px-4 py-3 text-sm text-[var(--c-palUiRed600)]">
                {error}
              </div>
            )}
            <form
              onSubmit={onSubmit}
              className="grid gap-4 md:grid-cols-[200px,1fr,auto]"
            >
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium text-[var(--c-texSec)]"
                  htmlFor="plant-code"
                >
                  Code
                </label>
                <Input
                  id="plant-code"
                  placeholder="e.g., PLT001"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label
                  className="text-sm font-medium text-[var(--c-texSec)]"
                  htmlFor="plant-name"
                >
                  Name
                </label>
                <Input
                  id="plant-name"
                  placeholder="Plant name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={creating}>
                  {creating ? "Adding…" : "Add plant"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent plants</CardTitle>
            <CardDescription>
              Newly added locations for quick access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPlants.length === 0 ? (
              <p className="text-sm text-[var(--c-texTer)]">
                No plants yet. Create a plant to see it listed here.
              </p>
            ) : (
              recentPlants.map((plant) => (
                <div
                  key={plant.id}
                  className="rounded-lg border border-[var(--border-color-regular)] px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-[var(--c-texPri)]">
                        {plant.name}
                      </h4>
                      <p className="text-xs text-[var(--c-texSec)]">
                        {plant.code}
                      </p>
                    </div>
                    <Badge className="bg-[var(--ca-palUiBlu100)] border-transparent text-[var(--c-palUiBlu700)]">
                      {new Date(plant.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">All plants</CardTitle>
            <CardDescription>
              Full inventory of facilities available for audit scheduling.
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={load} disabled={isFetching}>
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {isFetching ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-14 w-full rounded-md" />
              ))}
            </div>
          ) : plants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-color-regular)] bg-[var(--c-bacSec)]/60 px-5 py-8 text-center text-sm text-[var(--c-texSec)]">
              No plants configured yet. Use the form above to add your first
              location.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead className="bg-[var(--c-bacSec)] text-[var(--c-texTer)]">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Code
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {plants.map((plant, index) => (
                    <tr
                      key={plant.id}
                      className={`border-b border-[var(--border-color-regular)] last:border-0 ${
                        index % 2 === 0 ? "bg-white" : "bg-[var(--c-bacSec)]/40"
                      }`}
                    >
                      <td className="px-5 py-4 font-semibold text-[var(--c-texPri)]">
                        {plant.code}
                      </td>
                      <td className="px-5 py-4 text-[var(--c-texSec)]">
                        {plant.name}
                      </td>
                      <td className="px-5 py-4 text-[var(--c-texTer)] text-xs">
                        {new Date(plant.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}