import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, notes } = body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const code = generateCode();
    const saved = await prisma.savedCart.create({
      data: {
        code,
        data: JSON.stringify({ items, notes }),
      },
    });

    const url = `${req.headers.get("origin") || ""}/cart?load=${code}`;

    return NextResponse.json({ code: saved.code, url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code?: string[] }> }
) {
  try {
    const { code: codeArr } = await params;
    const code = codeArr?.[0];
    if (!code) {
      return NextResponse.json({ error: "Code required" }, { status: 400 });
    }

    const saved = await prisma.savedCart.findUnique({ where: { code } });
    if (!saved) {
      return NextResponse.json({ error: "Saved order not found" }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(saved.data));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
