export function exportCsv(filename, rows) {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  // Cells come from marketplace users. A leading = + - @ tab or CR makes a
  // spreadsheet run the cell as a formula, so prefix those with ' to keep them text.
  // Phone numbers like +992 90 123 4567 are left alone: with only digits,
  // spaces, ( ) . - there is no formula to run.
  const escape = (v) => {
    if (v == null) return "";
    let s = String(v);
    if (typeof v === "string" && /^[=+\-@\t\r]/.test(s) && !/^[+-]?[\d ().-]+$/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
