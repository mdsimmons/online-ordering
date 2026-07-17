"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface ModifierGroup {
  id: string;
  name: string;
  options: { id: string; name: string; price: number }[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string;
  category: { id: string; name: string } | null;
  modifierGroups: { id: string; name: string }[];
}

interface Category {
  id: string;
  name: string;
}

const emptyForm = {
  name: "",
  description: "",
  price: "",
  image: "",
  categoryId: "",
  sortOrder: "0",
  modifierGroupIds: [] as string[],
};

export default function AdminItemsPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const load = () => {
    fetch("/api/admin/items").then((r) => r.json()).then(setItems);
    fetch("/api/admin/categories").then((r) => r.json()).then(setCategories);
    fetch("/api/admin/modifiers").then((r) => r.json()).then(setModifierGroups);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditing(null);
    setShowForm(false);
  };

  const openNew = (catId?: string) => {
    setForm({ ...emptyForm, categoryId: catId || filterCategory || "" });
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setForm({
      name: item.name,
      description: item.description || "",
      price: item.price.toString(),
      image: item.image || "",
      categoryId: item.categoryId,
      sortOrder: item.sortOrder.toString(),
      modifierGroupIds: item.modifierGroups?.map((g: any) => g.modifierGroup?.id || g.modifierGroupId) || [],
    });
    setEditing(item.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) return toast.error("Name and price required");
    if (!form.categoryId) return toast.error("Select a category");
    const body = { ...form, price: parseFloat(form.price), sortOrder: parseInt(form.sortOrder) || 0 };
    const method = editing ? "PUT" : "POST";

    const res = await fetch("/api/admin/items", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { ...body, id: editing } : body),
    });

    if (res.ok) {
      toast.success(editing ? "Item updated" : "Item created");
      resetForm();
      load();
    } else {
      const text = await res.text();
      toast.error("Failed to save: " + text);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/admin/items?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed to delete");
  };

  const handleDuplicate = async (item: MenuItem) => {
    const res = await fetch("/api/admin/items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.name + " (copy)",
        description: item.description,
        price: item.price,
        image: item.image || "",
        categoryId: item.categoryId,
        sortOrder: item.sortOrder + 1,
        modifierGroupIds: item.modifierGroups?.map((g: any) => g.modifierGroup?.id || g.id) || [],
      }),
    });
    if (res.ok) { toast.success("Item duplicated"); load(); }
    else toast.error("Failed to duplicate");
  };

  const toggleModifierGroup = (id: string) => {
    setForm((f) => ({
      ...f,
      modifierGroupIds: f.modifierGroupIds.includes(id)
        ? f.modifierGroupIds.filter((g) => g !== id)
        : [...f.modifierGroupIds, id],
    }));
  };

  const filteredItems = filterCategory
    ? items.filter((i) => i.categoryId === filterCategory)
    : items;

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Menu Items</h1>
        <button onClick={() => openNew()} className="px-4 py-2 bg-amber-500 text-black font-medium rounded-lg hover:bg-amber-400 text-sm">
          + Add Item
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilterCategory("")}
          className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${
            filterCategory === "" ? "bg-zinc-900 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
          }`}
        >
          All ({items.length})
        </button>
        {categories.map((cat) => {
          const count = items.filter((i) => i.categoryId === cat.id).length;
          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap shrink-0 ${
                filterCategory === cat.id ? "bg-zinc-900 text-white" : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
              }`}
            >
              {cat.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Edit / Create form */}
      {showForm && (
        <div className="bg-zinc-800 rounded-xl p-4 mb-6 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-zinc-300 font-medium">{editing ? "Edit Item" : "New Item"}</p>
            <button onClick={resetForm} className="text-zinc-500 hover:text-zinc-300 text-lg">&times;</button>
          </div>
          <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm resize-none" rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
            <input placeholder="Sort Order" type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Image</label>
            <input placeholder="Image URL (optional)" value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm mb-2" />
            <label className="block text-xs text-zinc-500 mb-1">Or upload a file:</label>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 500 * 1024) { toast.error("Image must be under 500KB"); return; }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  setForm({ ...form, image: ev.target?.result as string });
                };
                reader.readAsDataURL(file);
              }}
              className="w-full text-sm text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-700 file:text-zinc-300 hover:file:bg-zinc-600 cursor-pointer"
            />
            {form.image && (
              <div className="mt-2 flex items-center gap-3 bg-zinc-700 rounded-lg p-2">
                <img src={form.image} alt="" className="h-10 w-10 rounded object-cover" />
                <span className="text-xs text-zinc-400">Preview</span>
                <button
                  onClick={() => setForm({ ...form, image: "" })}
                  className="ml-auto text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
          <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm">
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {modifierGroups.length > 0 && (
            <div>
              <p className="text-xs text-zinc-400 mb-1">Modifier Groups</p>
              <div className="flex flex-wrap gap-2">
                {modifierGroups.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleModifierGroup(g.id)}
                    className={`px-3 py-1 rounded-full text-xs ${
                      form.modifierGroupIds.includes(g.id)
                        ? "bg-amber-500 text-black"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
              {editing ? "Update" : "Create"}
            </button>
            <button onClick={resetForm} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm hover:bg-zinc-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            onClick={() => openEdit(item)}
            className="bg-zinc-800 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-750 transition-colors"
          >
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-zinc-400">
                ${item.price.toFixed(2)} · {item.category?.name || "Uncategorized"}
                {!item.isAvailable && <span className="text-red-400 ml-2">Unavailable</span>}
                {item.modifierGroups?.length > 0 && (
                  <span className="text-amber-400 ml-2">{item.modifierGroups.map((g: any) => g.modifierGroup?.name || g.name).join(", ")}</span>
                )}
              </p>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={async () => {
                  const res = await fetch("/api/admin/items", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: item.id, isAvailable: !item.isAvailable }),
                  });
                  if (res.ok) load();
                }}
                className={`px-3 py-1 rounded text-xs ${item.isAvailable ? "bg-green-600" : "bg-zinc-600"}`}
              >
                {item.isAvailable ? "Active" : "Hide"}
              </button>
              <button onClick={() => handleDelete(item.id)} className="px-3 py-1 rounded bg-red-600 text-xs hover:bg-red-700">Delete</button>
              <button
                onClick={() => handleDuplicate(item)}
                className="px-3 py-1 rounded bg-zinc-600 text-xs hover:bg-zinc-500"
              >
                Duplicate
              </button>
            </div>
          </div>
        ))}
        {filteredItems.length === 0 && (
          <p className="text-zinc-500 text-sm">
            {filterCategory ? "No items in this category." : "No menu items yet."}
            <button onClick={() => openNew(filterCategory)} className="text-amber-500 underline ml-1">Add one?</button>
          </p>
        )}
      </div>
    </div>
  );
}
