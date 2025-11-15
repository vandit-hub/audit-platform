"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ClipboardList,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { PageContainer } from "@/components/v2/PageContainer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Label,
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/v2";

type PlantStats = {
  audits: {
    total: number;
    active: number;
    completed: number;
    byStatus: Record<string, number>;
  };
  observations: {
    total: number;
    byRisk: Record<string, number>;
    byStatus: Record<string, number>;
  };
};

type Plant = {
  id: string;
  code: string;
  name: string;
  createdAt: string;
  stats?: PlantStats;
};

const RISK_ORDER: Array<keyof PlantStats["observations"]["byRisk"]> = ["A", "B", "C"];

const RISK_META: Record<string, { label: string; dotClass: string }> = {
  A: { label: "Category A", dotClass: "bg-[var(--c-palUiRed600)]" },
  B: { label: "Category B", dotClass: "bg-[var(--cd-palOra500)]" },
  C: { label: "Category C", dotClass: "bg-[var(--c-palUiBlu700)]" },
  UNSPECIFIED: { label: "Unspecified", dotClass: "bg-[var(--c-texSec)]/40" },
};

const OBSERVATION_STATUS_ORDER: Record<string, number> = {
  PENDING_MR: 1,
  MR_UNDER_REVIEW: 2,
  REFERRED_BACK: 3,
  OBSERVATION_FINALISED: 4,
  RESOLVED: 5,
};

const OBSERVATION_STATUS_BADGES: Record<string, string> = {
  PENDING_MR: "bg-[var(--c-palUiRed100)] text-[var(--c-palUiRed600)] border-transparent",
  MR_UNDER_REVIEW: "bg-[var(--ca-palUiBlu100)] text-[var(--c-palUiBlu700)] border-transparent",
  REFERRED_BACK: "bg-[var(--cl-palOra100)] text-[var(--cd-palOra500)] border-transparent",
  OBSERVATION_FINALISED: "bg-[var(--cl-palGre100)] text-[var(--cd-palGre500)] border-transparent",
  RESOLVED: "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent",
  UNKNOWN: "bg-[var(--c-bacSec)] text-[var(--c-texSec)] border-transparent",
};

function humanize(value?: string | null) {
  if (!value) return "Not set";
  return value
    .toLowerCase()
    .split(/[_\s-]/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase().concat(part.slice(1)) ?? "")
    .join(" ");
}

