"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { AdminAuthGate } from "@/components/AdminAuthGate";

const nav = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/items", label: "Menu Items", icon: "🍔" },
  { href: "/admin/categories", label: "Categories", icon: "📁" },
  { href: "/admin/modifiers", label: "Modifiers", icon: "⚙️" },
  { href: "/admin/orders", label: "Orders", icon: "📋" },
  { href: "/admin/settings", label: "Settings", icon: "🔧" },
  { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
  { href: "/admin/feedback", label: "Feedback", icon: "💬" },
  { href: "/admin/blacklist", label: "Blacklist", icon: "🚫" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [brandLogo, setBrandLogo] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.find((x: any) => x.key === "brandLogo");
        if (s) setBrandLogo(s.value);
      })
      .catch(() => {});
  }, []);

  return (
    <AdminAuthGate>
    <div className="min-h-screen bg-zinc-900 text-white flex">
      <aside className="w-56 bg-zinc-950 border-r border-zinc-800 hidden md:block">
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {brandLogo && <img src={brandLogo} alt="" className="h-6 w-auto object-contain" />}
            <Link href="/admin" className="text-lg font-bold" style={{ color: "var(--brand-primary)" }}>Admin Panel</Link>
          </div>
          <Link href="/" className="block text-xs text-zinc-500 mt-1 hover:text-zinc-300">&larr; View Site</Link>
        </div>
        <nav className="p-2 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                path === item.href
                  ? "font-semibold"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
              style={path === item.href ? { color: "var(--brand-primary)", backgroundColor: "color-mix(in srgb, var(--brand-primary) 10%, transparent)" } : undefined}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="bg-zinc-900 border-b border-zinc-800 p-4 md:hidden">
          <div className="flex gap-2 overflow-x-auto">
            {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap ${
                    path === item.href
                      ? "text-white"
                      : "bg-zinc-800 text-zinc-400"
                  }`}
                  style={path === item.href ? { backgroundColor: "var(--brand-primary)" } : undefined}
                >
                {item.label}
              </Link>
            ))}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden max-w-full">{children}</main>
      </div>
    </div>
    </AdminAuthGate>
  );
}
