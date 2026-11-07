import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { NextResponse } from "next/server";

const MAX_EXTEND_DAYS = 3650;

export const GET = withAdmin(async (request, { params }) => {
  const sub = await prisma.subscription.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!sub) throw new HttpError(404, "Subscription not found");
  return NextResponse.json(sub);
});

/**
 * PATCH: extend (add days) or cancel (set isActive: false).
 * Body: { action: "extend" | "cancel", extendDays?: number }
 */
export const PATCH = withAdmin(async (request, { params, admin }) => {
  const { action, extendDays } = await readJson(request);
  const sub = await prisma.subscription.findUnique({ where: { id: params.id } });
  if (!sub) throw new HttpError(404, "Subscription not found");

  if (action === "cancel") {
    await prisma.subscription.update({ where: { id: params.id }, data: { isActive: false } });
    await logAction(request, admin.id, "admin_cancel_subscription", {
      entity: "Subscription",
      entityId: params.id,
      details: { userId: sub.userId, plan: sub.plan },
    });
    return NextResponse.json({ success: true, message: "Subscription cancelled" });
  }

  if (action === "extend") {
    const days = parseInt(extendDays, 10);
    if (!Number.isInteger(days) || days < 1 || days > MAX_EXTEND_DAYS) {
      throw new HttpError(400, `Days must be between 1 and ${MAX_EXTEND_DAYS}`);
    }
    // Count from today for an already-expired subscription; adding days to an
    // end date months in the past left it "active" but still expired.
    const now = new Date();
    const base = sub.endDate > now ? new Date(sub.endDate) : now;
    const newEnd = new Date(base);
    newEnd.setDate(newEnd.getDate() + days);
    await prisma.subscription.update({ where: { id: params.id }, data: { endDate: newEnd, isActive: true } });
    await logAction(request, admin.id, "admin_extend_subscription", {
      entity: "Subscription",
      entityId: params.id,
      details: { userId: sub.userId, days, from: sub.endDate.toISOString(), to: newEnd.toISOString() },
    });
    return NextResponse.json({ success: true, message: `Extended by ${days} days`, endDate: newEnd.toISOString() });
  }

  throw new HttpError(400, "Invalid action. Use extend or cancel.");
});
