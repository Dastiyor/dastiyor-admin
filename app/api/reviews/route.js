import { prisma } from "@/lib/prisma";
import { withAdmin } from "@/lib/api";
import { listParams, listResponse, searchOr } from "@/lib/listQuery";

export const dynamic = "force-dynamic";

export const GET = withAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const list = listParams(searchParams, {
    sortable: {
      rating: (dir) => [{ rating: dir }, { createdAt: "desc" }],
      hidden: (dir) => [{ hidden: dir }, { createdAt: "desc" }],
      createdAt: (dir) => ({ createdAt: dir }),
    },
    defaultSort: { createdAt: "desc" },
  });

  const where = {};
  // ?hidden=true|false filters; without it, hidden reviews show only with includeHidden=true.
  const hidden = searchParams.get("hidden");
  if (hidden === "true") where.hidden = true;
  else if (hidden === "false" || searchParams.get("includeHidden") !== "true") where.hidden = false;
  const maxRating = parseInt(searchParams.get("maxRating") || "", 10);
  if (maxRating >= 1 && maxRating <= 5) where.rating = { lte: maxRating };
  const or = searchOr(searchParams.get("q"), [
    "comment",
    "reviewer.fullName",
    "reviewer.email",
    "reviewed.fullName",
    "reviewed.email",
    "task.title",
  ]);
  if (or) where.OR = or;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      skip: list.skip,
      take: list.limit,
      orderBy: list.orderBy,
      include: {
        reviewer: { select: { id: true, fullName: true, email: true } },
        reviewed: { select: { id: true, fullName: true, email: true } },
        task: { select: { id: true, title: true } },
      },
    }),
    prisma.review.count({ where }),
  ]);
  return listResponse(reviews, total, list);
});
