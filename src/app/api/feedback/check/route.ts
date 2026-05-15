import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ qualifies: false });

  const setting = await prisma.setting.findUnique({
    where: { key: "feedbackCampaign" },
  });
  if (!setting) return NextResponse.json({ qualifies: false });

  const config = JSON.parse(setting.value);
  if (!config.enabled || !config.targetItemId) return NextResponse.json({ qualifies: false });

  const timeframeMs = (config.timeframeDays || 180) * 24 * 60 * 60 * 1000;
  const since = new Date(Date.now() - timeframeMs);

  const feedback = await prisma.feedbackResponse.findFirst({
    where: { phone, discountUsed: false },
  });

  const hasPastOrder = await prisma.order.findFirst({
    where: {
      phone,
      createdAt: { gte: since },
      items: { some: { menuItemId: config.targetItemId } },
    },
  });

  const qualifies = !!hasPastOrder && !feedback;

  return NextResponse.json({
    qualifies,
    questions: qualifies ? config.questions : undefined,
    title: qualifies ? config.popupTitle : undefined,
    subtitle: qualifies ? config.popupSubtitle : undefined,
    discountLabel: qualifies ? config.discountLabel : undefined,
  });
}
