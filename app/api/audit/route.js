import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      action: (dir) => [{ action: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const and = [];
  const action = searchParams.get("action");
  // scope=admin: everything done through this panel (actions are prefixed admin_).
  if (searchParams.get("scope") === "admin") and.push({ action: { startsWith: "admin_" } });
  else if (action) and.push({ action: { equals: action, mode: "insensitive" } });
  const userId = searchParams.get("userId");
  if (userId) and.push({ userId });
  const or = searchOr(searchParams.get("q"), ["action", "entityId", "details", "ipAddress", "user.fullName", "user.email"]);
  if (or) and.push({ OR: or });
  const where = and.length ? { AND: and } : {};

  const [logs, total] = await Promise.all([
    prisma.actionLog.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.actionLog.count({ where }),
  ]);
  return listResponse(logs, total, list);
});
