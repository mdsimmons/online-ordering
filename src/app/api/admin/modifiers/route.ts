import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const groups = await prisma.modifierGroup.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      options: { orderBy: { sortOrder: "asc" } },
      _count: { select: { menuItems: true } },
    },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, minSelect, maxSelect, isRequired, options } = body;

  const group = await prisma.modifierGroup.create({
    data: {
      name,
      minSelect: minSelect || 0,
      maxSelect: maxSelect || 1,
      isRequired: isRequired || false,
      options: options
        ? {
            create: options.map((opt: any, i: number) => ({
              name: opt.name,
              price: opt.price || 0,
              sortOrder: i,
            })),
          }
        : undefined,
    },
    include: { options: true },
  });

  return NextResponse.json(group, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, minSelect, maxSelect, isRequired, options } = body;

  const group = await prisma.modifierGroup.update({
    where: { id },
    data: { name, minSelect, maxSelect, isRequired },
  });

  if (options) {
    await prisma.modifierOption.deleteMany({ where: { groupId: id } });
    await prisma.modifierOption.createMany({
      data: options.map((opt: any, i: number) => ({
        groupId: id,
        name: opt.name,
        price: opt.price || 0,
        sortOrder: i,
      })),
    });
  }

  return NextResponse.json(group);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.menuItemModifierGroup.deleteMany({ where: { modifierGroupId: id } });
  await prisma.modifierOption.deleteMany({ where: { groupId: id } });
  await prisma.modifierGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
