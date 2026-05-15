"use client";

import { useCart } from "./CartProvider";
import Link from "next/link";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { cart, removeItem, updateQuantity, total, itemCount } = useCart();

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      )}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b border-zinc-200 min-h-14">
            <h2 className="text-lg font-bold">Your Order ({itemCount})</h2>
            <button onClick={onClose} className="p-2 -m-2 text-2xl text-zinc-400 hover:text-zinc-600 touch-manipulation">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-6">
            {cart.items.length === 0 ? (
              <p className="text-zinc-400 text-center mt-8">Cart is empty</p>
            ) : (
              cart.items.map((item) => (
                <div key={item.id} className="bg-zinc-50 rounded-xl p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{item.name}</p>
                      {item.modifiers.length > 0 && (
                        <p className="text-xs text-zinc-500">
                          {item.modifiers.map((m) => m.name).join(", ")}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 -m-2 text-zinc-400 hover:text-red-500 active:text-red-500 touch-manipulation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-base hover:bg-zinc-300 active:bg-zinc-300 touch-manipulation"
                      >
                        -
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center font-bold text-base hover:bg-zinc-300 active:bg-zinc-300 touch-manipulation"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-semibold text-sm">
                      ${((item.price + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {cart.items.length > 0 && (
            <div className="border-t border-zinc-200 p-4 space-y-3 pb-6 safe-bottom">
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Link
                href="/cart"
                onClick={onClose}
                className="block w-full py-3.5 text-white text-center font-bold rounded-xl transition-colors touch-manipulation active:scale-[0.98]"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                Review Order
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
