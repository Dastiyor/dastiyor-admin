import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

/** GET: user complaints about users or tasks. ?status=OPEN|RESOLVED|DISMISSED&q=&targetUserId=&targetTaskId= */
export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      status: (dir) => [{ status: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const where = {};
  for (const key of ["status", "targetUserId", "targetTaskId", "reporterId"]) {
    const v = searchParams.get(key);
    if (v) where[key] = v;
  }
  const or = searchOr(searchParams.get("q"), [
    "reason",
    "reporter.fullName",
    "reporter.email",
    "targetUser.fullName",
    "targetUser.email",
    "targetTask.title",
  ]);
  if (or) where.OR = or;

  const [reports, total, openCount] = await Promise.all([
    prisma.report.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: {
        reporter: { select: { id: true, fullName: true, email: true } },
        targetUser: { select: { id: true, fullName: true, email: true } },
        targetTask: { select: { id: true, title: true, status: true } },
      },
    }),
    prisma.report.count({ where }),
    prisma.report.count({ where: { status: "OPEN" } }),
  ]);
  return listResponse(reports, total, list, { openCount });
});
