import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;
    const userId = searchParams.get("userId") || undefined;
    const unreadOnly = searchParams.get("unread") === "true";

    const where = {};
    if (userId) where.userId = userId;
    if (unreadOnly) where.isRead = false;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.notification.count({ where }),
    ]);

    return NextResponse.json({
      data: notifications,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, title, message, type = "SYSTEM", link } = body;

    if (!title?.trim() || !message?.trim()) {
      return NextResponse.json({ error: "title and message required" }, { status: 400 });
    }

    if (userId) {
      const note = await prisma.notification.create({
        data: { userId, title: title.trim(), message: message.trim(), type, link: link || null },
      });
      return NextResponse.json({ sent: 1, notification: note }, { status: 201 });
    }

    const users = await prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { id: true },
    });

    if (users.length === 0) return NextResponse.json({ sent: 0 });

    await prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        title: title.trim(),
        message: message.trim(),
        type,
        link: link || null,
      })),
    });

    return NextResponse.json({ sent: users.length }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
