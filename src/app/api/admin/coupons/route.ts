import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(coupons);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt } = body;

  if (!code || discountValue == null) {
    return NextResponse.json({ error: "code and discountValue required" }, { status: 400 });
  }

  const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (existing) {
    return NextResponse.json({ error: "Coupon code already exists" }, { status: 409 });
  }

  const coupon = await prisma.coupon.create({
    data: {
      code: code.toUpperCase(),
      discountType: discountType || "percentage",
      discountValue,
      minOrderAmount: minOrderAmount || null,
      maxUses: maxUses != null ? maxUses : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  return NextResponse.json(coupon, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.coupon.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
