"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ items: 0, categories: 0, orders: 0, pending: 0 });

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/items").then((r) => r.json()),
      fetch("/api/admin/categories").then((r) => r.json()),
      fetch("/api/admin/orders").then((r) => r.json()),
    ]).then(([items, categories, orders]) => {
      setStats({
        items: items.length,
        categories: categories.length,
        orders: orders.length,
        pending: orders.filter((o: any) => o.status === "pending").length,
      });
    });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Menu Items", value: stats.items, color: "bg-blue-500", href: "/admin/items" },
          { label: "Categories", value: stats.categories, color: "bg-green-500", href: "/admin/categories" },
          { label: "Total Orders", value: stats.orders, color: "bg-purple-500", href: "/admin/orders" },
          { label: "Pending Orders", value: stats.pending, color: "bg-amber-500", href: "/admin/orders" },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-zinc-800 rounded-xl p-4 hover:bg-zinc-700 transition-colors"
          >
            <div className={`w-3 h-3 rounded-full ${stat.color} mb-2`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-zinc-400">{stat.label}</p>
          </Link>
        ))}
      </div>

      <div className="bg-zinc-800 rounded-xl p-4">
        <h2 className="font-semibold mb-2">Quick Links</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/admin/items" className="bg-zinc-700 rounded-lg p-3 text-sm hover:bg-zinc-600">Add Menu Item</Link>
          <Link href="/admin/categories" className="bg-zinc-700 rounded-lg p-3 text-sm hover:bg-zinc-600">Manage Categories</Link>
          <Link href="/admin/orders" className="bg-zinc-700 rounded-lg p-3 text-sm hover:bg-zinc-600">View Orders</Link>
          <Link href="/admin/settings" className="bg-zinc-700 rounded-lg p-3 text-sm hover:bg-zinc-600">Settings</Link>
        </div>
      </div>
    </div>
  );
}
