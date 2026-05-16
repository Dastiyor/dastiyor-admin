import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;
    const userId = searchParams.get("userId") || undefined;
    const taskId = searchParams.get("taskId") || undefined;

    const where = {};
    if (userId) where.OR = [{ senderId: userId }, { receiverId: userId }];
    if (taskId) where.taskId = taskId;

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { id: true, fullName: true, email: true, role: true } },
          receiver: { select: { id: true, fullName: true, email: true, role: true } },
          task: { select: { id: true, title: true, status: true } },
        },
      }),
      prisma.message.count({ where }),
    ]);

    return NextResponse.json({
      data: messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
