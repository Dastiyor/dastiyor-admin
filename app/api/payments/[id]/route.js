import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (action === "refund") {
      const payment = await prisma.payment.findUnique({ where: { id } });
      if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      if (payment.status !== "COMPLETED") {
        return NextResponse.json({ error: "Only COMPLETED payments can be refunded" }, { status: 400 });
      }
      const updated = await prisma.payment.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
