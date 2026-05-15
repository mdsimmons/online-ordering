import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const responses = await prisma.feedbackResponse.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(responses);
}
