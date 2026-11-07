/** Query string for a list endpoint; empty filter values are left out. */
export function listQuery(params = {}, { page, limit, sortBy } = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === "" || v === null || v === undefined || v === false) continue;
    qs.set(k, String(v));
  }
  if (page) qs.set("page", String(page));
  if (limit) qs.set("limit", String(limit));
  const sort = sortBy?.[0];
  if (sort) {
    qs.set("orderBy", sort.id);
    qs.set("dir", sort.desc ? "desc" : "asc");
  }
  return qs.toString();
}

const EXPORT_PAGE = 100;
const EXPORT_MAX = 10000;

/** Every row matching the filters (for CSV export), fetched a page at a time. */
export async function fetchAllRows(endpoint, params = {}, sortBy) {
  const rows = [];
  for (let page = 1; rows.length < EXPORT_MAX; page++) {
    const res = await fetch(`${endpoint}?${listQuery(params, { page, limit: EXPORT_PAGE, sortBy })}`, {
      credentials: "include",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || res.statusText);
    rows.push(...(json.data || []));
    if (page >= (json.pagination?.totalPages || 0)) break;
  }
  return rows;
}
