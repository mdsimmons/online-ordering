import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  const setting = await prisma.setting.findUnique({
    where: { key: "feedbackCampaign" },
  });
  const config = setting ? JSON.parse(setting.value) : null;
  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  await prisma.setting.upsert({
    where: { key: "feedbackCampaign" },
    update: { value: JSON.stringify(body) },
    create: { key: "feedbackCampaign", value: JSON.stringify(body) },
  });
  return NextResponse.json({ success: true });
}
