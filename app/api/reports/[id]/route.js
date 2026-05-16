import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const { status } = body;
    if (!["OPEN", "RESOLVED", "DISMISSED"].includes(status)) {
      return NextResponse.json(
        { error: "status must be OPEN, RESOLVED, or DISMISSED" },
        { status: 400 }
      );
    }
    const report = await prisma.report.update({
      where: { id: params.id },
      data: { status },
    });
    prisma.actionLog.create({
      data: { action: `admin_report_${status.toLowerCase()}`, entity: "Report", entityId: params.id },
    }).catch(() => {});
    return NextResponse.json(report);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
