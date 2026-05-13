import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const now = new Date();

  const items = await prisma.menuItem.findMany({
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
    include: {
      category: true,
      modifierGroups: {
        include: {
          modifierGroup: {
            include: {
              options: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  const mapped = items.map((item) => {
    const itemOut = item.outOfStockIndefinite ||
      (item.outOfStockUntil && item.outOfStockUntil > now);

    const modifierGroups = item.modifierGroups.map((mg) => ({
      id: mg.modifierGroup.id,
      name: mg.modifierGroup.name,
      options: mg.modifierGroup.options.map((opt) => {
        const optOut = opt.outOfStockIndefinite ||
          (opt.outOfStockUntil && opt.outOfStockUntil > now);
        return {
          id: opt.id,
          name: opt.name,
          isOut: optOut,
          outOfStockUntil: opt.outOfStockUntil?.toISOString() || null,
          outOfStockIndefinite: opt.outOfStockIndefinite,
        };
      }),
    }));

    return {
      id: item.id,
      name: item.name,
      categoryName: item.category.name,
      isOut: itemOut,
      outOfStockUntil: item.outOfStockUntil?.toISOString() || null,
      outOfStockIndefinite: item.outOfStockIndefinite,
      modifierGroups,
    };
  });

  return NextResponse.json(mapped);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { itemId, optionId, duration } = body;
  const targetId = optionId || itemId;

  if (!targetId) {
    return NextResponse.json({ error: "itemId or optionId required" }, { status: 400 });
  }

  const updateData = (() => {
    if (duration === -1) {
      return { outOfStockUntil: null, outOfStockIndefinite: false };
    }
    if (duration === null) {
      return { outOfStockUntil: null, outOfStockIndefinite: true };
    }
    return {
      outOfStockUntil: new Date(Date.now() + duration * 60 * 1000),
      outOfStockIndefinite: false,
    };
  })();

  if (optionId) {
    await prisma.modifierOption.update({
      where: { id: optionId },
      data: updateData,
    });
  } else {
    await prisma.menuItem.update({
      where: { id: itemId },
      data: updateData,
    });
  }

  return NextResponse.json({ success: true });
}
