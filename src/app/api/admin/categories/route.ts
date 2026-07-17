import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { items: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, slug, sortOrder, availableFrom, availableUntil } = body;
  const category = await prisma.category.create({
    data: { name, slug, sortOrder: sortOrder || 0, availableFrom: availableFrom || null, availableUntil: availableUntil || null },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, slug, sortOrder, isActive, availableFrom, availableUntil } = body;
  const category = await prisma.category.update({
    where: { id },
    data: { name, slug, sortOrder, isActive, availableFrom: availableFrom || null, availableUntil: availableUntil || null },
  });
  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const itemIds = (await prisma.menuItem.findMany({ where: { categoryId: id }, select: { id: true } })).map((i) => i.id);

  if (itemIds.length > 0) {
    await prisma.orderItemModifier.deleteMany({ where: { orderItem: { menuItemId: { in: itemIds } } } });
    await prisma.orderItem.deleteMany({ where: { menuItemId: { in: itemIds } } });
    await prisma.menuItemModifierGroup.deleteMany({ where: { menuItemId: { in: itemIds } } });
    await prisma.menuItem.deleteMany({ where: { id: { in: itemIds } } });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
