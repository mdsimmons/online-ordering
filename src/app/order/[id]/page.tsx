"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import type { OrderWithItems } from "@/lib/types";

export default function OrderStatusPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      try {
        const res = await fetch(`/api/orders/${id}`);
        if (res.ok) setOrder(await res.json());
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchOrder();
    const interval = setInterval(fetchOrder, 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4 safe-bottom">
        <p className="text-zinc-400">Loading order...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-4 safe-bottom">
        <p className="text-zinc-400 mb-6">Order not found</p>
        <Link href="/" className="text-brand underline text-lg font-medium">Back to menu</Link>
      </div>
    );
  }

  const formatEstimate = (e: string) => {
    if (/^\d+\s*min/.test(e)) return `~ ${e}`;
    return e;
  };

  const statusMessages: Record<string, string> = {
    pending: "We've received your order and will confirm shortly.",
    accepted: "Your order has been accepted! We're getting started.",
    preparing: "We're preparing your order right now.",
    ready: "Your order is ready for pickup!",
    completed: "Order completed. Thank you!",
    cancelled: "This order has been cancelled.",
  };

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4 safe-bottom">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-zinc-200 p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        <h1 className="text-xl font-bold mb-1">Order Placed!</h1>
        <p className="text-sm text-zinc-500 mb-4">Order #{order.id.slice(-6).toUpperCase()}</p>

        <OrderStatusBadge status={order.status} />
        {order.estimatedTime && (
          <div className="mt-3 mb-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm font-semibold text-amber-800">Estimated pickup</p>
            <p className="text-lg font-bold text-amber-900">{formatEstimate(order.estimatedTime)}</p>
          </div>
        )}
        <p className="text-sm text-zinc-600 mt-3 mb-6">{statusMessages[order.status]}</p>

        <div className="bg-zinc-50 rounded-xl p-4 mb-4 text-left">
          <h3 className="font-semibold text-sm mb-2">Items</h3>
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm py-1">
              <span>{item.quantity}x {item.name}</span>
              <span className="text-zinc-600">${item.price.toFixed(2)}</span>
            </div>
          ))}
          <div className="border-t border-zinc-200 mt-2 pt-2 flex justify-between font-bold">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        <Link
          href="/"
          className="block w-full py-3.5 bg-brand text-white rounded-xl font-medium bg-brand-hover transition-colors touch-manipulation active:scale-[0.98]"
        >
          Order More
        </Link>
      </div>
    </div>
  );
}
