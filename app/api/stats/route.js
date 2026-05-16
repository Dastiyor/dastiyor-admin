import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function monthLabel(d) {
  return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

export async function GET() {
  try {
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - 11);
    start.setHours(0, 0, 0, 0);

    // Build last-12-month buckets (oldest -> newest)
    const buckets = [];
    const bucketMap = new Map();
    for (let i = 0; i < 12; i++) {
      const m = new Date(start);
      m.setMonth(start.getMonth() + i);
      const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({ key, label: monthLabel(m), count: 0 });
      bucketMap.set(key, i);
    }

    const [
      usersCount,
      tasksCount,
      tasksOpen,
      tasksCompleted,
      reviewsCount,
      subscriptionsActive,
      lockedUsersCount,
      tasksCreatedAt,
      recentTasks,
      recentUsers,
      revenueData,
      paymentCounts,
    ] = await Promise.all([
      prisma.user.count({ where: { role: { not: "ADMIN" } } }),
      prisma.task.count(),
      prisma.task.count({ where: { status: "OPEN" } }),
      prisma.task.count({ where: { status: "COMPLETED" } }),
      prisma.review.count(),
      prisma.subscription.count({ where: { isActive: true } }),
      prisma.user.count({ where: { lockedUntil: { gt: now } } }),
      prisma.task.findMany({
        where: { createdAt: { gte: start } },
        select: { createdAt: true },
      }),
      prisma.task.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { fullName: true, email: true, avatar: true },
          },
        },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.payment.aggregate({
        where: { status: "COMPLETED" },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
    ]);

    for (const t of tasksCreatedAt) {
      const d = new Date(t.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const idx = bucketMap.get(key);
      if (idx !== undefined) buckets[idx].count += 1;
    }

    const totalPayments = paymentCounts.reduce((s, p) => s + p._count.id, 0);
    const completedPayments = paymentCounts.find((p) => p.status === "COMPLETED")?._count.id || 0;

    return NextResponse.json({
      users: usersCount,
      tasks: tasksCount,
      tasksOpen,
      tasksCompleted,
      reviews: reviewsCount,
      subscriptionsActive,
      lockedUsers: lockedUsersCount,
      totalRevenue: revenueData._sum.amount || 0,
      completedPayments,
      paymentSuccessRate: totalPayments > 0 ? Math.round((completedPayments / totalPayments) * 100) : 0,
      taskActivity: {
        labels: buckets.map((b) => b.label),
        data: buckets.map((b) => b.count),
      },
      recentTasks,
      recentUsers,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
