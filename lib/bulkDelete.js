/**
 * Delete rows one id at a time through the existing single-row DELETE route.
 *
 * ponytail: sequential and no batch endpoint — a page of rows is at most a few
 * dozen, and per-id calls keep each refusal ("Cannot delete the last admin")
 * attributable. Add a batch route if someone starts deleting thousands.
 *
 * Returns the error messages of the rows that were refused; empty means all gone.
 */
export async function bulkDelete(basePath, ids) {
    const failed = [];
    for (const id of ids) {
        try {
            const res = await fetch(`${basePath}/${id}`, { method: "DELETE" });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                failed.push(body.error || res.statusText);
            }
        } catch (e) {
            failed.push(e.message);
        }
    }
    return failed;
}
