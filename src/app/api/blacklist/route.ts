import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const entries = await prisma.blacklist.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const { phone, email, reason } = await req.json();

  if (!phone && !email) {
    return NextResponse.json({ error: "Phone or email required" }, { status: 400 });
  }

  const existing = await prisma.blacklist.findFirst({
    where: { OR: [{ phone }, { email }].filter((c) => c.phone || c.email) },
  });

  if (existing) {
    return NextResponse.json({ error: "Already blacklisted" }, { status: 409 });
  }

  const entry = await prisma.blacklist.create({
    data: { phone, email, reason },
  });

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.blacklist.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
