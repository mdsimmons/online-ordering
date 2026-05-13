import { NextRequest, NextResponse } from "next/server";
import type { ReceiptConfig } from "@/lib/starline";
import { StarLineBuilder, printToNetworkPrinter } from "@/lib/starline";
import { EscPosBuilder } from "@/lib/escpos";
import prisma from "@/lib/prisma";

interface PrintTarget {
  ip: string;
  port?: string;
  driver?: string;
  configPrefix?: string;
}

const rcKeys = [
  "fontSizeRestaurantName", "fontSizeRestaurantInfo", "fontSizeOrderNumber",
  "fontSizeTime", "fontSizeCustomerLabel", "fontSizeItems", "fontSizeModifiers",
  "fontSizeTotal", "fontSizeNotes", "lineHeight", "charsPerLine",
  "spacingTop", "spacingBeforeOrder", "spacingBeforeCustomer",
  "spacingBetweenItems", "spacingBeforeTotal", "spacingBottom",
] as const;

function buildReceiptConfig(config: Record<string, string>, prefix: string): ReceiptConfig {
  const rc: ReceiptConfig = {};
  for (const key of rcKeys) {
    const val = config[`${prefix}${key}`];
    if (val !== undefined && val !== "") {
      (rc as any)[key] = parseFloat(val);
    }
  }
  return rc;
}

interface BaseOrderData {
  restaurantName: string;
  restaurantAddress?: string;
  restaurantPhone?: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: { name: string; quantity: number; modifiers: { name: string }[] }[];
  notes?: string;
  total: number;
  time: string;
}

async function sendToOnePrinter(
  base: BaseOrderData,
  ip: string,
  port: number,
  driver: string,
  receiptConfig: ReceiptConfig,
): Promise<{ success: boolean; error?: string }> {
  let data: Uint8Array;

  if (driver === "escpos") {
    const builder = new EscPosBuilder();
    data = builder.buildKitchenReceipt(base);
  } else {
    const builder = new StarLineBuilder();
    data = await builder.buildKitchenReceipt({ ...base, config: receiptConfig });
  }

  return printToNetworkPrinter(data, ip, port);
}

async function printAll(
  base: BaseOrderData,
  targets: { ip: string; port: number; driver: string; cfg: ReceiptConfig }[],
) {
  const results = await Promise.allSettled(
    targets.map((t) => sendToOnePrinter(base, t.ip, t.port, t.driver, t.cfg))
  );

  const errors: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const label = `${targets[i].driver === "escpos" ? "ESC/POS" : "Star Line"} @ ${targets[i].ip}`;
    if (r.status === "fulfilled") {
      if (r.value.success) {
        console.log(`[PRINT] ${label} — success`);
      } else {
        errors.push(`${label}: ${r.value.error}`);
        console.error(`[PRINT] ${label} — ${r.value.error}`);
      }
    } else {
      errors.push(`${label}: ${r.reason?.message || "Unknown error"}`);
      console.error(`[PRINT] ${label} — ${r.reason}`);
    }
  }

  return { errors, total: targets.length };
}

function buildBase(config: Record<string, string>, body: any): BaseOrderData {
  const items = body.items || [];
  return {
    restaurantName: config.restaurantName || "Restaurant",
    restaurantAddress: config.restaurantAddress,
    restaurantPhone: config.restaurantPhone,
    orderNumber: body.orderId?.slice(-6).toUpperCase() || "",
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    items,
    notes: body.notes,
    total: body.total,
    time: body.time || new Date().toLocaleString(),
  };
}

export async function POST(req: NextRequest) {
  try {
    const settings = await prisma.setting.findMany();
    const config: Record<string, string> = {};
    settings.forEach((s) => (config[s.key] = s.value));

    const body = await req.json();
    const targets = body.targets as PrintTarget[] | undefined;

    // Determine targets from body or DB
    const resolved: { ip: string; port: number; driver: string; cfg: ReceiptConfig }[] = [];

    if (targets && targets.length > 0) {
      // Explicit targets from the request body
      for (const t of targets) {
        resolved.push({
          ip: t.ip,
          port: parseInt(t.port || "9100", 10),
          driver: t.driver || "starline",
          cfg: buildReceiptConfig(config, t.configPrefix || "receipt_"),
        });
      }
    } else {
      // Fall back to DB-configured printers
      const p1ip = body.printerIp || body.printerIP || config.printerIP || config.printerIp || "";
      const p1port = parseInt(body.printerPort || config.printerPort || "9100", 10);
      if (p1ip) {
        resolved.push({
          ip: p1ip,
          port: p1port,
          driver: config.printerDriver || "starline",
          cfg: buildReceiptConfig(config, "receipt_"),
        });
      }
      const p2ip = config.printer2IP || "";
      if (p2ip && (config.printer2Enabled === "true" || config.printer2Enabled === "1")) {
        resolved.push({
          ip: p2ip,
          port: parseInt(config.printer2Port || "9100", 10),
          driver: config.printer2Driver || "starline",
          cfg: buildReceiptConfig(config, "receipt2_"),
        });
      }
    }

    if (resolved.length === 0) {
      console.error("[PRINT] No printer targets available");
      return NextResponse.json(
        { success: false, error: "No printer configured. Go to Admin > Settings to set one up." },
        { status: 400 }
      );
    }

    const base = buildBase(config, body);
    const { errors, total } = await printAll(base, resolved);

    if (errors.length === 0) {
      return NextResponse.json({ success: true });
    } else if (errors.length < total) {
      return NextResponse.json({ success: true, partial: true, errors });
    } else {
      return NextResponse.json({ success: false, error: errors.join("; ") }, { status: 502 });
    }
  } catch (err: any) {
    console.error(`[PRINT] Internal error:`, err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
