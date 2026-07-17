import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isTimeActive } from "@/lib/time";

export async function GET() {
  const now = new Date();
  const items = await prisma.menuItem.findMany({
    where: {
      isAvailable: true,
      outOfStockIndefinite: false,
      OR: [
        { outOfStockUntil: null },
        { outOfStockUntil: { lt: now } },
      ],
    },
    orderBy: { sortOrder: "asc" },
    include: {
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

  const filtered = items.filter((item) => isTimeActive(item.availableFrom, item.availableUntil));

  const transformed = filtered.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    image: item.image,
    categoryId: item.categoryId,
    modifierGroups: item.modifierGroups.map((mg) => ({
      id: mg.modifierGroup.id,
      name: mg.modifierGroup.name,
      minSelect: mg.modifierGroup.minSelect,
      maxSelect: mg.modifierGroup.maxSelect,
      isRequired: mg.modifierGroup.isRequired,
      options: mg.modifierGroup.options.filter((opt) => {
        if (opt.outOfStockIndefinite) return false;
        if (opt.outOfStockUntil && opt.outOfStockUntil > now) return false;
        return true;
      }).map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: opt.price,
      })),
    })),
  }));

  return NextResponse.json(transformed);
}
