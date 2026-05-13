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
  const { name, slug, sortOrder } = body;
  const category = await prisma.category.create({
    data: { name, slug, sortOrder: sortOrder || 0 },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, name, slug, sortOrder, isActive } = body;
  const category = await prisma.category.update({
    where: { id },
    data: { name, slug, sortOrder, isActive },
  });
  return NextResponse.json(category);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.menuItem.updateMany({
    where: { categoryId: id },
    data: { categoryId: "" },
  });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
