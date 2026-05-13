"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import type { CartItem } from "@/lib/types";

interface ModifierGroup {
  id: string;
  name: string;
  minSelect: number;
  maxSelect: number;
  isRequired: boolean;
  options: { id: string; name: string; price: number }[];
}

interface MenuItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  modifierGroups: ModifierGroup[];
}

export function MenuItemCard({ item }: { item: MenuItemData }) {
  const { addItem } = useCart();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);

  const hasModifiers = item.modifierGroups.length > 0;

  const toggleOption = (groupId: string, optionId: string) => {
    setSelected((prev) => {
      const current = prev[groupId] || [];
      const group = item.modifierGroups.find((g) => g.id === groupId)!;
      if (current.includes(optionId)) {
        if (group.minSelect && current.length <= group.minSelect) return prev;
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
      if (group.maxSelect === 1) {
        return { ...prev, [groupId]: [optionId] };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const modifiersTotal = item.modifierGroups.reduce((sum, g) => {
    const selectedIds = selected[g.id] || [];
    return sum + selectedIds.reduce((s, id) => {
      const opt = g.options.find((o) => o.id === id);
      return s + (opt?.price || 0);
    }, 0);
  }, 0);

  const canAdd = () => {
    if (!hasModifiers) return true;
    return item.modifierGroups.every((g) => {
      const count = (selected[g.id] || []).length;
      return count >= g.minSelect && count <= g.maxSelect;
    });
  };

  const handleAdd = () => {
    if (hasModifiers && !open) {
      setOpen(true);
      return;
    }
    if (hasModifiers && !canAdd()) return;

    const mods = item.modifierGroups.flatMap((g) =>
      (selected[g.id] || []).map((optId) => {
        const opt = g.options.find((o) => o.id === optId)!;
        return { id: opt.id, name: opt.name, price: opt.price };
      })
    );

    const cartItem: CartItem = {
      id: `${item.id}-${Date.now()}`,
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: qty,
      modifiers: mods,
    };

    addItem(cartItem);
    setOpen(false);
    setSelected({});
    setQty(1);
  };

  return (
    <>
      <div
        onClick={() => hasModifiers && setOpen(true)}
        className="bg-white rounded-2xl border border-zinc-200 p-4 active:scale-[0.99] transition-transform touch-manipulation cursor-pointer flex gap-4"
      >
        {item.image && (
          <div className="w-20 h-20 rounded-xl bg-zinc-100 shrink-0 overflow-hidden">
            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg">{item.name}</h3>
            <span className="font-bold text-brand whitespace-nowrap shrink-0">
              ${item.price.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1 line-clamp-2">{item.description}</p>
          {hasModifiers && (
            <span className="text-xs text-brand mt-2 inline-block font-medium">
              + Customize
            </span>
          )}
          {!hasModifiers && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdd();
              }}
              className="mt-2 text-sm bg-brand text-white px-5 py-2 rounded-full font-medium bg-brand-hover transition-colors touch-manipulation active:scale-95"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center safe-bottom"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 pb-8 max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{item.name}</h2>
              <button onClick={() => setOpen(false)} className="p-2 -m-2 text-zinc-400 hover:text-zinc-600 text-2xl leading-none touch-manipulation">&times;</button>
            </div>
            <p className="text-zinc-500 text-sm mb-4">{item.description}</p>
            <p className="text-lg font-bold text-brand mb-4">${item.price.toFixed(2)}</p>

            {item.modifierGroups.map((group) => (
              <div key={group.id} className="mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-semibold">{group.name}</span>
                  <span className="text-xs text-zinc-400">
                    {group.isRequired ? "Required" : "Optional"}
                    {group.maxSelect > 1 && ` · Choose up to ${group.maxSelect}`}
                  </span>
                </div>
                <div className="space-y-1">
                  {group.options.map((opt) => {
                    const isSelected = (selected[group.id] || []).includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors touch-manipulation ${
                          isSelected
                            ? "border-zinc-200"
                            : "border-zinc-200 hover:border-zinc-300 active:border-zinc-300"
                        }`}
                        style={isSelected ? { borderColor: "var(--brand-primary)", backgroundColor: "color-mix(in srgb, var(--brand-primary) 8%, transparent)" } : undefined}
                      >
                        <input
                          type={group.maxSelect === 1 ? "radio" : "checkbox"}
                          name={`group-${group.id}`}
                          checked={isSelected}
                          onChange={() => toggleOption(group.id, opt.id)}
                          className="accent-amber-500 w-5 h-5"
                        />
                        <span className="flex-1 text-sm">{opt.name}</span>
                        {opt.price > 0 && (
                          <span className="text-sm text-zinc-500">+${opt.price.toFixed(2)}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex items-center gap-4 mb-4">
              <span className="font-semibold">Qty:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold hover:bg-zinc-200 active:bg-zinc-200 touch-manipulation text-lg"
                >
                  -
                </button>
                <span className="w-8 text-center font-semibold text-lg">{qty}</span>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center font-bold hover:bg-zinc-200 active:bg-zinc-200 touch-manipulation text-lg"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={!canAdd()}
              className="w-full py-4 bg-brand text-white font-bold rounded-xl bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation active:scale-[0.98] text-lg"
            >
              Add to Order — ${((item.price + modifiersTotal) * qty).toFixed(2)}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
