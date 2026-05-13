"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface Coupon {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  useCount: number;
  expiresAt: string | null;
  isActive: boolean;
}

interface UsageRecord {
  id: string;
  customerName: string;
  total: number;
  discountAmount: number;
  couponCode: string;
  createdAt: string;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [form, setForm] = useState({
    code: "",
    discountType: "percentage",
    discountValue: "",
    minOrderAmount: "",
    maxUses: "",
    expiresAt: "",
  });

  const fetchCoupons = async () => {
    const res = await fetch("/api/admin/coupons");
    if (res.ok) setCoupons(await res.json());
  };

  useEffect(() => { fetchCoupons(); }, []);

  const toggleUsage = async (code: string) => {
    if (expandedCode === code) {
      setExpandedCode(null);
      return;
    }
    setExpandedCode(code);
    setLoadingUsage(true);
    try {
      const res = await fetch(`/api/admin/coupons/usage?code=${encodeURIComponent(code)}`);
      if (res.ok) setUsage(await res.json());
    } catch {} finally {
      setLoadingUsage(false);
    }
  };

  const handleCreate = async () => {
    if (!form.code || !form.discountValue) {
      return toast.error("Code and value required");
    }
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      }),
    });
    if (res.ok) {
      toast.success("Coupon created");
      setShowForm(false);
      setForm({ code: "", discountType: "percentage", discountValue: "", minOrderAmount: "", maxUses: "", expiresAt: "" });
      fetchCoupons();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      fetchCoupons();
    } else {
      toast.error("Failed");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Coupons</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-brand text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          {showForm ? "Cancel" : "+ New Coupon"}
        </button>
      </div>

      {showForm && (
        <div className="bg-zinc-800 rounded-xl p-5 mb-6 max-w-lg space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Code</label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full p-2 rounded bg-zinc-700 text-sm font-mono uppercase"
                placeholder="SAVE20"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Type</label>
              <select
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed ($)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Value</label>
              <input
                type="number"
                value={form.discountValue}
                onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
                placeholder={form.discountType === "percentage" ? "20" : "5"}
                min={0}
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Min order (optional)</label>
              <input
                type="number"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
                placeholder="0"
                min={0}
                step="0.01"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Max uses (optional)</label>
              <input
                type="number"
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
                placeholder="Leave blank for unlimited"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-1">Expires (optional)</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full p-2 rounded bg-zinc-700 text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            className="w-full py-2.5 bg-amber-500 text-black font-bold rounded-xl text-sm hover:bg-amber-400"
          >
            Create Coupon
          </button>
        </div>
      )}

      <div className="space-y-3">
        {coupons.length === 0 && (
          <p className="text-zinc-500 text-sm">No coupons yet</p>
        )}
        {coupons.map((c) => (
          <div key={c.id}>
            <div
              onClick={() => c.useCount > 0 && toggleUsage(c.code)}
              className={`bg-zinc-800 rounded-xl p-4 flex items-center justify-between ${
                c.useCount > 0 ? "cursor-pointer hover:bg-zinc-750" : ""
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-amber-400">{c.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-900 text-green-300" : "bg-zinc-700 text-zinc-400"}`}>
                    {c.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <p className="text-sm text-zinc-400">
                  {c.discountType === "percentage" ? `${c.discountValue}% off` : `$${c.discountValue.toFixed(2)} off`}
                  {c.minOrderAmount && <span> · Min ${c.minOrderAmount.toFixed(2)}</span>}
                  <span> · Used {c.useCount}{c.maxUses ? `/${c.maxUses}` : ""} times</span>
                  {c.expiresAt && <span> · Expires {new Date(c.expiresAt).toLocaleDateString()}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.useCount > 0 && (
                  <span className="text-xs text-zinc-500">{expandedCode === c.code ? "▲" : "▼"}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>

            {expandedCode === c.code && (
              <div className="bg-zinc-750 rounded-b-xl border-t border-zinc-700 overflow-hidden">
                {loadingUsage ? (
                  <p className="p-4 text-sm text-zinc-500">Loading...</p>
                ) : usage.length === 0 ? (
                  <p className="p-4 text-sm text-zinc-500">No usage records found</p>
                ) : (
                  <div className="divide-y divide-zinc-700">
                    {usage.map((r) => (
                      <div key={r.id} className="px-4 py-3 flex items-center justify-between text-sm">
                        <div>
                          <span className="text-zinc-300">{r.customerName}</span>
                          <span className="text-zinc-500 mx-2">·</span>
                          <span className="text-zinc-500">
                            {new Date(r.createdAt).toLocaleDateString()} {new Date(r.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-green-400">-${r.discountAmount.toFixed(2)}</span>
                          <span className="text-zinc-500 mx-1">·</span>
                          <span className="text-zinc-300">${r.total.toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
