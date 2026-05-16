"use client";

import React, { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";

export default function AdminPushSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  const fetchSubs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/push-subscriptions?limit=500", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSubs(json.data || []);
      setTotal(json.pagination?.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSubs(); }, []);

  const COLUMNS = [
    {
      Header: "User",
      accessor: "user",
      Cell: (row) => {
        const u = row?.cell?.value;
        return (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{u?.fullName ?? "—"}</span>
            <span className="text-xs text-slate-500">{u?.email}</span>
            <span className="text-xs text-slate-400 capitalize">{u?.role?.toLowerCase()}</span>
          </div>
        );
      },
    },
    {
      Header: "Endpoint",
      accessor: "endpoint",
      Cell: (row) => (
        <span className="text-xs text-slate-500 font-mono line-clamp-1 max-w-[300px]" title={row?.cell?.value}>
          {row?.cell?.value?.replace("https://", "").slice(0, 60)}…
        </span>
      ),
    },
    {
      Header: "Subscribed",
      accessor: "createdAt",
      Cell: (row) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
            : "—"}
        </span>
      ),
    },
  ];

  const columns = useMemo(() => COLUMNS, []);
  const data = useMemo(() => subs, [subs]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0, pageSize: 25 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps, getTableBodyProps, headerGroups,
    page, nextPage, previousPage, canNextPage, canPreviousPage,
    pageOptions, state, gotoPage, pageCount, setPageSize, setGlobalFilter, prepareRow,
  } = tableInstance;

  const { globalFilter, pageIndex, pageSize } = state;

  return (
    <div>
      <HomeBredCurbs title="Push Subscriptions" />
      <Card noborder>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            Web push subscriptions. Total: <strong>{total}</strong>
          </p>
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
        </div>

        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error}
          </p>
        )}

        {loading ? (
          <div className="p-5 text-center text-slate-500">Loading...</div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle">
                <table
                  className="min-w-full divide-y divide-slate-100 table-fixed dark:divide-slate-700"
                  {...getTableProps()}
                >
                  <thead className="bg-slate-200 dark:bg-slate-700">
                    {headerGroups.map((hg) => {
                      const { key, ...rest } = hg.getHeaderGroupProps();
                      return (
                        <tr key={key} {...rest}>
                          {hg.headers.map((col) => {
                            const { key: ck, ...cr } = col.getHeaderProps(col.getSortByToggleProps());
                            return (
                              <th key={ck} {...cr} scope="col" className="table-th">
                                {col.render("Header")}
                                <span>{col.isSorted ? (col.isSortedDesc ? " 🔽" : " 🔼") : ""}</span>
                              </th>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </thead>
                  <tbody
                    className="bg-white divide-y divide-slate-100 dark:bg-slate-800 dark:divide-slate-700"
                    {...getTableBodyProps()}
                  >
                    {page.length === 0 ? (
                      <tr>
                        <td colSpan={COLUMNS.length} className="table-td text-center text-slate-500 py-8">
                          No push subscriptions found.
                        </td>
                      </tr>
                    ) : (
                      page.map((row) => {
                        prepareRow(row);
                        const { key, ...rest } = row.getRowProps();
                        return (
                          <tr key={key} {...rest}>
                            {row.cells.map((cell) => {
                              const { key: ck, ...cr } = cell.getCellProps();
                              return <td key={ck} {...cr} className="table-td">{cell.render("Cell")}</td>;
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="md:flex justify-between items-center mt-6">
              <div className="flex items-center space-x-3">
                <select
                  className="form-control py-2 w-max"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[25, 50, 100].map((n) => <option key={n} value={n}>Show {n}</option>)}
                </select>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  Page {pageIndex + 1} of {pageOptions.length || 1}
                </span>
              </div>
              <div className="flex items-center space-x-2 mt-4 md:mt-0">
                <button className="btn btn-sm btn-outline-dark" onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
                  <Icon icon="heroicons:chevron-double-left-solid" />
                </button>
                <button className="btn btn-sm btn-outline-dark" onClick={() => previousPage()} disabled={!canPreviousPage}>Prev</button>
                <button className="btn btn-sm btn-outline-dark" onClick={() => nextPage()} disabled={!canNextPage}>Next</button>
                <button className="btn btn-sm btn-outline-dark" onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
                  <Icon icon="heroicons:chevron-double-right-solid" />
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
