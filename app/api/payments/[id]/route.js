import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { NextResponse } from "next/server";

export const PATCH = withAdmin(async (request, { params, admin }) => {
  const { action } = await readJson(request);
  if (action !== "refund") throw new HttpError(400, "Unknown action");

  const payment = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!payment) throw new HttpError(404, "Payment not found");
  if (payment.status !== "COMPLETED") throw new HttpError(400, "Only COMPLETED payments can be refunded");

  const updated = await prisma.payment.update({ where: { id: params.id }, data: { status: "CANCELLED" } });
  await logAction(request, admin.id, "admin_refund_payment", {
    entity: "Payment",
    entityId: params.id,
    details: { userId: payment.userId, amount: payment.amount, currency: payment.currency },
  });
  return NextResponse.json(updated);
});
