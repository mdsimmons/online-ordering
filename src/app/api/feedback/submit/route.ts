import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { phone, customerName, itemId, answers } = await req.json();
  if (!phone || !itemId || !answers) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const setting = await prisma.setting.findUnique({
    where: { key: "feedbackCampaign" },
  });
  if (!setting) return NextResponse.json({ error: "No campaign configured" }, { status: 400 });

  const config = JSON.parse(setting.value);
  const discountValue = config.discountValue || 0;

  const response = await prisma.feedbackResponse.create({
    data: {
      phone,
      customerName: customerName || "",
      itemId,
      answers: JSON.stringify(answers),
      discountAmount: discountValue,
    },
  });

  return NextResponse.json({
    success: true,
    discountAmount: discountValue,
    message: config.discountLabel || "Thanks for your feedback!",
  });
}
