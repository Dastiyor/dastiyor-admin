import { HttpError } from "./api";

export function normalizeSlug(slug) {
  const s = String(slug || "").trim().toLowerCase().replace(/\s+/g, "-");
  if (!s) throw new HttpError(400, "Slug is required");
  return s;
}

/** Accepts an array or a comma-separated string; stored as a JSON array string. */
export function normalizeSubcategories(sub) {
  if (sub == null || sub === "") return null;
  const list = Array.isArray(sub) ? sub : String(sub).split(",");
  const clean = list.map((s) => String(s).trim()).filter(Boolean);
  return clean.length ? JSON.stringify(clean) : null;
}
