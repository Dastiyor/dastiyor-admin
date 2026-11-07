import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      type: (dir) => [{ type: dir }, { createdAt: "desc" }],
      isRead: (dir) => [{ isRead: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const where = {};
  const userId = searchParams.get("userId");
  if (userId) where.userId = userId;
  if (searchParams.get("unread") === "true") where.isRead = false;
  const or = searchOr(searchParams.get("q"), ["title", "message", "user.fullName", "user.email"]);
  if (or) where.OR = or;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.notification.count({ where }),
  ]);
  return listResponse(notifications, total, list);
});

export const POST = withAdmin(async (request, { admin }) => {
  const { userId, title, message, type = "SYSTEM", link } = await readJson(request);
  if (!String(title || "").trim() || !String(message || "").trim()) {
    throw new HttpError(400, "title and message required");
  }
  const base = {
    title: String(title).trim(),
    message: String(message).trim(),
    type: String(type || "SYSTEM"),
    link: link ? String(link).trim() : null,
  };

  if (userId) {
    const target = await prisma.user.findUnique({ where: { id: String(userId).trim() }, select: { id: true } });
    if (!target) throw new HttpError(404, "No user with this ID");
    const note = await prisma.notification.create({ data: { ...base, userId: target.id } });
    await logAction(request, admin.id, "admin_send_notification", {
      entity: "Notification",
      entityId: note.id,
      details: { userId: target.id, title: base.title },
    });
    return NextResponse.json({ sent: 1, notification: note }, { status: 201 });
  }

  const users = await prisma.user.findMany({ where: { role: { not: "ADMIN" } }, select: { id: true } });
  if (users.length) {
    await prisma.notification.createMany({ data: users.map((u) => ({ ...base, userId: u.id })) });
  }
  await logAction(request, admin.id, "admin_broadcast_notification", {
    entity: "Notification",
    details: { recipients: users.length, title: base.title },
  });
  return NextResponse.json({ sent: users.length }, { status: 201 });
});
