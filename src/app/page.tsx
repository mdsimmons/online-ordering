"use client";

import { useState, useEffect } from "react";
import { MenuItemCard } from "@/components/MenuItemCard";
import { CartDrawer } from "@/components/CartDrawer";
import { useCart } from "@/components/CartProvider";
import Link from "next/link";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  categoryId: string;
  modifierGroups: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    isRequired: boolean;
    options: { id: string; name: string; price: number }[];
  }[];
}

interface Settings {
  key: string;
  value: string;
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [cartOpen, setCartOpen] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const { cart, addItem, setNotes, clearCart, itemCount } = useCart();
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [loadCode, setLoadCode] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    fetch("/api/menu/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].slug);
      });
    fetch("/api/menu/items")
      .then((r) => r.json())
      .then(setItems);
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        data.forEach((s: Settings) => (map[s.key] = s.value));
        setSettings(map);
      });
  }, []);

  return (
    <div className="min-h-screen bg-page safe-bottom">
      <header className="bg-header border-b border-zinc-200 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between min-h-14">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {settings.brandLogo && (
              <img src={settings.brandLogo} alt="" className="h-8 w-auto object-contain shrink-0" />
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{settings.restaurantName || "Online Ordering"}</h1>
              {settings.restaurantAddress && (
                <p className="text-xs text-zinc-500 truncate">{settings.restaurantAddress}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowLoadModal(true)}
            className="p-2 text-zinc-500 hover:text-zinc-700 touch-manipulation shrink-0"
            title="My Saved Order"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </button>
          <button
            onClick={() => setCartOpen(true)}
            className="relative p-3 bg-brand text-white rounded-full bg-brand-hover transition-colors active:scale-95 touch-manipulation shrink-0 ml-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1"/><circle cx="21" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
            </svg>
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                {itemCount > 99 ? "99+" : itemCount}
              </span>
            )}
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.slug === activeCategory ? "" : cat.slug)}
              className={`px-5 py-2 rounded-full text-sm font-semibold whitespace-nowrap touch-manipulation antialiased tracking-tight ${
                activeCategory === cat.slug
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 active:bg-zinc-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 pb-28">
        {categories
          .filter((cat) => !activeCategory || cat.slug === activeCategory)
          .map((cat) => {
            const catItems = items.filter((item) => item.categoryId === cat.id);
            if (catItems.length === 0) return null;
            return (
              <section key={cat.id} className="mb-8">
                {!activeCategory && (
                  <h2 className="text-lg font-bold mb-3">{cat.name}</h2>
                )}
                <div className="space-y-3">
                  {catItems.map((item) => (
                    <MenuItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}

        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-400">Menu is empty. Add items from the admin panel.</p>
            <Link href="/admin" className="text-brand underline text-sm mt-2 inline-block">
              Go to Admin
            </Link>
          </div>
        )}
      </main>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />

      {showLoadModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowLoadModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <h2 className="text-lg font-bold mb-1">My Saved Order</h2>
              <p className="text-sm text-zinc-500 mb-4">Enter your phone number to reload your saved order.</p>
              <div className="flex gap-2 mb-4">
                <input
                  value={loadCode}
                  onChange={(e) => setLoadCode(e.target.value)}
                  className="flex-1 p-3 border border-zinc-200 rounded-lg text-base text-center"
                  placeholder="Your phone number"
                  type="tel"
                  inputMode="tel"
                />
                <button
                  onClick={async () => {
                    if (!loadCode.trim()) return toast.error("Enter your phone number");
                    setLoadingSaved(true);
                    try {
                      const res = await fetch(`/api/carts/save/phone/${encodeURIComponent(loadCode.trim())}`);
                      if (!res.ok) { toast.error("No saved order for this number"); return; }
                      const data = await res.json();
                      if (data.items?.length) {
                        clearCart();
                        for (const item of data.items) addItem(item);
                        if (data.notes) setNotes(data.notes);
                        setLoadCode("");
                        setShowLoadModal(false);
                        toast.success("Saved order loaded!");
                      }
                    } catch { toast.error("Failed to load saved order"); }
                    finally { setLoadingSaved(false); }
                  }}
                  disabled={loadingSaved || !loadCode.trim()}
                  className="px-5 py-3 bg-zinc-900 text-white font-semibold rounded-lg text-sm hover:bg-zinc-800 disabled:opacity-40"
                >
                  {loadingSaved ? "..." : "Load"}
                </button>
              </div>
              <button
                onClick={() => setShowLoadModal(false)}
                className="text-sm text-zinc-400 hover:text-zinc-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
