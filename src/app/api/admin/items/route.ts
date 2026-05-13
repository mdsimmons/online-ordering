import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const items = await prisma.menuItem.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      category: true,
      modifierGroups: {
        include: {
          modifierGroup: {
            include: { options: true },
          },
        },
      },
    },
  });
  const now = new Date();
  const mapped = items.map((item) => ({
    ...item,
    _isOutOfStock: item.outOfStockIndefinite ||
      (item.outOfStockUntil && new Date(item.outOfStockUntil) > now),
  }));
  return NextResponse.json(mapped);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, price, image, categoryId, sortOrder, modifierGroupIds } = body;

  const item = await prisma.menuItem.create({
    data: {
      name,
      description,
      price,
      image,
      categoryId,
      sortOrder: sortOrder || 0,
      modifierGroups: modifierGroupIds
        ? {
            create: modifierGroupIds.map((groupId: string) => ({
              modifierGroup: { connect: { id: groupId } },
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      modifierGroups: {
        include: { modifierGroup: { include: { options: true } } },
      },
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, description, price, image, categoryId, isAvailable, sortOrder, modifierGroupIds } = body;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      name,
      description,
      price,
      image,
      categoryId,
      isAvailable,
      sortOrder,
    },
  });

  if (modifierGroupIds) {
    await prisma.menuItemModifierGroup.deleteMany({
      where: { menuItemId: id },
    });
    await prisma.menuItemModifierGroup.createMany({
      data: modifierGroupIds.map((groupId: string) => ({
        menuItemId: id,
        modifierGroupId: groupId,
      })),
    });
  }

  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.menuItemModifierGroup.deleteMany({ where: { menuItemId: id } });
  await prisma.orderItemModifier.deleteMany({
    where: { orderItem: { menuItemId: id } },
  });
  await prisma.orderItem.deleteMany({ where: { menuItemId: id } });
  await prisma.menuItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
