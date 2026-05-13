"use client";

import { useState, useEffect, ReactNode, useRef } from "react";

const STORAGE_KEY = "kitchen_auth";

export function KitchenAuthGate({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [correctPassword, setCorrectPassword] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const s = data.find((x: any) => x.key === "kitchenPassword");
        const pw = s?.value || "";
        setCorrectPassword(pw);
        if (!pw) {
          setAuthenticated(true);
        } else {
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved === pw) setAuthenticated(true);
          else inputRef.current?.focus();
        }
      })
      .catch(() => setAuthenticated(true))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      localStorage.setItem(STORAGE_KEY, password);
      setAuthenticated(true);
    } else {
      setError(true);
      setPassword("");
      setTimeout(() => setError(false), 2000);
    }
  };

  if (loading) return null;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-zinc-800 rounded-2xl p-6 w-full max-w-sm border border-zinc-700">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🍔</div>
            <h1 className="text-xl font-bold text-white">Kitchen Access</h1>
            <p className="text-sm text-zinc-400 mt-1">Enter the kitchen password</p>
          </div>
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`w-full p-3 rounded-lg text-base text-center bg-zinc-700 text-white border ${
              error ? "border-red-500" : "border-zinc-600"
            } focus:outline-none focus:border-amber-500 transition-colors`}
            placeholder="Password"
            autoComplete="off"
          />
          {error && (
            <p className="text-red-400 text-sm text-center mt-2">Incorrect password</p>
          )}
          <button
            type="submit"
            className="w-full mt-4 py-3 bg-amber-500 text-black font-bold rounded-lg hover:bg-amber-400 transition-colors active:scale-[0.98] touch-manipulation"
          >
            Enter
          </button>
          <label className="flex items-center gap-2 text-sm text-zinc-500 mt-4 justify-center cursor-pointer">
            <input
              type="checkbox"
              defaultChecked
              onChange={(e) => {
                if (!e.target.checked) localStorage.removeItem(STORAGE_KEY);
              }}
              className="accent-amber-500"
            />
            Remember me
          </label>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}
