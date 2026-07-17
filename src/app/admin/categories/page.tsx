"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  sortOrder: number;
  categoryId: string;
  modifierGroups: { modifierGroup: { id: string; name: string } }[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
  availableFrom?: string | null;
  availableUntil?: string | null;
  _count?: { items: number };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "" });
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [catForm, setCatForm] = useState({ name: "", slug: "", sortOrder: "", isActive: true, availableFrom: "", availableUntil: "" });

  const load = async () => {
    const [cats, its] = await Promise.all([
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/items").then((r) => r.json()),
    ]);
    setCategories(cats);
    setItems(its);
  };

  useEffect(() => { load(); }, []);

  const handleAddCat = async () => {
    if (!name || !slug) return toast.error("Name and slug required");
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug.toLowerCase().replace(/\s+/g, "-"), sortOrder: categories.length }),
    });
    if (res.ok) { toast.success("Category created"); setName(""); setSlug(""); load(); }
    else toast.error("Failed");
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Delete this category and all its items?")) return;
    const res = await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed");
  };

  const toggleItem = async (id: string, isAvailable: boolean) => {
    await fetch("/api/admin/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isAvailable: !isAvailable }),
    });
    load();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const res = await fetch(`/api/admin/items?id=${id}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); load(); }
    else toast.error("Failed");
  };

  const saveItem = async (id: string) => {
    if (!editForm.name || !editForm.price) return toast.error("Name and price required");
    await fetch("/api/admin/items", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editForm.name, price: parseFloat(editForm.price) }),
    });
    setEditingItem(null);
    load();
  };

  const startEdit = (item: Item) => {
    setEditingItem(item.id);
    setEditForm({ name: item.name, price: item.price.toString() });
  };

  const startEditCat = (cat: Category) => {
    setCatForm({ name: cat.name, slug: cat.slug, sortOrder: String(cat.sortOrder), isActive: cat.isActive, availableFrom: cat.availableFrom || "", availableUntil: cat.availableUntil || "" });
    setEditingCat(cat.id);
  };

  const saveCat = async () => {
    if (!catForm.name || !catForm.slug) return toast.error("Name and slug required");
    const res = await fetch("/api/admin/categories", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingCat,
        name: catForm.name,
        slug: catForm.slug.toLowerCase().replace(/\s+/g, "-"),
        sortOrder: parseInt(catForm.sortOrder) || 0,
        isActive: catForm.isActive,
        availableFrom: catForm.availableFrom || null,
        availableUntil: catForm.availableUntil || null,
      }),
    });
    if (res.ok) { toast.success("Category updated"); setEditingCat(null); load(); }
    else toast.error("Failed to update");
  };

  const catItems = (catId: string) => items.filter((i) => i.categoryId === catId).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Categories</h1>
      </div>

      <div className="bg-zinc-800 rounded-xl p-4 mb-6 flex gap-3">
        <input placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1 p-2 rounded bg-zinc-700 text-sm" />
        <input placeholder="slug-name" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))} className="flex-1 p-2 rounded bg-zinc-700 text-sm" />
        <button onClick={handleAddCat} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium">Add</button>
      </div>

      <div className="space-y-3">
        {categories
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((cat) => {
          const catId = cat.id;
          const expandedItems = expanded === catId ? catItems(catId) : [];
          const count = cat._count?.items ?? catItems(catId).length;
          const isExpanded = expanded === catId;

          return (
            <div key={catId} className="bg-zinc-800 rounded-xl overflow-hidden">
              <div
                onClick={() => setExpanded(isExpanded ? null : catId)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-750 transition-colors"
              >
                <div>
                  <p className="font-medium">{cat.name}</p>
                  <p className="text-xs text-zinc-400">/{cat.slug} · {count} items{cat.availableFrom || cat.availableUntil ? ` · ${cat.availableFrom || "00:00"}-${cat.availableUntil || "23:59"}` : ""}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); startEditCat(cat); }} className="px-3 py-1 rounded bg-zinc-600 text-xs hover:bg-zinc-500">Edit</button>
                  <span className={`text-sm transition-transform ${isExpanded ? "rotate-180" : ""}`}>▾</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteCat(catId); }}
                    className="px-3 py-1 rounded bg-red-600 text-xs hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {editingCat === catId && (
                <div className="border-t border-zinc-700 p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
                    <input placeholder="Slug" value={catForm.slug} onChange={(e) => setCatForm({ ...catForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input placeholder="Sort Order" type="number" value={catForm.sortOrder} onChange={(e) => setCatForm({ ...catForm, sortOrder: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={catForm.isActive} onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })} className="accent-amber-500" />
                      Active
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Available From</label>
                      <input type="time" value={catForm.availableFrom} onChange={(e) => setCatForm({ ...catForm, availableFrom: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Available Until</label>
                      <input type="time" value={catForm.availableUntil} onChange={(e) => setCatForm({ ...catForm, availableUntil: e.target.value })} className="w-full p-2 rounded bg-zinc-700 text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveCat} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Save</button>
                    <button onClick={() => setEditingCat(null)} className="px-4 py-2 bg-zinc-700 text-zinc-300 rounded-lg text-sm">Cancel</button>
                  </div>
                </div>
              )}

              {isExpanded && (
                <div className="border-t border-zinc-700">
                  {expandedItems.length === 0 && (
                    <p className="text-zinc-500 text-xs p-4">No items in this category.</p>
                  )}
                  {expandedItems.map((item) => (
                    <div key={item.id} className="px-4 py-3 border-b border-zinc-700 last:border-b-0">
                      {editingItem === item.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="flex-1 p-1.5 rounded bg-zinc-700 text-sm"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.price}
                            onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                            className="w-20 p-1.5 rounded bg-zinc-700 text-sm"
                          />
                          <button onClick={() => saveItem(item.id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Save</button>
                          <button onClick={() => setEditingItem(null)} className="px-2 py-1 bg-zinc-600 text-white rounded text-xs">Cancel</button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-medium ${!item.isAvailable ? "line-through text-zinc-500" : ""}`}>{item.name}</span>
                              <span className="text-xs text-zinc-400">${item.price.toFixed(2)}</span>
                            </div>
                            {item.modifierGroups?.length > 0 && (
                              <p className="text-xs text-zinc-500 truncate">
                                {item.modifierGroups.map((g) => g.modifierGroup.name).join(", ")}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => startEdit(item)}
                              className="px-2 py-1 rounded text-xs bg-zinc-600 hover:bg-zinc-500"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => toggleItem(item.id, item.isAvailable)}
                              className={`px-2 py-1 rounded text-xs ${item.isAvailable ? "bg-green-700" : "bg-zinc-600"}`}
                            >
                              {item.isAvailable ? "Active" : "Hide"}
                            </button>
                            <button onClick={() => deleteItem(item.id)} className="px-2 py-1 rounded bg-red-600 text-xs hover:bg-red-700">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="p-3 border-t border-zinc-700">
                    <a
                      href="/admin/items"
                      className="text-xs text-amber-500 hover:text-amber-400"
                    >
                      + Manage all items in full editor →
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
