import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr, dateRange } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      amount: (dir) => [{ amount: dir }, { createdAt: "desc" }],
      status: (dir) => [{ status: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const where = {};
  for (const key of ["userId", "status", "type"]) {
    const v = searchParams.get(key);
    if (v) where[key] = v;
  }
  const created = dateRange(searchParams.get("from"), searchParams.get("to"));
  if (created) where.createdAt = created;
  const or = searchOr(searchParams.get("q"), ["description", "transactionId", "user.fullName", "user.email"]);
  if (or) where.OR = or;

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    }),
    prisma.payment.count({ where }),
  ]);
  return listResponse(payments, total, list);
});
