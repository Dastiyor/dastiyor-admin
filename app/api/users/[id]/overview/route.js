import { prisma } from "@/lib/prisma";
import { withAdmin, HttpError } from "@/lib/api";
import { USER_LIST_SELECT } from "@/lib/users";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RECENT = 10;
const person = { select: { id: true, fullName: true, email: true } };

/** Everything the user detail page shows, in one request. */
export const GET = withAdmin(async (request, { params }) => {
  const id = params.id;
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      ...USER_LIST_SELECT,
      avatar: true,
      bio: true,
      skills: true,
      city: true,
      experienceYears: true,
      phoneVerified: true,
      updatedAt: true,
      subscription: true,
      _count: {
        select: {
          tasks: true,
          assignedTasks: true,
          responses: true,
          reviewsReceived: true,
          reviewsGiven: true,
          reportsAgainst: true,
          reportsMade: true,
          payments: true,
        },
      },
    },
  });
  if (!user) throw new HttpError(404, "User not found");

  const [tasks, assignedTasks, responses, reviews, reports, payments, rating] = await Promise.all([
    prisma.task.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT,
      select: { id: true, title: true, status: true, category: true, city: true, createdAt: true, _count: { select: { responses: true } } },
    }),
    prisma.task.findMany({
      where: { assignedUserId: id },
      orderBy: { updatedAt: "desc" },
      take: RECENT,
      select: { id: true, title: true, status: true, category: true, city: true, createdAt: true },
    }),
    prisma.response.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT,
      select: { id: true, price: true, status: true, createdAt: true, task: { select: { id: true, title: true } } },
    }),
    prisma.review.findMany({
      where: { reviewedId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT,
      select: { id: true, rating: true, comment: true, hidden: true, createdAt: true, reviewer: person, task: { select: { id: true, title: true } } },
    }),
    prisma.report.findMany({
      where: { targetUserId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT,
      select: { id: true, reason: true, status: true, createdAt: true, reporter: person },
    }),
    prisma.payment.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT,
      select: { id: true, amount: true, currency: true, status: true, type: true, plan: true, createdAt: true },
    }),
    prisma.review.aggregate({ where: { reviewedId: id, hidden: false }, _avg: { rating: true } }),
  ]);

  return NextResponse.json({
    user,
    averageRating: rating._avg.rating,
    tasks,
    assignedTasks,
    responses,
    reviews,
    reports,
    payments,
  });
});
