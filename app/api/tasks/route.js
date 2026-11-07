import { prisma } from "@/lib/prisma";
import { withAdmin, readJson, logAction } from "@/lib/api";
import { listParams, listResponse, searchOr, dateRange } from "@/lib/listQuery";
import { taskData } from "@/lib/tasks";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Legacy ?sort= values, still accepted alongside ?orderBy=&dir=.
const LEGACY_SORT = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  "budget-high": [{ budgetAmountNum: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
  "budget-low": [{ budgetAmountNum: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
};

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      title: (dir) => ({ title: dir }),
      category: (dir) => [{ category: dir }, { createdAt: "desc" }],
      budgetAmountNum: (dir) => [{ budgetAmountNum: { sort: dir, nulls: "last" } }, { createdAt: "desc" }],
      urgency: (dir) => [{ urgency: dir }, { createdAt: "desc" }],
      status: (dir) => [{ status: dir }, { createdAt: "desc" }],
      featured: (dir) => [{ featured: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: LEGACY_SORT[searchParams.get("sort")] || LEGACY_SORT.newest,
  });

  const where = {};
  for (const key of ["status", "category", "urgency", "userId"]) {
    const v = searchParams.get(key);
    if (v) where[key] = v;
  }
  if (searchParams.get("featured") === "true") where.featured = true;
  const created = dateRange(searchParams.get("from"), searchParams.get("to"));
  if (created) where.createdAt = created;
  const or = searchOr(searchParams.get("q"), ["title", "description", "city", "user.fullName", "user.email"]);
  if (or) where.OR = or;

  const [tasks, total, featuredCount] = await Promise.all([
    prisma.task.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        _count: { select: { responses: true } },
      },
    }),
    prisma.task.count({ where }),
    // Site-wide, not just this page: the cap applies to all tasks.
    prisma.task.count({ where: { featured: true } }),
  ]);
  return listResponse(tasks, total, list, { featuredCount });
});

export const POST = withAdmin(async (request, { admin }) => {
  const data = taskData(await readJson(request));
  data.status ||= "OPEN";
  data.urgency ||= "normal";
  const task = await prisma.task.create({ data });
  await logAction(request, admin.id, "admin_create_task", {
    entity: "Task",
    entityId: task.id,
    details: { title: task.title, userId: task.userId },
  });
  return NextResponse.json(task, { status: 201 });
});
