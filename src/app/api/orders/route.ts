import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { modifiers: true },
      },
    },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customerName, email, phone, notes, items, total, couponCode } = body;

  if (!customerName || !email || !phone) {
    return NextResponse.json(
      { error: "Name, email, and phone are required" },
      { status: 400 }
    );
  }

  // Check blacklist
  const blacklisted = await prisma.blacklist.findFirst({
    where: {
      OR: [{ phone }, { email }],
    },
  });

  if (blacklisted) {
    return NextResponse.json(
      { error: "This phone number or email is not allowed to place orders." },
      { status: 403 }
    );
  }

  let discountAmount = 0;

  if (couponCode) {
    const coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });

    if (coupon && coupon.isActive) {
      const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
      const maxedOut = coupon.maxUses != null && coupon.useCount >= coupon.maxUses;
      const belowMin = coupon.minOrderAmount && total < coupon.minOrderAmount;

      if (!expired && !maxedOut && !belowMin) {
        if (coupon.discountType === "percentage") {
          discountAmount = total * (coupon.discountValue / 100);
        } else {
          discountAmount = coupon.discountValue;
        }
        discountAmount = Math.min(discountAmount, total);

        await prisma.coupon.update({
          where: { id: coupon.id },
          data: { useCount: { increment: 1 } },
        });
      }
    }
  }

  const finalTotal = Math.round((total - discountAmount) * 100) / 100;

  const order = await prisma.order.create({
    data: {
      customerName,
      email: email || null,
      phone,
      notes,
      total: finalTotal,
      couponCode: couponCode?.toUpperCase() || null,
      discountAmount,
      status: "pending",
      items: {
        create: items.map((item: any) => ({
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          modifiers: {
            create: item.modifiers.map((mod: any) => ({
              modifierOptionId: mod.id,
              name: mod.name,
              price: mod.price,
            })),
          },
        })),
      },
    },
    include: {
      items: { include: { modifiers: true } },
    },
  });

  return NextResponse.json(order, { status: 201 });
}
