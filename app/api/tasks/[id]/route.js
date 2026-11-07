import { prisma } from "@/lib/prisma";
import { deleteTasksCascade } from "@/lib/cascade";
import { withAdmin, readJson, logAction, HttpError } from "@/lib/api";
import { taskData } from "@/lib/tasks";
import { NextResponse } from "next/server";

export const GET = withAdmin(async (request, { params }) => {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: { user: { select: { id: true, fullName: true, email: true } } },
  });
  if (!task) throw new HttpError(404, "Task not found");
  return NextResponse.json(task);
});

export const PUT = withAdmin(async (request, { params, admin }) => {
  const data = taskData(await readJson(request), { partial: true });
  const before = await prisma.task.findUnique({ where: { id: params.id } });
  if (!before) throw new HttpError(404, "Task not found");

  const task = await prisma.task.update({ where: { id: params.id }, data });

  const changes = {};
  for (const [k, v] of Object.entries(data)) {
    const old = before[k] instanceof Date ? before[k].toISOString() : before[k];
    const now = v instanceof Date ? v.toISOString() : v;
    if (old !== now && k !== "description") changes[k] = { from: old, to: now };
  }
  if (data.description !== undefined && data.description !== before.description) changes.description = "changed";
  if (Object.keys(changes).length) {
    await logAction(request, admin.id, "admin_update_task", { entity: "Task", entityId: params.id, details: changes });
  }
  return NextResponse.json(task);
});

export const DELETE = withAdmin(async (request, { params, admin }) => {
  const task = await prisma.task.findUnique({ where: { id: params.id }, select: { title: true, userId: true } });
  if (!task) throw new HttpError(404, "Task not found");
  await prisma.$transaction((tx) => deleteTasksCascade(tx, { id: params.id }), { timeout: 20000 });
  await logAction(request, admin.id, "admin_delete_task", { entity: "Task", entityId: params.id, details: task });
  return NextResponse.json({ success: true });
});
