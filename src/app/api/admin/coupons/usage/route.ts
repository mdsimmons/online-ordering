import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  const where = code ? { couponCode: code } : {};

  const orders = await prisma.order.findMany({
    where: {
      ...where,
      couponCode: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerName: true,
      total: true,
      discountAmount: true,
      couponCode: true,
      createdAt: true,
    },
  });

  return NextResponse.json(orders);
}
