import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { NextResponse } from "next/server";

const STATUSES = ["OPEN", "RESOLVED", "DISMISSED"];

/** PATCH: { status } — resolve, dismiss or reopen a complaint. */
export const PATCH = withAdmin(async (request, { params, admin }) => {
  const { status } = await readJson(request);
  if (!STATUSES.includes(status)) throw new HttpError(400, "Invalid status");
  const existing = await prisma.report.findUnique({ where: { id: params.id }, select: { status: true } });
  if (!existing) throw new HttpError(404, "Complaint not found");

  const report = await prisma.report.update({ where: { id: params.id }, data: { status } });
  await logAction(request, admin.id, "admin_update_report", {
    entity: "Report",
    entityId: params.id,
    details: { status: { from: existing.status, to: status } },
  });
  return NextResponse.json(report);
});
