"use client";

import { useEffect, useState, FormEvent } from "react";

type Plant = { id: string; code: string; name: string };
type Checklist = {
  id: string;
  name: string;
  description?: string | null;
  itemsCount: number;
  applicablePlantIds: string[];
};
type Item = {
  id: string;
  title: string;
  description?: string | null;
  riskCategory?: "A" | "B" | "C" | null;
  process?: "O2C" | "P2P" | "R2R" | "INVENTORY" | null;
  isMandatory: boolean;
};

export default function ChecklistsPage() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);

  // create checklist
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // create item
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [risk, setRisk] = useState("");
  const [proc, setProc] = useState("");
  const [isMandatory, setIsMandatory] = useState(false);

  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [pRes, cRes] = await Promise.all([
      fetch("/api/v1/plants", { cache: "no-store" }),
      fetch("/api/v1/checklists", { cache: "no-store" })
    ]);
    const pJson = await pRes.json();
    const cJson = await cRes.json();
    if (pRes.ok) setPlants(pJson.plants);
    if (cRes.ok) setChecklists(cJson.checklists);
  }

  useEffect(() => {
    load();
  }, []);

  async function loadItems(id: string) {
    const res = await fetch(`/api/v1/checklists/${id}/items`, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setItems(json.items);
  }

  function onSelect(id: string) {
    setSelectedId(id);
    if (id) loadItems(id);
  }

  async function createChecklist(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/v1/checklists", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, description })
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Failed (Admin only)");
    } else {
      setName("");
      setDescription("");
      await load();
    }
  }

  async function addItem(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    const res = await fetch(`/api/v1/checklists/${selectedId}/items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title,
        description: desc || undefined,
        riskCategory: risk || undefined,
        process: proc || undefined,
        isMandatory
      })
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Failed (Admin only)");
    } else {
      setTitle("");
      setDesc("");
      setRisk("");
      setProc("");
      setIsMandatory(false);
      await loadItems(selectedId);
      await load();
    }
  }

  async function toggleApplicability(plantId: string, checked: boolean) {
    if (!selectedId) return;
    setError(null);
    const res = await fetch(`/api/v1/checklist-applicability`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ checklistId: selectedId, plantId, applicable: checked })
    });
    const j = await res.json();
    if (!res.ok) {
      setError(j.error || "Failed (Admin only)");
    } else {
      await load();
    }
  }

  const selected = checklists.find((c) => c.id === selectedId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Checklists</h1>
      {error && <div className="text-sm text-red-700 bg-red-50 p-2 rounded">{error}</div>}

      <form onSubmit={createChecklist} className="bg-white rounded p-4 shadow space-y-3 max-w-2xl">
        <div className="text-sm text-gray-600">Create checklist (Admin)</div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input className="border rounded px-3 py-2 w-full" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Description</label>
            <input className="border rounded px-3 py-2 w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button className="bg-black text-white px-4 py-2 rounded">Create</button>
          </div>
        </div>
      </form>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">All Checklists</h2>
          <ul className="text-sm space-y-2">
            {checklists.map((c) => (
              <li key={c.id}>
                <button
                  className={`text-left w-full px-2 py-1 rounded ${selectedId === c.id ? "bg-gray-100" : "hover:bg-gray-50"}`}
                  onClick={() => onSelect(c.id)}
                >
                  <div className="font-medium">{c.name}</div>
                  <div className="text-gray-500">{c.itemsCount} items</div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Items {selected ? `— ${selected.name}` : ""}</h2>
          {!selected && <div className="text-sm text-gray-600">Select a checklist to view/add items.</div>}
          {selected && (
            <>
              <form onSubmit={addItem} className="space-y-2 mb-4">
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                  <input
                    className="border rounded px-3 py-2 w-full"
                    placeholder="Description (optional)"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                  />
                  <select className="border rounded px-3 py-2" value={risk} onChange={(e) => setRisk(e.target.value)}>
                    <option value="">Risk (optional)</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                  </select>
                  <select className="border rounded px-3 py-2" value={proc} onChange={(e) => setProc(e.target.value)}>
                    <option value="">Process (optional)</option>
                    <option value="O2C">O2C</option>
                    <option value="P2P">P2P</option>
                    <option value="R2R">R2R</option>
                    <option value="INVENTORY">Inventory</option>
                  </select>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={isMandatory} onChange={(e) => setIsMandatory(e.target.checked)} />
                    <span className="text-sm">Mandatory</span>
                  </label>
                  <button className="border px-3 py-2 rounded">Add Item</button>
                </div>
              </form>

              <ul className="text-sm space-y-1">
                {items.map((it) => (
                  <li key={it.id} className="border-b py-1">
                    <div className="font-medium">{it.title}</div>
                    {it.description && <div className="text-gray-600">{it.description}</div>}
                  </li>
                ))}
                {items.length === 0 && <li className="text-gray-500">No items yet.</li>}
              </ul>
            </>
          )}
        </div>

        <div className="bg-white rounded p-4 shadow">
          <h2 className="font-medium mb-2">Applicability</h2>
          {!selected && <div className="text-sm text-gray-600">Select a checklist to manage applicability by plant.</div>}
          {selected && (
            <ul className="text-sm space-y-2">
              {plants.map((p) => {
                const checked = selected.applicablePlantIds.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center justify-between">
                    <div>{p.code} — {p.name}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleApplicability(p.id, e.target.checked)}
                      />
                      <span>{checked ? "Applicable" : "Not applicable"}</span>
                    </label>
                  </li>
                );
              })}
              {plants.length === 0 && <li className="text-gray-500">No plants.</li>}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}