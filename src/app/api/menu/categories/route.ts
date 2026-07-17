import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isTimeActive } from "@/lib/time";

export async function GET() {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  const filtered = categories.filter((c) => isTimeActive(c.availableFrom, c.availableUntil));
  return NextResponse.json(filtered);
}
