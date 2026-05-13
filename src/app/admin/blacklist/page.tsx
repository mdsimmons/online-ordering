"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";

interface BlacklistEntry {
  id: string;
  phone: string | null;
  email: string | null;
  reason: string | null;
  createdAt: string;
}

export default function BlacklistPage() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchEntries = async () => {
    const res = await fetch("/api/blacklist");
    const data = await res.json();
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAdd = async () => {
    if (!phone.trim() && !email.trim()) {
      return toast.error("Enter a phone number or email");
    }
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
      return toast.error(data.error || "Failed to add");
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
    <div>
      <h1 className="text-2xl font-bold mb-6">Blacklist</h1>

      <div className="bg-zinc-800 rounded-xl p-4 mb-6 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            placeholder="Phone number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-3 rounded-lg bg-zinc-700 text-white text-sm border border-zinc-600"
          />
          <input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 rounded-lg bg-zinc-700 text-white text-sm border border-zinc-600"
          />
          <input
            placeholder="Reason (optional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="p-3 rounded-lg bg-zinc-700 text-white text-sm border border-zinc-600"
          />
        </div>
        <button
          onClick={handleAdd}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold"
        >
          Add to Blacklist
        </button>
      </div>

      <div className="bg-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-zinc-400 border-b border-zinc-700 text-left">
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3">Reason</th>
              <th className="p-3">Date</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} className="p-6 text-center text-zinc-500">Loading...</td></tr>
            )}
            {!loading && entries.length === 0 && (
              <tr><td colSpan={5} className="p-6 text-center text-zinc-500">No blacklisted entries</td></tr>
            )}
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-zinc-700/50 text-zinc-300">
                <td className="p-3">{e.phone || "—"}</td>
                <td className="p-3">{e.email || "—"}</td>
                <td className="p-3 text-zinc-400">{e.reason || "—"}</td>
                <td className="p-3 text-zinc-400 text-xs">
                  {new Date(e.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="text-red-400 hover:text-red-300 text-xs font-semibold"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
