"use client";

import { useEffect, useState, ReactNode } from "react";

const defaults: Record<string, string> = {
  brandPrimary: "#f59e0b",
  brandAccent: "#16a34a",
  brandHeaderBg: "#ffffff",
  brandPageBg: "#fafafa",
  brandLink: "#f59e0b",
  brandBtnText: "#ffffff",
};

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        data.forEach((s: any) => (map[s.key] = s.value));
        setBranding(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, fallback] of Object.entries(defaults)) {
      const val = branding[key] || fallback;
      const cssVar = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
      root.style.setProperty(cssVar, val);
    }
    if (branding.brandLogo) {
      root.style.setProperty("--brand-logo", `url(${branding.brandLogo})`);
    } else {
      root.style.removeProperty("--brand-logo");
    }
    if (branding.brandPrimary) {
      root.style.setProperty("--brand-primary-hover", adjustBrightness(branding.brandPrimary, -20));
    }
  }, [branding]);

  return <>{children}</>;
}

function adjustBrightness(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
