"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTable, useSortBy, usePagination, useRowSelect } from "react-table";
import RowSelectCheckbox from "@/components/partials/table/RowSelectCheckbox";
import { listQuery } from "@/lib/listClient";

function selectionColumn(hooks) {
  hooks.visibleColumns.push((columns) => [
    {
      id: "selection",
      disableSortBy: true,
      Header: ({ getToggleAllPageRowsSelectedProps }) => (
        <RowSelectCheckbox {...getToggleAllPageRowsSelectedProps()} />
      ),
      Cell: ({ row }) => <RowSelectCheckbox {...row.getToggleRowSelectedProps()} />,
    },
    ...columns,
  ]);
}

/**
 * A react-table instance whose rows come from a paged list endpoint
 * (see lib/listQuery.js). Paging, sorting, search and filters all run on the
 * server, so the table covers every row rather than the first page of results.
 *
 * - `params`: filters sent with every request; changing them returns to page 1.
 * - `sortable`: column ids the endpoint accepts as ?orderBy=; other columns
 *   are not clickable.
 * - `selectable` must not change between renders (it adds hooks).
 */
export default function useServerTable({
  endpoint,
  params = {},
  columns,
  sortable = [],
  defaultSort,
  pageSize = 25,
  selectable = false,
}) {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [meta, setMeta] = useState({});
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const sortableKey = sortable.join(",");
  const cols = useMemo(
    () => columns.map((c) => ({ ...c, disableSortBy: !sortable.includes(c.id || c.accessor) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, sortableKey]
  );

  const plugins = [useSortBy, usePagination];
  if (selectable) plugins.push(useRowSelect, selectionColumn);

  const [pageCount, setPageCount] = useState(1);
  const table = useTable(
    {
      columns: cols,
      data,
      manualPagination: true,
      manualSortBy: true,
      disableMultiSort: true,
      autoResetPage: false,
      autoResetSortBy: false,
      pageCount,
      getRowId: (row, i) => row.id ?? String(i),
      initialState: { pageIndex: 0, pageSize, sortBy: defaultSort ? [defaultSort] : [] },
    },
    ...plugins
  );

  const { pageIndex, pageSize: size, sortBy } = table.state;
  const paramsKey = JSON.stringify(params);
  const sortKey = JSON.stringify(sortBy);
  const lastParams = useRef(paramsKey);
  const lastSort = useRef(sortKey);

  useEffect(() => {
    // New filters or sort: start again from page 1.
    const filtersChanged = lastParams.current !== paramsKey || lastSort.current !== sortKey;
    lastParams.current = paramsKey;
    lastSort.current = sortKey;
    if (filtersChanged && pageIndex !== 0) {
      table.gotoPage(0);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`${endpoint}?${listQuery(params, { page: pageIndex + 1, limit: size, sortBy })}`, {
      credentials: "include",
      signal: ctrl.signal,
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || res.statusText);
        const { data: rows, pagination, ...rest } = json;
        setData(rows || []);
        setTotal(pagination?.total ?? 0);
        setPageCount(Math.max(1, pagination?.totalPages ?? 1));
        setMeta(rest);
        // Deleting the last rows of the last page leaves us past the end.
        if (pageIndex > 0 && pageIndex >= (pagination?.totalPages ?? 0)) {
          table.gotoPage(Math.max(0, (pagination?.totalPages ?? 1) - 1));
        }
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          setLoading(false);
          setLoaded(true);
        }
      });
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, paramsKey, sortKey, pageIndex, size, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { table, data, setData, total, meta, loading, loaded, error, reload, sortBy };
}
