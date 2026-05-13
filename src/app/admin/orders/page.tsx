"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = () => fetch("/api/admin/orders").then((r) => r.json()).then(setOrders);
  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { toast.success(`Order ${status}`); load(); }
    else toast.error("Failed");
  };

  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase().trim();
    return orders.filter((o) => {
      if (filter === "active") {
        if (!["pending", "accepted", "preparing"].includes(o.status)) return false;
      } else if (filter === "pending") {
        if (o.status !== "pending") return false;
      } else if (filter === "preparing") {
        if (o.status !== "preparing") return false;
      } else if (filter === "ready") {
        if (o.status !== "ready") return false;
      } else if (filter === "completed") {
        if (o.status !== "completed") return false;
      } else if (filter === "cancelled") {
        if (o.status !== "cancelled") return false;
      }

      if (dateFrom && new Date(o.createdAt) < new Date(dateFrom + "T00:00:00")) return false;
      if (dateTo && new Date(o.createdAt) > new Date(dateTo + "T23:59:59")) return false;

      if (q) {
        const orderId = o.id.slice(-6).toLowerCase();
        if (
          !o.customerName?.toLowerCase().includes(q) &&
          !o.phone?.includes(q) &&
          !o.email?.toLowerCase().includes(q) &&
          !orderId.includes(q)
        ) return false;
      }

      return true;
    });
  }, [orders, filter, search, dateFrom, dateTo]);

  const counts = {
    active: orders.filter((o) => ["pending", "accepted", "preparing"].includes(o.status)).length,
    pending: orders.filter((o) => o.status === "pending").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  const tabs = [
    { key: "active", label: `Active (${counts.active})` },
    { key: "pending", label: `Pending (${counts.pending})` },
    { key: "preparing", label: "Preparing" },
    { key: "ready", label: "Ready" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: `Declined (${counts.cancelled})` },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Orders</h1>

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
              filter === tab.key
                ? tab.key === "cancelled" ? "bg-red-600 text-white" : "bg-zinc-900 text-white"
                : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, email, or order #..."
          className="flex-1 p-2.5 rounded-lg bg-zinc-700 text-sm border border-zinc-600 placeholder-zinc-500"
        />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="p-2.5 rounded-lg bg-zinc-700 text-sm border border-zinc-600"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="p-2.5 rounded-lg bg-zinc-700 text-sm border border-zinc-600"
          title="To date"
        />
        {(search || dateFrom || dateTo) && (
          <button
            onClick={() => { setSearch(""); setDateFrom(""); setDateTo(""); }}
            className="px-3 py-2 text-xs text-zinc-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      <p className="text-xs text-zinc-500 mb-3">{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</p>

      <div className="space-y-3">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-zinc-800 rounded-xl p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-medium">{order.customerName}</p>
                <p className="text-xs text-zinc-400">{order.phone} · {order.email || "—"} · #{order.id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-zinc-500">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <OrderStatusBadge status={order.status} />
            </div>

            <div className="bg-zinc-900 rounded-lg p-3 mb-3">
              {order.items.map((item: any) => (
                <div key={item.id} className="text-sm flex justify-between py-0.5">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="text-zinc-400">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-400 py-0.5">
                  <span>Coupon ({order.couponCode})</span>
                  <span>-${order.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-zinc-700 mt-2 pt-2 flex justify-between font-bold text-sm">
                <span>Total</span>
                <span>${order.total.toFixed(2)}</span>
              </div>
            </div>

            {order.notes && (
              <p className="text-xs text-zinc-400 mb-2 italic">Notes: {order.notes}</p>
            )}

            <div className="flex gap-2 flex-wrap">
              {order.status === "pending" && (
                <>
                  <button onClick={() => updateStatus(order.id, "accepted")} className="px-3 py-1 bg-green-600 rounded text-xs">Accept</button>
                  <button onClick={() => updateStatus(order.id, "cancelled")} className="px-3 py-1 bg-red-600 rounded text-xs">Cancel</button>
                </>
              )}
              {order.status === "accepted" && (
                <button onClick={() => updateStatus(order.id, "preparing")} className="px-3 py-1 bg-blue-600 rounded text-xs">Start Preparing</button>
              )}
              {order.status === "preparing" && (
                <button onClick={() => updateStatus(order.id, "ready")} className="px-3 py-1 bg-purple-600 rounded text-xs">Mark Ready</button>
              )}
              {order.status === "ready" && (
                <button onClick={() => updateStatus(order.id, "completed")} className="px-3 py-1 bg-zinc-600 rounded text-xs">Complete</button>
              )}
            </div>
          </div>
        ))}
        {filteredOrders.length === 0 && (
          <p className="text-zinc-500 text-sm text-center py-8">No orders match your filters.</p>
        )}
      </div>
    </div>
  );
}
