"use client";

import { KitchenAuthGate } from "@/components/KitchenAuthGate";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <KitchenAuthGate>{children}</KitchenAuthGate>;
}
