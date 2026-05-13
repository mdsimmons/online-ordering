"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import { StockPanel } from "@/components/StockPanel";

const TIMEOUT_MS = 180000;

interface Order {
  id: string;
  customerName: string;
  email: string | null;
  phone: string;
  notes: string | null;
  status: string;
  total: number;
  createdAt: string;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    modifiers: { name: string; price: number }[];
  }[];
}

interface Printer {
  ip: string;
  port: string;
  label: string;
  configPrefix: string;
  driver: string;
}

interface BlacklistEntry {
  id: string;
  phone: string | null;
  email: string | null;
  reason: string | null;
  createdAt: string;
}

async function printToTargets(printers: Printer[], order: Order) {
  const targets = printers.map((p) => ({
    ip: p.ip,
    port: p.port,
    driver: p.driver,
    configPrefix: p.configPrefix,
  }));
  const res = await fetch("/api/print", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      targets,
      orderId: order.id,
      customerName: order.customerName,
      customerPhone: order.phone,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        modifiers: i.modifiers.map((m) => ({ name: m.name })),
      })),
      notes: order.notes || undefined,
      total: order.total,
      time: new Date(order.createdAt).toLocaleString(),
    }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Print failed");
}

async function printToWebUsb(order: Order) {
  const usbVendorId = 0x0519;
  const device = await navigator.usb!.requestDevice({ filters: [{ vendorId: usbVendorId }] });
  if (!device) throw new Error("No printer selected");

  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);

  const encoder = new TextEncoder();
  const write = async (data: Uint8Array) => {
    await device.transferOut(1, data.buffer as ArrayBuffer);
  };

  await write(encoder.encode("\x1b\x40"));
  await write(encoder.encode("\x1b\x61\x01"));
  await write(encoder.encode("\x1d\x21\x11"));
  await write(encoder.encode("KITCHEN TICKET\n"));
  await write(encoder.encode("\x1d\x21\x00"));
  await write(encoder.encode("\x1b\x61\x00"));
  await write(encoder.encode(`Order #${order.id.slice(-6).toUpperCase()}\n`));
  await write(encoder.encode(`${new Date(order.createdAt).toLocaleString()}\n`));
  await write(encoder.encode("--------------------------------\n"));
  await write(encoder.encode(`Customer: ${order.customerName}\n`));
  await write(encoder.encode(`Phone: ${order.phone}\n`));
  await write(encoder.encode("--------------------------------\n"));
  for (const item of order.items) {
    await write(encoder.encode(`${item.quantity}x ${item.name}\n`));
    for (const m of item.modifiers) {
      await write(encoder.encode(`  + ${m.name}\n`));
    }
  }
  await write(encoder.encode("--------------------------------\n"));
  await write(encoder.encode(`TOTAL: $${order.total.toFixed(2)}\n`));
  if (order.notes) {
    await write(encoder.encode(`\nNotes: ${order.notes}\n`));
  }
  await write(encoder.encode("\n\n\n"));
  await write(encoder.encode("\x1d\x56\x01"));
  await device.close();
}

