import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const now = new Date();

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      items: {
        where: {
          isAvailable: true,
          outOfStockIndefinite: false,
          OR: [
            { outOfStockUntil: null },
            { outOfStockUntil: { lt: now } },
          ],
        },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          image: true,
          categoryId: true,
          sortOrder: true,
          isAvailable: true,
          outOfStockIndefinite: true,
        },
      },
    },
  });

  const origin = request.headers.get("origin") || "";
  const allowedOrigins = [
    "https://paw-pawsplace.com",
    "http://localhost:3000",
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://paw-pawsplace.com";

  const body = JSON.stringify(categories);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin") || "";
  const allowedOrigins = [
    "https://paw-pawsplace.com",
    "http://localhost:3000",
  ];
  const corsOrigin = allowedOrigins.includes(origin) ? origin : "https://paw-pawsplace.com";

  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": corsOrigin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
