import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      plan: (dir) => [{ plan: dir }, { endDate: "desc" }],
      startDate: (dir) => ({ startDate: dir }),
      endDate: (dir) => ({ endDate: dir }),
      isActive: (dir) => [{ isActive: dir }, { endDate: "desc" }],
    },
    defaultSort: { endDate: "desc" },
  });

  const where = {};
  const active = searchParams.get("active");
  if (active === "true") where.isActive = true;
  if (active === "false") where.isActive = false;
  const or = searchOr(searchParams.get("q"), ["plan", "user.fullName", "user.email"]);
  if (or) where.OR = or;

  const [subscriptions, total] = await Promise.all([
    prisma.subscription.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.subscription.count({ where }),
  ]);
  return listResponse(subscriptions, total, list);
});