function PrintMenu({
  order,
  printers,
}: {
  order: Order;
  printers: Printer[];
}) {
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  const browserPrint = () => {
    const w = window.open("", "Receipt", "width=300,height=600");
    if (!w) return;
    const itemsHtml = order.items
      .map(
        (item) => `
        <tr><td style="text-align:left">${item.quantity}x ${item.name}</td><td style="text-align:right">$${(item.price * item.quantity).toFixed(2)}</td></tr>
        ${item.modifiers.map((m) => `<tr><td style="text-align:left;padding-left:12px;font-size:11px;color:#666">  ${m.name}</td><td style="text-align:right;font-size:11px;color:#666">+$${m.price.toFixed(2)}</td></tr>`).join("")}`
      )
      .join("");
    w.document.write(`
      <html><head><title>Order #${order.id.slice(-6).toUpperCase()}</title>
      <style>body{font-family:'Courier New',monospace;font-size:13px;width:280px;margin:0 auto;padding:16px}h1{font-size:18px;text-align:center;margin:0 0 4px}.center{text-align:center}table{width:100%;border-collapse:collapse}td{padding:2px 0}.line{border-top:1px dashed #000;margin:8px 0}.total{font-weight:bold;font-size:15px}.footer{text-align:center;margin-top:8px;font-size:11px}</style></head><body>
        <h1>KITCHEN TICKET</h1>
        <p class="center"><strong>ORDER #${order.id.slice(-6).toUpperCase()}</strong></p>
        <p class="center" style="font-size:11px">${new Date(order.createdAt).toLocaleString()}</p>
        <div class="line"></div>
        <p style="font-size:11px">Customer: ${order.customerName} | ${order.phone}</p>
        <div class="line"></div>
        <table>${itemsHtml}</table>
        <div class="line"></div>
        <table><tr class="total"><td>TOTAL</td><td style="text-align:right">$${order.total.toFixed(2)}</td></tr></table>
        ${order.notes ? `<p style="font-size:11px;margin-top:8px">Notes: ${order.notes}</p>` : ""}
        <div class="line"></div>
        <p class="footer">Thank you!</p>
        <script>window.print();window.close();</script>
      </body></html>`);
    w.document.close();
  };

  const handleNetworkPrint = async (targetPrinters: Printer[]) => {
    if (targetPrinters.length === 0) {
      toast.error("No printers configured — go to Admin > Settings");
      return;
    }
    setPrinting(true);
    try {
      await printToTargets(targetPrinters, order);
      const label = targetPrinters.length === 1 ? targetPrinters[0].label : `${targetPrinters.length} printers`;
      toast.success(`Sent to ${label}`);
    } catch (err: any) {
      toast.error(`Print failed: ${err.message}`);
    } finally {
      setPrinting(false);
    }
  };

  const webUsbPrint = async () => {
    if (!navigator.usb) {
      toast.error("WebUSB not supported in this browser — use Chrome");
      return;
    }
    setPrinting(true);
    try {
      await printToWebUsb(order);
      toast.success("Printed via USB");
    } catch (err: any) {
      toast.error(`USB print failed: ${err.message}`);
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={printing}
        className="px-4 py-3 bg-zinc-100 text-zinc-700 font-medium rounded-xl text-sm hover:bg-zinc-200 transition-colors"
      >
        {printing ? "⌛" : "🖨️"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-zinc-200 p-2 z-20 min-w-48">
            {printers.map((p) => (
              <button
                key={p.ip + p.port}
                onClick={() => { handleNetworkPrint([p]); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100 font-medium text-blue-700"
              >
                🔌 {p.label}
              </button>
            ))}
            {printers.length > 1 && (
              <button
                onClick={() => { handleNetworkPrint(printers); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100 font-medium text-green-700 border-t border-zinc-100 mt-1 pt-2"
              >
                🔌 Print to Both
              </button>
            )}
            {printers.length === 0 && (
              <button disabled className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-400 cursor-not-allowed">
                🔌 No printer configured
              </button>
            )}
            <button onClick={() => { browserPrint(); setOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100">
              🖨️ Browser Print
            </button>
            {typeof navigator !== "undefined" && navigator.usb && (
              <button onClick={() => { webUsbPrint(); setOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-zinc-100">
                🔗 USB Direct
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function AcceptModal({
  order,
  onAccept,
  onCancel,
}: {
  order: Order;
  onAccept: (minutes: string) => void;
  onCancel: () => void;
}) {
  const [minutes, setMinutes] = useState("15");
  const presets = ["10", "15", "20", "25", "30", "45"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold mb-1">Accept Order</h2>
        <p className="text-sm text-zinc-500 mb-4">Order #{order.id.slice(-6).toUpperCase()} — {order.customerName}</p>
        <label className="text-sm text-zinc-600 mb-2 block">Estimated pickup time</label>
        <div className="flex gap-2 mb-3">
          {presets.map((p) => (
            <button
              key={p}
              onClick={() => setMinutes(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                minutes === p ? "bg-amber-500 text-black" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {p} min
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-20 p-2 border border-zinc-200 rounded-lg text-sm text-center"
            min={1}
          />
          <span className="text-sm text-zinc-500">minutes</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAccept(minutes)}
            className="flex-1 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-600"
          >
            Accept — ~{minutes} min
          </button>
          <button onClick={onCancel} className="px-4 py-2.5 bg-zinc-100 text-zinc-600 rounded-xl text-sm hover:bg-zinc-200">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CountdownTimer({ createdAt, onExpire }: { createdAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(TIMEOUT_MS);
  const expired = useRef(false);

  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      const left = Math.max(0, TIMEOUT_MS - elapsed);
      setRemaining(left);
      if (left <= 0 && !expired.current) {
        expired.current = true;
        onExpire();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [createdAt, onExpire]);

  const seconds = Math.ceil(remaining / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  const urgent = remaining < 60000;

  return (
    <span className={`text-xs font-bold tabular-nums ${urgent ? "text-red-500 animate-pulse" : "text-amber-600"}`}>
      ⏱ {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

function OrderCard({
  order,
  onUpdateStatus,
  printers,
  onBlacklist,
  onAutoReject,
  autoMoveToPreparing,
}: {
  order: Order;
  onUpdateStatus: (id: string, status: string) => void;
  printers: Printer[];
  onBlacklist: (phone: string, email: string) => void;
  onAutoReject: (id: string) => void;
  autoMoveToPreparing: boolean;
}) {
  const [showAccept, setShowAccept] = useState(false);

  const handleAccept = async (minutes: string) => {
    const eta = `${minutes} min`;
    const nextStatus = autoMoveToPreparing ? "preparing" : "accepted";
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus, estimatedTime: eta }),
    });
    if (res.ok) {
      toast.success(`Accepted — ETA ${eta}`);
      setShowAccept(false);
      window.location.reload();
    } else {
      toast.error("Failed to accept");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5 animate-fade-in">
      {showAccept && (
        <AcceptModal
          order={order}
          onAccept={handleAccept}
          onCancel={() => setShowAccept(false)}
        />
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-400">
            {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-lg font-bold mt-0.5">#{order.id.slice(-6).toUpperCase()}</p>
          <p className="font-semibold text-base">{order.customerName}</p>
          <p className="text-sm text-zinc-500">{order.phone}</p>
          <p className="text-xs text-zinc-400">{order.email}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {order.status === "pending" && (
            <CountdownTimer createdAt={order.createdAt} onExpire={() => onAutoReject(order.id)} />
          )}
          <span
            className={`px-3 py-1 rounded-full text-sm font-bold whitespace-nowrap ${
              order.status === "pending"
                ? "bg-yellow-100 text-yellow-700 animate-pulse"
                : order.status === "accepted"
                ? "bg-blue-100 text-blue-700"
                : order.status === "preparing"
                ? "bg-purple-100 text-purple-700"
                : order.status === "ready"
                ? "bg-green-100 text-green-700"
                : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="bg-zinc-50 rounded-xl p-4 mb-3">
        {order.items.map((item) => (
          <div key={item.id} className="mb-2 last:mb-0">
            <div className="flex justify-between items-start">
              <span className="font-semibold text-sm">
                {item.quantity}x {item.name}
              </span>
              <span className="text-sm text-zinc-600">${(item.price * item.quantity).toFixed(2)}</span>
            </div>
            {item.modifiers.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {item.modifiers.map((m, i) => (
                  <span key={i} className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    {m.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="border-t border-zinc-200 mt-2 pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
      </div>

      {order.notes && (
        <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-3 text-yellow-800">
          📝 {order.notes}
        </p>
      )}

      <div className="flex gap-2 no-print">
        {order.status === "pending" && (
          <>
            <button
              onClick={() => setShowAccept(true)}
              className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl text-lg hover:bg-green-600 transition-colors active:scale-95"
            >
              Accept
            </button>
            <button
              onClick={() => onUpdateStatus(order.id, "cancelled")}
              className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl text-lg hover:bg-red-600 transition-colors active:scale-95"
            >
              Decline
            </button>
            <button
              onClick={() => onBlacklist(order.phone, order.email || "")}
              className="px-3 py-3 bg-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-300 transition-colors text-lg"
              title="Blacklist customer"
            >
              🚫
            </button>
          </>
        )}
        {order.status === "accepted" && (
          <>
            <button
              onClick={() => onUpdateStatus(order.id, "preparing")}
              className="flex-1 py-3 bg-blue-500 text-white font-bold rounded-xl text-lg hover:bg-blue-600 transition-colors active:scale-95"
            >
              Start Preparing
            </button>
            <button onClick={() => onBlacklist(order.phone, order.email || "")} className="px-3 py-3 bg-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-300 text-lg" title="Blacklist">🚫</button>
          </>
        )}
        {order.status === "preparing" && (
          <>
            <button
              onClick={() => onUpdateStatus(order.id, "ready")}
              className="flex-1 py-3 bg-purple-500 text-white font-bold rounded-xl text-lg hover:bg-purple-600 transition-colors active:scale-95"
            >
              Mark Ready
            </button>
            <button onClick={() => onBlacklist(order.phone, order.email || "")} className="px-3 py-3 bg-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-300 text-lg" title="Blacklist">🚫</button>
          </>
        )}
        {order.status === "ready" && (
          <>
            <button
              onClick={() => onUpdateStatus(order.id, "completed")}
              className="flex-1 py-3 bg-zinc-500 text-white font-bold rounded-xl text-lg hover:bg-zinc-600 transition-colors active:scale-95"
            >
              Complete
            </button>
            <button onClick={() => onBlacklist(order.phone, order.email || "")} className="px-3 py-3 bg-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-300 text-lg" title="Blacklist">🚫</button>
          </>
        )}
        {(order.status === "completed" || order.status === "cancelled") && (
          <button onClick={() => onBlacklist(order.phone, order.email || "")} className="flex-1 py-3 bg-zinc-200 text-zinc-600 font-bold rounded-xl hover:bg-zinc-300 text-lg" title="Blacklist customer">🚫 Blacklist</button>
        )}
        <PrintMenu order={order} printers={printers} />
      </div>
    </div>
  );
}

function BlacklistModal({
  onClose,
  prefillPhone,
  prefillEmail,
}: {
  onClose: () => void;
  prefillPhone?: string;
  prefillEmail?: string;
}) {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [phone, setPhone] = useState(prefillPhone || "");
  const [email, setEmail] = useState(prefillEmail || "");
  const [reason, setReason] = useState("");

  const fetchEntries = async () => {
    const res = await fetch("/api/blacklist");
    if (res.ok) setEntries(await res.json());
  };

  useEffect(() => { fetchEntries(); }, []);

  const handleAdd = async () => {
    if (!phone.trim() && !email.trim()) return toast.error("Enter phone or email");
    const res = await fetch("/api/blacklist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: phone.trim() || null,
        email: email.trim() || null,
        reason: reason.trim() || null,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      return toast.error(data.error || "Failed");
    }
    toast.success("Blacklisted");
    setPhone("");
    setEmail("");
    setReason("");
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/blacklist?id=${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Failed to remove");
    toast.success("Removed");
    fetchEntries();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <h2 className="text-lg font-bold">🚫 Blacklist</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 text-xl">&times;</button>
        </div>

        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="p-2.5 border border-zinc-200 rounded-lg text-sm"
            />
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="p-2.5 border border-zinc-200 rounded-lg text-sm"
            />
            <input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="p-2.5 border border-zinc-200 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700"
          >
            Add to Blacklist
          </button>
        </div>

        <div className="border-t border-zinc-100">
          {entries.length === 0 && (
            <p className="p-5 text-sm text-zinc-400 text-center">No blacklisted entries</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-5 py-3 border-b border-zinc-50 text-sm">
              <div>
                <span className="text-zinc-700">{e.phone || "—"}</span>
                <span className="text-zinc-400 mx-1">·</span>
                <span className="text-zinc-700">{e.email || "—"}</span>
                {e.reason && <span className="text-zinc-400 ml-1">({e.reason})</span>}
              </div>
              <button
                onClick={() => handleDelete(e.id)}
                className="text-red-400 hover:text-red-600 text-xs font-semibold"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function playAlert(ctx: AudioContext, type: string) {
  try {
    if (type === "chime") {
      const t = ctx.currentTime;
      [660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.25, t + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.25);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.25);
      });
    } else if (type === "alarm") {
      const t = ctx.currentTime;
      [800, 600, 800, 600].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.15, t + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.08);
        osc.start(t + i * 0.1);
        osc.stop(t + i * 0.1 + 0.08);
      });
    } else if (type === "bell") {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 523;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      osc.start(t);
      osc.stop(t + 0.8);
    } else {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.start(t);
      osc.stop(t + 0.3);
    }
  } catch {}
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>("active");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [autoPrint, setAutoPrint] = useState(false);
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [blacklistPrefill, setBlacklistPrefill] = useState<{ phone?: string; email?: string }>({});
  const [notificationSound, setNotificationSound] = useState("beep");
  const [autoMoveToPreparing, setAutoMoveToPreparing] = useState(false);
  const alertInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const prevOrderIds = useRef<Set<string>>(new Set());
  const autoRejected = useRef<Set<string>>(new Set());

  const startAlert = useCallback(() => {
    if (alertInterval.current) return;
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.current.state === "suspended") {
      audioCtx.current.resume();
    }
    playAlert(audioCtx.current, notificationSound);
    alertInterval.current = setInterval(() => {
      if (audioCtx.current) playAlert(audioCtx.current, notificationSound);
    }, 1500);
  }, [notificationSound]);

  const stopAlert = useCallback(() => {
    if (alertInterval.current) {
      clearInterval(alertInterval.current);
      alertInterval.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopAlert();
  }, [stopAlert]);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const config: Record<string, string> = {};
        data.forEach((s: any) => (config[s.key] = s.value));
        const list: Printer[] = [];
        if (config.printerIP) {
          list.push({
            ip: config.printerIP,
            port: config.printerPort || "9100",
            label: `Printer 1 (${config.printerIP})`,
            configPrefix: "receipt_",
            driver: config.printerDriver || "starline",
          });
        }
        if (config.printer2IP && (config.printer2Enabled === "true" || config.printer2Enabled === "1")) {
          list.push({
            ip: config.printer2IP,
            port: config.printer2Port || "9100",
            label: `Printer 2 (${config.printer2IP})`,
            configPrefix: "receipt2_",
            driver: config.printer2Driver || "starline",
          });
        }
        setPrinters(list);
        if (config.notificationSound) setNotificationSound(config.notificationSound);
        if (config.autoMoveToPreparing === "true") setAutoMoveToPreparing(true);
      });
  }, []);

  const autoRejectOrder = useCallback(async (id: string) => {
    if (autoRejected.current.has(id)) return;
    autoRejected.current.add(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", notes: "Auto-rejected — not accepted in time" }),
      });
      if (res.ok) {
        toast(`Order #${id.slice(-6).toUpperCase()} auto-rejected (timeout)`, { icon: "⏰" });
      }
    } catch {}
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const data: Order[] = await res.json();

      const newIds = new Set(data.map((o) => o.id));
      const newPending = data.filter(
        (o) => o.status === "pending" && !prevOrderIds.current.has(o.id)
      );

      if (newPending.length > 0) {
        startAlert();
      }

      const stillPending = data.filter((o) => o.status === "pending");
      if (stillPending.length === 0) {
        stopAlert();
      }

      if (autoPrint && printers.length > 0) {
        for (const order of newPending) {
          try {
            await printToTargets(printers, order);
          } catch (e: any) {
            console.error(`[AUTO-PRINT] Failed for order ${order.id}:`, e.message);
          }
        }
      }

      for (const order of data) {
        if (order.status === "pending") {
          const elapsed = Date.now() - new Date(order.createdAt).getTime();
          if (elapsed >= TIMEOUT_MS) {
            autoRejectOrder(order.id);
          }
        }
      }

      prevOrderIds.current = newIds;
      setOrders(data);
    } catch {}
  }, [autoPrint, printers, startAlert, stopAlert, autoRejectOrder]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 5000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Order ${status}`);
      loadOrders();
    } else {
      toast.error("Failed");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "active") return ["pending", "accepted", "preparing"].includes(o.status);
    if (filter === "ready") return o.status === "ready";
    if (filter === "declined") return o.status === "cancelled";
    if (filter === "all") {
      return new Date(o.createdAt).toISOString().slice(0, 10) === selectedDate;
    }
    return true;
  });

  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const activeCount = orders.filter((o) => ["pending", "accepted", "preparing"].includes(o.status)).length;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🍔 Kitchen Display</h1>
            <p className="text-xs text-zinc-500">
              {pendingCount > 0 && (
                <span className="text-red-500 font-bold animate-pulse">{pendingCount} pending</span>
              )}
              {pendingCount === 0 && activeCount > 0 && (
                <span>{activeCount} active</span>
              )}
              {activeCount === 0 && <span>All clear</span>}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              {printers.map((p, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full"
                >
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {p.label}
                </span>
              ))}
              {printers.length === 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full">
                  No printers configured
                </span>
              )}
            </div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoPrint}
                onChange={(e) => setAutoPrint(e.target.checked)}
                className="accent-amber-500"
              />
              Auto-print
            </label>
            <button
              onClick={() => setFilter("active")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                filter === "active" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilter("ready")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                filter === "ready" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Ready
            </button>
            <button
              onClick={() => setFilter("declined")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                filter === "declined" ? "bg-red-600 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              Declined
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                filter === "all" ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-600"
              }`}
            >
              All
            </button>
            <button
              onClick={() => { setBlacklistPrefill({}); setShowBlacklist(true); }}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              title="Blacklist"
            >
              🚫
            </button>
            <button
              onClick={() => setShowStock(true)}
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              title="Stock Management"
            >
              📦
            </button>
          </div>
        </div>
      </header>

      {filter === "all" && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm text-zinc-500 font-medium">Date:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="p-2 rounded-lg bg-white border border-zinc-200 text-sm"
            />
            <span className="text-xs text-zinc-400">
              {filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6">
        {showBlacklist && (
          <BlacklistModal
            onClose={() => setShowBlacklist(false)}
            prefillPhone={blacklistPrefill.phone}
            prefillEmail={blacklistPrefill.email}
          />
        )}
        {showStock && <StockPanel onClose={() => setShowStock(false)} />}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-2">✅</p>
            <p className="text-zinc-400 text-lg">All orders handled!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onUpdateStatus={updateStatus}
                printers={printers}
                onBlacklist={(phone, email) => { setBlacklistPrefill({ phone, email }); setShowBlacklist(true); }}
                onAutoReject={autoRejectOrder}
                autoMoveToPreparing={autoMoveToPreparing}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
