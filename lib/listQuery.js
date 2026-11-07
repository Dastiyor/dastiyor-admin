import { NextResponse } from "next/server";

/**
 * Shared paging and sorting for list endpoints.
 *
 * Query: ?page=1&limit=25&orderBy=<key>&dir=asc|desc
 * `sortable` maps an allowed orderBy key to a function (dir) => Prisma orderBy,
 * so unknown keys can never reach the query.
 */
export function listParams(searchParams, { sortable = {}, defaultSort, defaultLimit = 25, maxLimit = 100 } = {}) {
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit), 10) || defaultLimit));
  const key = searchParams.get("orderBy");
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  const orderBy = key && sortable[key] ? sortable[key](dir) : defaultSort;
  return { page, limit, skip: (page - 1) * limit, orderBy };
}

export function listResponse(data, total, { page, limit }, extra = {}) {
  return NextResponse.json({
    data,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    ...extra,
  });
}

/** Case-insensitive "contains" over several fields; returns undefined for an empty query. */
export function searchOr(q, paths) {
  const term = q?.trim();
  if (!term) return undefined;
  return paths.map((path) => {
    // "user.fullName" -> { user: { fullName: { contains } } }
    const parts = path.split(".");
    let clause = { contains: term, mode: "insensitive" };
    for (let i = parts.length - 1; i >= 0; i--) clause = { [parts[i]]: clause };
    return clause;
  });
}

/** Parse a YYYY-MM-DD date range into a Prisma filter, ignoring invalid dates. */
export function dateRange(from, to) {
  const range = {};
  if (from && !Number.isNaN(Date.parse(from))) range.gte = new Date(from);
  if (to && !Number.isNaN(Date.parse(to))) range.lte = new Date(to + "T23:59:59.999Z");
  return Object.keys(range).length ? range : undefined;
}
