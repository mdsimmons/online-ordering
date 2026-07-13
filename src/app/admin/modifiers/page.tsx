"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

export default function AdminModifiersPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    minSelect: "0",
    maxSelect: "1",
    isRequired: false,
    options: [{ name: "", price: "0" }],
  });

  const load = () => { fetch("/api/admin/modifiers").then((r) => r.json()).then(setGroups); };
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", minSelect: "0", maxSelect: "1", isRequired: false, options: [{ name: "", price: "0" }] });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (g: any) => {
    setForm({
      name: g.name,
      minSelect: String(g.minSelect),
      maxSelect: String(g.maxSelect),
      isRequired: g.isRequired,
      options: g.options?.map((o: any) => ({ name: o.name, price: String(o.price) })) || [{ name: "", price: "0" }],
    });
    setEditing(g.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name) return toast.error("Name required");
    const validOptions = form.options.filter((o) => o.name.trim());
    const body: any = {
      name: form.name,
      minSelect: parseInt(form.minSelect) || 0,
      maxSelect: parseInt(form.maxSelect) || 1,
      isRequired: form.isRequired,
      options: validOptions.map((o) => ({ name: o.name, price: parseFloat(o.price) || 0 })),
    };
    if (editing) body.id = editing;
    const res = await fetch("/api/admin/modifiers", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) { toast.success(editing ? "Modifier group updated" : "Modifier group created"); resetForm(); load(); }
    else toast.error("Failed");
  };

  const handleDuplicate = async (g: any) => {
    const res = await fetch("/api/admin/modifiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: g.name + " (copy)",
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        isRequired: g.isRequired,
        options: g.options?.map((o: any) => ({ name: o.name, price: o.price })) || [],
      }),
    });
    if (res.ok) { toast.success("Modifier group duplicated"); load(); }
    else toast.error("Failed to duplicate");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this modifier group?")) return;
    const res = await fetch(`/api/admin/modifiers?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Modifier Groups</h1>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium">+ New Group</button>
      </div>

      {showForm && (
        <div className="bg-zinc-800 rounded-xl p-4 mb-6 space-y-3">
          <input placeholder="Group name (e.g. Extra Toppings)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-zinc-400">Min Select</label>
              <input type="number" value={form.minSelect} onChange={(e) => setForm({ ...form, minSelect: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
            </div>
            <div>
              <label className="text-xs text-zinc-400">Max Select</label>
              <input type="number" value={form.maxSelect} onChange={(e) => setForm({ ...form, maxSelect: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm({ ...form, isRequired: e.target.checked })} className="accent-amber-500" />
                Required
              </label>
            </div>
          </div>

          <p className="text-xs text-zinc-400 font-medium">Options</p>
          {form.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input placeholder="Option name" value={opt.name} onChange={(e) => {
                const opts = [...form.options];
                opts[i].name = e.target.value;
                setForm({ ...form, options: opts });
              }} className="flex-1 p-2 rounded bg-zinc-700 text-sm" />
              <input placeholder="Price" type="number" step="0.01" value={opt.price} onChange={(e) => {
                const opts = [...form.options];
                opts[i].price = e.target.value;
                setForm({ ...form, options: opts });
              }} className="w-20 p-2 rounded bg-zinc-700 text-sm" />
              {form.options.length > 1 && (
                <button onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })} className="text-red-400 text-sm">X</button>
              )}
            </div>
          ))}
          <button onClick={() => setForm({ ...form, options: [...form.options, { name: "", price: "0" }] })} className="text-sm text-amber-400">+ Add option</button>

          <div className="flex gap-2 pt-2">
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">{editing ? "Update" : "Create"}</button>
            <button onClick={resetForm} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.id} className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">{g.name}</p>
                <p className="text-xs text-zinc-400">
                  Select {g.minSelect}-{g.maxSelect} · {g.isRequired ? "Required" : "Optional"} · {g._count?.menuItems || 0} items linked
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(g)}
                  className="px-3 py-1 rounded bg-zinc-600 text-xs hover:bg-zinc-500"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDuplicate(g)}
                  className="px-3 py-1 rounded bg-zinc-600 text-xs hover:bg-zinc-500"
                >
                  Duplicate
                </button>
                <button onClick={() => handleDelete(g.id)} className="px-3 py-1 rounded bg-red-600 text-xs">Delete</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {g.options?.map((opt: any) => (
                <span key={opt.id} className="px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300">
                  {opt.name}{opt.price > 0 ? ` +$${opt.price.toFixed(2)}` : ""}
                </span>
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p className="text-zinc-500 text-sm">No modifier groups yet.</p>}
      </div>
    </div>
  );
}
