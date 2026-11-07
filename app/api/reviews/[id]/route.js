import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction } from "@/lib/api";
import { NextResponse } from "next/server";

export const PATCH = withAdmin(async (request, { params, admin }) => {
  const hidden = !!(await readJson(request)).hidden;
  const review = await prisma.review.update({ where: { id: params.id }, data: { hidden } });
  await logAction(request, admin.id, hidden ? "admin_hide_review" : "admin_unhide_review", {
    entity: "Review",
    entityId: params.id,
  });
  return NextResponse.json(review);
});
