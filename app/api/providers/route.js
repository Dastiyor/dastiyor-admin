import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const [providers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: "PROVIDER" },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          isVerified: true,
          createdAt: true,
          balance: true,
          _count: {
            select: {
              responses: true,
              reviewsReceived: true,
            },
          },
          reviewsReceived: {
            select: { rating: true },
          },
          subscription: {
            select: { plan: true, isActive: true, endDate: true },
          },
        },
      }),
      prisma.user.count({ where: { role: "PROVIDER" } }),
    ]);

    const data = providers.map((p) => {
      const ratings = p.reviewsReceived.map((r) => r.rating).filter(Boolean);
      const avgRating = ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null;
      return {
        id: p.id,
        fullName: p.fullName,
        email: p.email,
        phone: p.phone,
        isVerified: p.isVerified,
        createdAt: p.createdAt,
        balance: p.balance,
        responseCount: p._count.responses,
        reviewCount: p._count.reviewsReceived,
        avgRating,
        subscription: p.subscription,
      };
    });

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