function getPlantStats(plant: Plant): PlantStats {
  if (plant.stats) return plant.stats;
  return {
    audits: { total: 0, active: 0, completed: 0, byStatus: {} },
    observations: { total: 0, byRisk: {}, byStatus: {} },
  };
}

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({ code: "", name: "" });
  const [editingPlant, setEditingPlant] = useState<Plant | null>(null);
  const [deletingPlantId, setDeletingPlantId] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showError, showSuccess } = useToast();

  const loadPlants = useCallback(async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/v1/plants?withStats=1", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setPlants(json.plants ?? []);
      } else {
        showError(json.error || "Failed to load plants");
      }
    } catch (error) {
      console.error("Failed to load plants", error);
      showError("Failed to load plants");
    } finally {
      setIsFetching(false);
    }
  }, [showError]);

  useEffect(() => {
    loadPlants();
  }, [loadPlants]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setIsCreating(true);
    try {
      const res = await fetch("/api/v1/plants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) {
        const message = json.error || "Failed to create plant";
        setCreateError(message);
        showError(message);
        return;
      }

      showSuccess(`Plant "${formData.name}" created successfully!`);
      setFormData({ code: "", name: "" });
      setIsDialogOpen(false);
      await loadPlants();
    } catch (error) {
      console.error("Failed to create plant", error);
      const message =
        error instanceof Error ? error.message : "Failed to create plant";
      setCreateError(message);
      showError(message);
    } finally {
      setIsCreating(false);
    }
  }

  function handleDialogOpenChange(open: boolean) {
    setIsDialogOpen(open);
    if (!open) {
      setCreateError(null);
      setFormData({ code: "", name: "" });
    }
  }

  function handleEditDialogOpenChange(open: boolean) {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditError(null);
      setEditingPlant(null);
    }
  }

  function handleDeleteDialogOpenChange(open: boolean) {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setDeletingPlantId(null);
    }
  }

  function handleEditClick(plant: Plant) {
    setEditingPlant(plant);
    setFormData({ code: plant.code, name: plant.name });
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(plantId: string) {
    setDeletingPlantId(plantId);
    setIsDeleteDialogOpen(true);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPlant) return;

    setEditError(null);
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/v1/plants/${editingPlant.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(formData),
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok) {
        const message = json?.error || "Failed to update plant";
        setEditError(message);
        showError(message);
        return;
      }

      showSuccess(`Plant "${formData.name}" updated successfully!`);
      setFormData({ code: "", name: "" });
      setEditingPlant(null);
      setIsEditDialogOpen(false);
      await loadPlants();
    } catch (error) {
      console.error("Failed to update plant", error);
      const message =
        error instanceof Error ? error.message : "Failed to update plant";
      setEditError(message);
      showError(message);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deletingPlantId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/v1/plants/${deletingPlantId}`, {
        method: "DELETE",
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }
      if (!res.ok) {
        const message = json?.error || "Failed to delete plant";
        showError(message);
        setIsDeleteDialogOpen(false);
        setDeletingPlantId(null);
        return;
      }

      showSuccess("Plant deleted successfully!");
      setIsDeleteDialogOpen(false);
      setDeletingPlantId(null);
      await loadPlants();
    } catch (error) {
      console.error("Failed to delete plant", error);
      const message =
        error instanceof Error ? error.message : "Failed to delete plant";
      showError(message);
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredPlants = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return plants;
    return plants.filter(
      (plant) =>
        plant.name.toLowerCase().includes(query) ||
        plant.code.toLowerCase().includes(query),
    );
  }, [plants, searchValue]);

  const newestPlant = useMemo(() => {
    if (!plants.length) return null;
    return plants.reduce((latest, plant) => {
      if (!latest) return plant;
      return new Date(plant.createdAt) > new Date(latest.createdAt)
        ? plant
        : latest;
    }, plants[0] as Plant | null);
  }, [plants]);

  const hasPlants = filteredPlants.length > 0;

  const overviewTotals = useMemo(() => {
    return filteredPlants.reduce(
      (acc, plant) => {
        const stats = getPlantStats(plant);
        acc.totalAudits += stats.audits.total;
        acc.completedAudits += stats.audits.completed;
        acc.totalObservations += stats.observations.total;
        acc.riskA += stats.observations.byRisk.A ?? 0;
        acc.riskB += stats.observations.byRisk.B ?? 0;
        acc.riskC += stats.observations.byRisk.C ?? 0;
        return acc;
      },
      {
        totalAudits: 0,
        completedAudits: 0,
        totalObservations: 0,
        riskA: 0,
        riskB: 0,
        riskC: 0,
      },
    );
  }, [filteredPlants]);

  return (
    <>
      <PageContainer className="space-y-8">
        <section className="space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-[32px] font-semibold leading-tight text-[var(--c-texPri)]">
                Plants
              </h1>
              <p className="text-sm text-[var(--c-texSec)]">
                Manage plant locations and view summaries.
              </p>
            </div>
            <Button
              className="flex items-center gap-2 bg-[var(--c-texPri)] text-white hover:bg-[var(--c-texPri)]/90"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Plant
            </Button>
          </header>

          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-texSec)]" />
            <Input
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search plants by name or code..."
              className="h-11 rounded-lg border border-[var(--border-color-regular)] bg-[var(--c-bacSec)] pl-9 text-sm"
            />
          </div>
        </section>

        <section>
          {isFetching ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className="h-[260px] rounded-3xl bg-[var(--c-bacSec)]"
                />
              ))}
            </div>
          ) : !hasPlants ? (
            <Card className="border-none bg-[var(--c-bacSec)] text-center">
              <CardContent className="flex flex-col items-center gap-4 py-16">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-[var(--c-palUiBlu100)]">
                  <Building2 className="size-7 text-[var(--c-palUiBlu600)]" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-[var(--c-texPri)]">
                    No plants yet
                  </h3>
                  <p className="text-sm text-[var(--c-texSec)]">
                    Create your first plant to begin assigning audits.
                  </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                  Create Plant
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlants.map((plant) => {
                const stats = getPlantStats(plant);
                const statusEntries = Object.entries(stats.observations.byStatus)
                  .filter(([, count]) => count > 0)
                  .sort(
                    ([statusA], [statusB]) =>
                      (OBSERVATION_STATUS_ORDER[statusA] ?? 99) -
                      (OBSERVATION_STATUS_ORDER[statusB] ?? 99),
                  );

                const riskRows: React.ReactElement[] = [];

                for (const riskKey of RISK_ORDER) {
                  const count = stats.observations.byRisk[riskKey] ?? 0;
                  if (!count) continue;
                  const meta = RISK_META[riskKey];
                  riskRows.push(
                    <div
                      key={riskKey}
                      className="flex items-center justify-between text-xs text-[var(--c-texPri)]"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                        {meta.label}
                      </span>
                      <span>{count}</span>
                    </div>,
                  );
                }

                const unspecifiedRisk = stats.observations.byRisk.UNSPECIFIED ?? 0;
                if (unspecifiedRisk > 0) {
                  const meta = RISK_META.UNSPECIFIED;
                  riskRows.push(
                    <div
                      key="UNSPECIFIED"
                      className="flex items-center justify-between text-xs text-[var(--c-texPri)]"
                    >
                      <span className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                        {meta.label}
                      </span>
                      <span>{unspecifiedRisk}</span>
                    </div>,
                  );
                }

                return (
                  <Card
                    key={plant.id}
                    className="h-full border-none bg-[var(--c-bacSec)] shadow-[0_20px_40px_rgba(15,23,42,0.06)]"
                  >
                    <CardHeader className="flex flex-row items-start gap-4">
                      <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--c-palUiBlu100)]">
                        <Building2 className="size-5 text-[var(--c-palUiBlu600)]" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">
                          {plant.name}
                        </CardTitle>
                        <CardDescription className="text-sm text-[var(--c-texSec)]">
                          {plant.code}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[var(--c-texSec)]"
                          >
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-44 rounded-xl border-[var(--border-color-regular)] bg-white shadow-[0_12px_24px_rgba(15,23,42,0.08)]"
                        >
                          <DropdownMenuItem
                            className="gap-2 text-sm text-[var(--c-texPri)]"
                            onClick={() => handleEditClick(plant)}
                          >
                            <Pencil className="size-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-sm text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteClick(plant.id)}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>

                    <CardContent className="space-y-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-[var(--c-texSec)]">
                          <ClipboardList className="size-4 text-[var(--c-texSec)]" />
                          <span>Audits</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                          <div>
                            <p className="text-2xl font-semibold text-[var(--c-texPri)]">
                              {stats.audits.total}
                            </p>
                            <p className="text-xs text-[var(--c-texSec)]">Total</p>
                          </div>
                          {stats.audits.active > 0 && (
                            <Badge className="rounded-full bg-[var(--ca-palUiBlu100)] px-3 text-xs text-[var(--c-palUiBlu700)] border-transparent">
                              {stats.audits.active} Active
                            </Badge>
                          )}
                          {stats.audits.completed > 0 && (
                            <Badge className="rounded-full bg-[var(--c-bacSec)] px-3 text-xs text-[var(--c-texSec)] border-transparent">
                              {stats.audits.completed} Signed Off
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
                        <div className="flex items-center justify-between text-sm text-[var(--c-texSec)]">
                          <div className="flex items-center gap-2">
                            <Activity className="size-4 text-[var(--c-texSec)]" />
                            <span>Observations</span>
                          </div>
                          <span className="text-sm font-medium text-[var(--c-texPri)]">
                            {stats.observations.total}
                          </span>
                        </div>
                        <div className="space-y-2 pl-1">
                          {riskRows.length > 0 ? (
                            riskRows
                          ) : (
                            <p className="text-xs text-[var(--c-texSec)]">
                              No observations yet.
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {statusEntries.length > 0 ? (
                            statusEntries.map(([status, count]) => (
                              <Badge
                                key={status}
                                className={`gap-2 rounded-full px-3 py-1 text-xs ${OBSERVATION_STATUS_BADGES[status] ?? OBSERVATION_STATUS_BADGES.UNKNOWN}`}
                              >
                                {humanize(status)} • {count}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-xs text-[var(--c-texSec)]">
                              No workflow activity yet.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-[var(--c-texSec)]">
                        <span>
                          Created{" "}
                          {new Date(plant.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          className="h-7 rounded-full px-3 text-xs text-[var(--c-texSec)]"
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {plants.length > 0 && (
          <Card className="border-none bg-[var(--c-bacSec)]">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold text-[var(--c-texPri)]">
                Overview
              </CardTitle>
              <CardDescription className="text-sm text-[var(--c-texSec)]">
                Summary across visible plants
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-4">
                <div className="space-y-2">
                  <p className="text-sm text-[var(--c-texSec)]">Total Plants</p>
                  <p className="text-3xl font-semibold text-[var(--c-texPri)]">
                    {filteredPlants.length}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-[var(--c-texSec)]">Total Audits</p>
                  <p className="text-3xl font-semibold text-[var(--c-texPri)]">
                    {overviewTotals.totalAudits}
                  </p>
                  <p className="text-xs text-[var(--c-texSec)]">
                    {overviewTotals.totalAudits - overviewTotals.completedAudits} active •{" "}
                    {overviewTotals.completedAudits} signed off
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-[var(--c-texSec)]">Total Observations</p>
                  <p className="text-3xl font-semibold text-[var(--c-texPri)]">
                    {overviewTotals.totalObservations}
                  </p>
                  <p className="text-xs text-[var(--c-texSec)]">
                    A:{overviewTotals.riskA} • B:{overviewTotals.riskB} • C:{overviewTotals.riskC}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-[var(--c-texSec)]">Newest Plant</p>
                  <p className="text-base text-[var(--c-texPri)]">
                    {newestPlant
                      ? `${newestPlant.name} (${newestPlant.code})`
                      : "—"}
                  </p>
                  <p className="text-xs text-[var(--c-texSec)]">
                    {newestPlant
                      ? new Date(newestPlant.createdAt).toLocaleDateString()
                      : ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContainer>
      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader className="space-y-2">
            <DialogTitle>Create New Plant</DialogTitle>
            <DialogDescription>
              Add a new plant location to the system.
            </DialogDescription>
          </DialogHeader>

          {createError && (
            <div className="rounded-md border border-[var(--c-palUiRed200)] bg-[var(--c-palUiRed100)]/60 px-4 py-3 text-sm text-[var(--c-palUiRed700)]">
              {createError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleCreate}>
            <div className="space-y-2">
              <label
                htmlFor="plant-code"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Plant Code
              </label>
              <Input
                id="plant-code"
                placeholder="PLT001"
                value={formData.code}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, code: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="plant-name"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Plant Name
              </label>
              <Input
                id="plant-name"
                placeholder="Manufacturing Plant A"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <DialogFooter className="sm:space-x-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating…" : "Create Plant"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogOpenChange}>
        <DialogContent>
          <DialogHeader className="space-y-2">
            <DialogTitle>Edit Plant</DialogTitle>
            <DialogDescription>
              Update plant information.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div className="rounded-md border border-[var(--c-palUiRed200)] bg-[var(--c-palUiRed100)]/60 px-4 py-3 text-sm text-[var(--c-palUiRed700)]">
              {editError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleUpdate}>
            <div className="space-y-2">
              <Label
                htmlFor="edit-plant-code"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Plant Code
              </Label>
              <Input
                id="edit-plant-code"
                placeholder="PLT001"
                value={formData.code}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, code: event.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="edit-plant-name"
                className="text-sm font-medium text-[var(--c-texSec)]"
              >
                Plant Name
              </Label>
              <Input
                id="edit-plant-name"
                placeholder="Manufacturing Plant A"
                value={formData.name}
                onChange={(event) =>
                  setFormData((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            <DialogFooter className="sm:space-x-3">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Updating…" : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={handleDeleteDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the plant
              and remove it from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}