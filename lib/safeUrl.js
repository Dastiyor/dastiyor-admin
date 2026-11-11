// Links in the admin UI come from marketplace users. Only allow http(s), so a
// stored "javascript:" or "data:" URL can never become a clickable link.
export function isHttpUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
