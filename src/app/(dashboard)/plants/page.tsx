"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Building2, MoreHorizontal, Search } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { PageContainer } from "@/components/v2/PageContainer";
import {
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
  Skeleton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/v2";

type Plant = { id: string; code: string; name: string; createdAt: string };

export default function PlantsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [isFetching, setIsFetching] = useState(true);
  const [formData, setFormData] = useState({ code: "", name: "" });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    loadPlants();
  }, []);

  async function loadPlants() {
    setIsFetching(true);
    try {
      const res = await fetch("/api/v1/plants", { cache: "no-store" });
      const json = await res.json();
      if (res.ok) {
        setPlants(json.plants);
      } else {
        showError(json.error || "Failed to load plants");
      }
    } catch (error) {
      console.error("Failed to load plants", error);
      showError("Failed to load plants");
    } finally {
      setIsFetching(false);
    }
  }

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

  const filteredPlants = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    if (!query) return plants;
    return plants.filter(
      (plant) =>
        plant.name.toLowerCase().includes(query) ||
        plant.code.toLowerCase().includes(query),
    );
  }, [plants, searchValue]);

  const totalPlants = plants.length;
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
          <div className="flex items-center gap-2">
            <Button
              className="gap-2"
              onClick={() => setIsDialogOpen(true)}
            >
              Create Plant
            </Button>
          </div>
        </header>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--c-texSec)]" />
          <Input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search plants by name or code..."
            className="pl-10"
          />
        </div>
      </section>

      <section>
        {isFetching ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                className="h-[220px] rounded-3xl bg-[var(--c-bacSec)]"
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
            {filteredPlants.map((plant) => (
              <Card
                key={plant.id}
                className="h-full border-none bg-[var(--c-bacSec)] shadow-[0_12px_32px_rgba(15,23,42,0.05)]"
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
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-40 rounded-xl border-[var(--border-color-regular)] bg-[var(--c-bacPri)]"
                    >
                      <DropdownMenuItem disabled>View details</DropdownMenuItem>
                      <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                      <DropdownMenuItem disabled>
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="rounded-2xl bg-[var(--c-bacPri)]/70 p-4">
                    <div className="flex items-center justify-between text-sm text-[var(--c-texSec)]">
                      <span>Audits</span>
                      <Badge variant="secondary" className="border-transparent">
                        Coming soon
                      </Badge>
                    </div>
                  </div>

                    <div className="rounded-2xl border border-dashed border-[var(--border-color-regular)] p-4">
                    <div className="flex items-center justify-between text-sm text-[var(--c-texSec)]">
                      <span>Observations</span>
                      <Badge variant="outline">Coming soon</Badge>
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
                    <Button variant="ghost" size="sm" disabled className="h-7 text-xs">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              Summary across all plants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <p className="text-sm text-[var(--c-texSec)]">Total Plants</p>
                <p className="text-3xl font-semibold text-[var(--c-texPri)]">
                  {totalPlants}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-[var(--c-texSec)]">Newest Plant</p>
                <p className="text-base text-[var(--c-texPri)]">
                  {newestPlant
                    ? `${newestPlant.name} (${newestPlant.code})`
                    : "—"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-[var(--c-texSec)]">Created On</p>
                <p className="text-base text-[var(--c-texPri)]">
                  {newestPlant
                    ? new Date(newestPlant.createdAt).toLocaleDateString()
                    : "—"}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-[var(--c-texSec)]">
                  Observations Coverage
                </p>
                <p className="text-base text-[var(--c-texSec)]">
                  Coming soon
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
    </>
  );
}