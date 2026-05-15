"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useCart } from "@/components/CartProvider";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const STORAGE_KEY = "customer_info";

function CartContent() {
  const { cart, addItem, removeItem, updateQuantity, setNotes, total, clearCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const loadedRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [remember, setRemember] = useState(true);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponValid, setCouponValid] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [checkingCoupon, setCheckingCoupon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [savedCode, setSavedCode] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [loadCode, setLoadCode] = useState("");
  const [loadingSaved, setLoadingSaved] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const info = JSON.parse(saved);
        if (info.name) setName(info.name);
        if (info.email) setEmail(info.email);
        if (info.phone) setPhone(info.phone);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (loadedRef.current) return;
    const code = searchParams.get("load");
    if (!code) return;
    loadedRef.current = true;
    (async () => {
      try {
        const res = await fetch(`/api/carts/save/${code}`);
        if (!res.ok) { toast.error("Saved order not found or expired"); return; }
        const data = await res.json();
        if (data.items?.length) {
          clearCart();
          for (const item of data.items) {
            addItem(item);
          }
          if (data.notes) setNotes(data.notes);
          toast.success("Saved order loaded!");
          router.replace("/cart");
        }
      } catch { toast.error("Failed to load saved order"); }
    })();
  }, []);

  const checkCoupon = async () => {
    if (!couponCode.trim()) return;
    setCheckingCoupon(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), subtotal: total }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponDiscount(data.discount);
        setCouponValid(true);
        setCouponError("");
        toast.success(`Coupon applied! Save $${data.discount.toFixed(2)}`);
      } else {
        setCouponDiscount(0);
        setCouponValid(false);
        setCouponError(data.error || "Invalid coupon");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCheckingCoupon(false);
    }
  };

  const handleSave = async () => {
    if (!phone.trim()) return toast.error("Enter your phone number to save");
    setSaving(true);
    try {
      const res = await fetch("/api/carts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.items,
          notes: cart.notes,
          phone: phone.trim(),
          customerName: name.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSavedCode(data.code);
      setSavedUrl(data.url);
      setShowSavedModal(true);
    } catch (err: any) {
      toast.error(err.message || "Failed to save order");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadSaved = async () => {
    if (!loadCode.trim()) return toast.error("Enter your phone number");
    const phoneVal = loadCode.trim();
    setLoadingSaved(true);
    try {
      const res = await fetch(`/api/carts/save/phone/${encodeURIComponent(phoneVal)}`);
      if (!res.ok) { toast.error("No saved order found for this number"); return; }
      const data = await res.json();
      if (data.items?.length) {
        clearCart();
        for (const item of data.items) addItem(item);
        if (data.notes) setNotes(data.notes);
        if (data._customerName) setName(data._customerName);
        setLoadCode("");
        toast.success("Saved order loaded!");
      }
    } catch {
      toast.error("Failed to load saved order");
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) return toast.error("Enter your name");
    if (!email.trim()) return toast.error("Enter your email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return toast.error("Enter a valid email");
    if (!phone.trim()) return toast.error("Enter your phone number");
    if (cart.items.length === 0) return toast.error("Cart is empty");

    if (remember) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }));
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          notes: cart.notes,
          items: cart.items.map((item) => ({
            menuItemId: item.menuItemId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            modifiers: item.modifiers,
          })),
          total,
          couponCode: couponValid ? couponCode.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403) {
          toast.error(data.error || "You are not allowed to place orders.");
        } else {
          throw new Error(data.error || "Failed to place order");
        }
        return;
      }

      clearCart();
      router.push(`/order/${data.id}`);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-page flex flex-col items-center justify-center p-4 safe-bottom">
        <p className="text-zinc-400 mb-6">Your cart is empty</p>
        <Link href="/" className="text-brand underline text-lg font-medium mb-8">Back to menu</Link>

        <div className="w-full max-w-sm bg-white rounded-xl p-5 border border-zinc-200">
          <h2 className="font-semibold text-center mb-3">Reorder from Saved Order</h2>
          <p className="text-xs text-zinc-400 text-center mb-3">Enter the phone number you used to order & we'll load your saved items.</p>
          <div className="flex gap-2">
            <input
              value={loadCode}
              onChange={(e) => setLoadCode(e.target.value)}
              className="flex-1 p-3 border border-zinc-200 rounded-lg text-base text-center"
              placeholder="Your phone number"
              type="tel"
              inputMode="tel"
            />
            <button
              onClick={handleLoadSaved}
              disabled={loadingSaved || !loadCode.trim()}
              className="px-5 py-3 bg-zinc-900 text-white font-semibold rounded-lg text-sm hover:bg-zinc-800 disabled:opacity-40"
            >
              {loadingSaved ? "..." : "Load"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page safe-bottom">
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-6 min-h-12">
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 p-2 -ml-2 touch-manipulation">&larr; Back</Link>
          <h1 className="text-xl font-bold">Review Order</h1>
        </div>

        <div className="space-y-3 mb-6">
          {cart.items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 border border-zinc-200">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.name} &times; {item.quantity}</p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-zinc-500 mt-1">{item.modifiers.map((m) => m.name).join(", ")}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className="font-semibold">
                    ${((item.price + item.modifiers.reduce((s, m) => s + m.price, 0)) * item.quantity).toFixed(2)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="p-2 -m-2 text-zinc-400 hover:text-red-500 active:text-red-500 text-xl touch-manipulation">&times;</button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-bold hover:bg-zinc-200 active:bg-zinc-200 touch-manipulation">-</button>
                <span className="text-base font-medium w-8 text-center">{item.quantity}</span>
                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-lg font-bold hover:bg-zinc-200 active:bg-zinc-200 touch-manipulation">+</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200 mb-6">
          <h2 className="font-semibold mb-3">Your Details</h2>
          <div className="space-y-3">
            <input
              placeholder="Your name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3.5 border border-zinc-200 rounded-lg text-base"
            />
            <input
              placeholder="Email *"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              inputMode="email"
              className="w-full p-3.5 border border-zinc-200 rounded-lg text-base"
            />
            <input
              placeholder="Phone number *"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              className="w-full p-3.5 border border-zinc-200 rounded-lg text-base"
            />
            <textarea
              placeholder="Order notes (e.g., allergies, preferences)"
              value={cart.notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-3.5 border border-zinc-200 rounded-lg text-base resize-none"
              rows={2}
            />
            <label className="flex items-center gap-3 text-sm text-zinc-500 cursor-pointer py-1 touch-manipulation">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-amber-500 w-5 h-5"
              />
              Remember me for next time
            </label>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200 mb-4">
          <h2 className="font-semibold mb-2">Coupon Code</h2>
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponValid(false); setCouponDiscount(0); setCouponError(""); }}
              className="flex-1 p-3 border border-zinc-200 rounded-lg text-base uppercase font-mono"
              placeholder="Enter code"
            />
            <button
              onClick={checkCoupon}
              disabled={checkingCoupon || !couponCode.trim()}
              className="px-4 py-2 bg-zinc-900 text-white font-semibold rounded-lg text-sm hover:bg-zinc-800 disabled:opacity-40"
            >
              {checkingCoupon ? "..." : "Apply"}
            </button>
          </div>
          {couponValid && (
            <p className="text-green-600 text-sm mt-1">-${couponDiscount.toFixed(2)} discount applied</p>
          )}
          {couponError && (
            <p className="text-red-500 text-sm mt-1">{couponError}</p>
          )}
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200 mb-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            {couponValid && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-600">Discount</span>
                <span className="text-green-600">-${couponDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="border-t border-zinc-200 pt-2 flex items-center justify-between font-bold text-lg">
              <span>Total</span>
              <span>${Math.max(0, total - couponDiscount).toFixed(2)}</span>
            </div>
          </div>
          <p className="text-xs text-zinc-400 mt-1">Pay when you pick up</p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 font-semibold rounded-xl border-2 border-zinc-300 text-zinc-600 mb-3 hover:bg-zinc-50 transition-colors text-base touch-manipulation active:scale-[0.98]"
        >
          {saving ? "Saving..." : "Save as My Order"}
        </button>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-4 font-bold rounded-xl disabled:opacity-50 transition-colors text-lg touch-manipulation active:scale-[0.98] text-btn"
          style={{ backgroundColor: "var(--brand-accent)" }}
        >
          {submitting ? "Placing Order..." : "Place Order"}
        </button>
      </div>

      {showSavedModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSavedModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
              <div className="text-4xl mb-3">&#128076;</div>
              <h2 className="text-lg font-bold mb-1">Saved as My Order!</h2>
              <p className="text-sm text-zinc-500 mb-2">Next time, just enter your phone number to reorder.</p>
              <div className="bg-zinc-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-zinc-400 mb-1">Saved for phone:</p>
                <p className="text-lg font-bold">{phone}</p>
              </div>
              <button
                onClick={() => { setShowSavedModal(false); toast.success("Your order is saved to your phone number!"); }}
                className="w-full py-3 bg-zinc-900 text-white font-bold rounded-xl text-sm hover:bg-zinc-800 mb-2"
              >
                Got it
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full" />
      </div>
    }>
      <CartContent />
    </Suspense>
  );
}
