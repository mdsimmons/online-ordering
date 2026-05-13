import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { code, subtotal } = await req.json();

  if (!code) {
    return NextResponse.json({ error: "Code required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });

  if (!coupon) {
    return NextResponse.json({ valid: false, error: "Invalid coupon code" });
  }

  if (!coupon.isActive) {
    return NextResponse.json({ valid: false, error: "Coupon is no longer active" });
  }

  if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
    return NextResponse.json({ valid: false, error: "Coupon has expired" });
  }

  if (coupon.maxUses != null && coupon.useCount >= coupon.maxUses) {
    return NextResponse.json({ valid: false, error: "Coupon usage limit reached" });
  }

  if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
    return NextResponse.json({
      valid: false,
      error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required`,
    });
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = subtotal * (coupon.discountValue / 100);
  } else {
    discount = coupon.discountValue;
  }

  discount = Math.min(discount, subtotal);

  return NextResponse.json({
    valid: true,
    discount,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
  });
}
