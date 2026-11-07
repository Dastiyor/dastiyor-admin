import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { MAX_FEATURED } from "@/lib/tasks";
import { NextResponse } from "next/server";

export const PATCH = withAdmin(async (request, { params, admin }) => {
  const on = !!(await readJson(request)).featured;

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const cur = await tx.task.findUnique({ where: { id: params.id }, select: { featured: true } });
      if (!cur) throw new HttpError(404, "Task not found");
      if (on && !cur.featured) {
        const count = await tx.task.count({ where: { featured: true } });
        if (count >= MAX_FEATURED) throw new HttpError(409, "FEATURE_LIMIT");
      }
      return tx.task.update({
        where: { id: params.id },
        data: on ? { featured: true, featuredAt: new Date() } : { featured: false, featuredAt: null },
      });
    });
  } catch (e) {
    // Also match the limit error the database itself raises for the same cap.
    if (e.message === "FEATURE_LIMIT" || String(e.message).includes("Featured task limit reached")) {
      throw new HttpError(
        409,
        `Можно закрепить не более ${MAX_FEATURED} заданий. Сначала снимите закрепление с другого.`
      );
    }
    throw e;
  }

  await logAction(request, admin.id, on ? "admin_feature_task" : "admin_unfeature_task", {
    entity: "Task",
    entityId: params.id,
  });
  return NextResponse.json(updated);
});
