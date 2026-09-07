import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const MAX_FEATURED = 3;

export async function PATCH(request, { params }) {
  try {
    const { featured } = (await request.json()) || {};
    const on = !!featured;

    const updated = await prisma.$transaction(async (tx) => {
      if (on) {
        const cur = await tx.task.findUnique({
          where: { id: params.id },
          select: { featured: true },
        });
        if (!cur) throw new Error("NOT_FOUND");
        if (!cur.featured) {
          const count = await tx.task.count({ where: { featured: true } });
          if (count >= MAX_FEATURED) throw new Error("LIMIT");
        }
      }
      return tx.task.update({
        where: { id: params.id },
        data: on
          ? { featured: true, featuredAt: new Date() }
          : { featured: false, featuredAt: null },
      });
    });

    prisma.actionLog
      .create({
        data: {
          action: on ? "admin_feature_task" : "admin_unfeature_task",
          entity: "Task",
          entityId: params.id,
        },
      })
      .catch(() => {});

    return NextResponse.json(updated);
  } catch (e) {
    if (e.message === "NOT_FOUND")
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (e.message === "LIMIT" || String(e.message).includes("Featured task limit reached"))
      return NextResponse.json(
        {
          error: `Можно закрепить не более ${MAX_FEATURED} заданий. Сначала снимите закрепление с другого.`,
        },
        { status: 409 }
      );
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
