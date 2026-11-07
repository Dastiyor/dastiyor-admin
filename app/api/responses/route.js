import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      priceNum: (dir) => [{ priceNum: { sort: dir, nulls: "last" } }, { createdAt: "desc" }],
      status: (dir) => [{ status: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const where = {};
  for (const key of ["taskId", "userId", "status"]) {
    const v = searchParams.get(key);
    if (v) where[key] = v;
  }
  const or = searchOr(searchParams.get("q"), ["message", "task.title", "user.fullName", "user.email"]);
  if (or) where.OR = or;

  const [responses, total] = await Promise.all([
    prisma.response.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: {
        task: { select: { id: true, title: true, status: true } },
        user: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.response.count({ where }),
  ]);
  return listResponse(responses, total, list);
});
