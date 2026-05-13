"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";

interface StockOption {
  id: string;
  name: string;
  isOut: boolean;
  outOfStockUntil: string | null;
  outOfStockIndefinite: boolean;
}

interface StockModifierGroup {
  id: string;
  name: string;
  options: StockOption[];
}

interface StockItem {
  id: string;
  name: string;
  categoryName: string;
  isOut: boolean;
  outOfStockUntil: string | null;
  outOfStockIndefinite: boolean;
  modifierGroups: StockModifierGroup[];
}

function StockCountdown({ until }: { until: string }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const tick = () => {
      const left = Math.max(0, new Date(until).getTime() - Date.now());
      setRemaining(left);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [until]);

  if (remaining <= 0) return null;

  const d = Math.floor(remaining / 86400000);
  const h = Math.floor((remaining % 86400000) / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);

  return (
    <span className="text-xs font-bold tabular-nums text-red-500">
      {d > 0 ? `${d}d ` : ""}{h}:{m.toString().padStart(2, "0")}
    </span>
  );
}

interface MarkModalProps {
  name: string;
  onMark: (duration: number | null) => void;
  onCancel: () => void;
}

function MarkModal({ name, onMark, onCancel }: MarkModalProps) {
  const [duration, setDuration] = useState<number>(1440);
  const [customMin, setCustomMin] = useState("");

  const presets = [
    { label: "1 day", value: 1440 },
    { label: "2 days", value: 2880 },
    { label: "3 days", value: 4320 },
    { label: "1 week", value: 10080 },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-bold mb-1">Mark out of stock</h3>
        <p className="text-sm text-zinc-500 mb-4">{name}</p>

        <div className="flex flex-wrap gap-2 mb-3">
          {presets.map((p) => (
            <button
              key={p.value}
              onClick={() => { setDuration(p.value); setCustomMin(""); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                duration === p.value && !customMin
                  ? "bg-red-500 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            placeholder="Custom min"
            value={customMin}
            onChange={(e) => { setCustomMin(e.target.value); setDuration(0); }}
            className="w-28 p-2 border border-zinc-200 rounded-lg text-sm text-center"
            min={1}
          />
          <span className="text-sm text-zinc-500">minutes</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onMark(customMin ? parseInt(customMin) : duration)}
            className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl text-sm hover:bg-red-600"
          >
            Mark Out of Stock
          </button>
          <button
            onClick={() => onMark(null)}
            className="flex-1 py-2.5 bg-zinc-800 text-white font-bold rounded-xl text-sm hover:bg-zinc-700"
          >
            Indefinite
          </button>
        </div>

        <button onClick={onCancel} className="w-full mt-2 py-2 text-sm text-zinc-400 hover:text-zinc-600">
          Cancel
        </button>
      </div>
    </div>
  );
}

export function StockPanel({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [markTarget, setMarkTarget] = useState<{ id: string; name: string; isOption: boolean } | null>(null);

  const fetchStock = async () => {
    const res = await fetch("/api/stock");
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => { fetchStock(); }, []);

  const handleMark = async (duration: number | null) => {
    if (!markTarget) return;
    const res = await fetch("/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(markTarget.isOption ? { optionId: markTarget.id } : { itemId: markTarget.id }),
        duration: duration,
      }),
    });
    if (res.ok) {
      toast.success(duration === -1 ? "Restocked" : duration === null ? "Marked out indefinitely" : `Out for ${duration} min`);
      setMarkTarget(null);
      fetchStock();
    } else {
      toast.error("Failed");
    }
  };

  const handleRestock = async (id: string, isOption: boolean) => {
    const res = await fetch("/api/stock", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(isOption ? { optionId: id } : { itemId: id }),
        duration: -1,
      }),
    });
    if (res.ok) {
      toast.success("Restocked");
      fetchStock();
    } else {
      toast.error("Failed");
    }
  };

  const groups: Record<string, StockItem[]> = {};
  for (const item of items) {
    if (!groups[item.categoryName]) groups[item.categoryName] = [];
    groups[item.categoryName].push(item);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-12">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-zinc-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold">📦 Stock Management</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl">&times;</button>
        </div>

        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {Object.entries(groups).map(([catName, catItems]) => (
            <div key={catName}>
              <h3 className="text-sm font-semibold text-zinc-500 mb-2 uppercase tracking-wide">{catName}</h3>
              <div className="space-y-1.5">
                {catItems.map((item) => (
                  <div key={item.id}>
                    <div
                      className={`flex items-center justify-between p-3 rounded-xl text-sm transition-colors ${
                        item.isOut ? "bg-red-50 border border-red-200" : "bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${item.isOut ? "bg-red-500" : "bg-green-500"}`} />
                        <span className="font-medium truncate">{item.name}</span>
                        {item.isOut && !item.outOfStockIndefinite && item.outOfStockUntil && (
                          <StockCountdown until={item.outOfStockUntil} />
                        )}
                        {item.outOfStockIndefinite && (
                          <span className="text-xs text-red-500 font-semibold">Indefinite</span>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {item.isOut ? (
                          <button
                            onClick={() => handleRestock(item.id, false)}
                            className="px-3 py-1.5 bg-green-500 text-white text-xs font-bold rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Restock
                          </button>
                        ) : (
                          <button
                            onClick={() => setMarkTarget({ id: item.id, name: item.name, isOption: false })}
                            className="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Out
                          </button>
                        )}
                      </div>
                    </div>

                    {item.modifierGroups.map((mg) => (
                      <div key={mg.id} className="ml-6 mt-1 mb-2">
                        <p className="text-xs text-zinc-400 font-medium mb-1">{mg.name}</p>
                        {mg.options.map((opt) => (
                          <div
                            key={opt.id}
                            className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-colors mb-0.5 ${
                              opt.isOut ? "bg-orange-50 border border-orange-200" : ""
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${opt.isOut ? "bg-orange-500" : "bg-green-400"}`} />
                              <span className="text-zinc-600 truncate">{opt.name}</span>
                              {opt.isOut && !opt.outOfStockIndefinite && opt.outOfStockUntil && (
                                <StockCountdown until={opt.outOfStockUntil} />
                              )}
                              {opt.outOfStockIndefinite && (
                                <span className="text-xs text-orange-500 font-semibold">Indefinite</span>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {opt.isOut ? (
                                <button
                                  onClick={() => handleRestock(opt.id, true)}
                                  className="px-2 py-1 bg-green-400 text-white text-xs font-bold rounded-lg hover:bg-green-500 transition-colors"
                                >
                                  Restock
                                </button>
                              ) : (
                                <button
                                  onClick={() => setMarkTarget({ id: opt.id, name: `${item.name} › ${opt.name}`, isOption: true })}
                                  className="px-2 py-1 bg-orange-400 text-white text-xs font-bold rounded-lg hover:bg-orange-500 transition-colors"
                                >
                                  Out
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {markTarget && (
        <MarkModal
          name={markTarget.name}
          onMark={handleMark}
          onCancel={() => setMarkTarget(null)}
        />
      )}
    </div>
  );
}
