import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withAdmin } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Admin activity feed for the header bell.
 *
 * The Notification table holds per-user events (offers, task completions), which
 * are not admin business. This derives the events an admin cares about from the
 * source records instead, so nothing new has to be written on every action.
 */
export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "8", 10) || 8));

  const [users, tasks, reviews, reports] = await Promise.all([
    prisma.user.findMany({
      take: limit,
      where: { role: { not: "ADMIN" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, fullName: true, role: true, createdAt: true },
    }),
    prisma.task.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, city: true, createdAt: true },
    }),
    prisma.review.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        createdAt: true,
        reviewed: { select: { fullName: true } },
      },
    }),
    prisma.report.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reason: true,
        createdAt: true,
        targetUser: { select: { fullName: true } },
        targetTask: { select: { title: true } },
      },
    }),
  ]);

  const events = [
    ...users.map((u) => ({
      id: `user-${u.id}`,
      type: "USER_JOINED",
      name: u.fullName,
      meta: u.role,
      createdAt: u.createdAt,
      link: `/admin/users/${u.id}`,
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      type: "TASK_CREATED",
      name: t.title,
      meta: t.city,
      createdAt: t.createdAt,
      link: `/admin/tasks/${t.id}`,
    })),
    ...reviews.map((r) => ({
      id: `review-${r.id}`,
      type: "REVIEW_POSTED",
      name: r.reviewed?.fullName || "",
      meta: `${r.rating}\u2605`,
      createdAt: r.createdAt,
      link: "/admin/reviews",
    })),
    ...reports.map((r) => ({
      id: `report-${r.id}`,
      type: "REPORT_FILED",
      name: r.targetUser?.fullName || r.targetTask?.title || "",
      meta: r.reason.length > 40 ? `${r.reason.slice(0, 40)}…` : r.reason,
      createdAt: r.createdAt,
      link: "/admin/reports",
    })),
  ]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, limit);

  return NextResponse.json({ data: events });
});
