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

export default function AdminProviders() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchProviders() {
      try {
        const res = await fetch("/api/providers?limit=500", { credentials: "include" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        if (!cancelled) setProviders(json.data || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchProviders();
    return () => { cancelled = true; };
  }, []);

  const COLUMNS = [
    {
      Header: "Provider",
      accessor: "fullName",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900 dark:text-white">{row?.cell?.value ?? "—"}</span>
          <span className="text-xs text-slate-500">{row?.row?.original?.email}</span>
        </div>
      ),
    },
    {
      Header: "Verified",
      accessor: "isVerified",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="badge bg-success-500/10 text-success-500">Yes</span>
        ) : (
          <span className="badge bg-slate-500/10 text-slate-500">No</span>
        ),
    },
    {
      Header: "Avg Rating",
      accessor: "avgRating",
      Cell: (row) => {
        const r = row?.cell?.value;
        if (r == null) return <span className="text-slate-400 text-sm">—</span>;
        const stars = "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
        return (
          <span className="text-sm text-warning-500 font-medium">
            {r} <span className="text-xs">{stars}</span>
          </span>
        );
      },
    },
    {
      Header: "Reviews",
      accessor: "reviewCount",
      Cell: (row) => <span className="text-sm text-slate-600 dark:text-slate-300">{row?.cell?.value ?? 0}</span>,
    },
    {
      Header: "Responses",
      accessor: "responseCount",
      Cell: (row) => <span className="text-sm text-slate-600 dark:text-slate-300">{row?.cell?.value ?? 0}</span>,
    },
    {
      Header: "Plan",
      accessor: "subscription",
      Cell: (row) => {
        const sub = row?.cell?.value;
        if (!sub) return <span className="text-slate-400 text-sm">Free</span>;
        const cls = sub.isActive ? "bg-success-500/10 text-success-500" : "bg-slate-500/10 text-slate-500";
        return (
          <span className={`badge ${cls} capitalize`}>
            {sub.plan} {!sub.isActive && "(expired)"}
          </span>
        );
      },
    },
    {
      Header: "Balance",
      accessor: "balance",
      Cell: (row) => {
        const b = row?.cell?.value;
        return (
          <span className={`text-sm font-medium ${b > 0 ? "text-success-500" : "text-slate-500"}`}>
            {b != null ? `${b.toLocaleString()} TJS` : "—"}
          </span>
        );
      },
    },
    {
      Header: "Joined",
      accessor: "createdAt",
      Cell: (row) => (
        <span className="text-sm text-slate-500">
          {row?.cell?.value ? new Date(row.cell.value).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

  const columns = useMemo(() => COLUMNS, []);
  const data = useMemo(() => providers, [providers]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0, pageSize: 20 } },
    useGlobalFilter,
    useSortBy,
    usePagination
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    nextPage,
    previousPage,
    canNextPage,
    canPreviousPage,
    pageOptions,
    state,
    gotoPage,
    pageCount,
    setPageSize,
    setGlobalFilter,
    prepareRow,
  } = tableInstance;

  const { globalFilter, pageIndex, pageSize } = state;

  return (
    <div>
      <HomeBredCurbs title="Providers" />
      <Card noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Provider performance: ratings, response count, subscription plan, and balance.
        </p>
        <div className="md:flex justify-between items-center mb-6">
          <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">
            Total providers: {providers.length}
          </span>
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
                    {headerGroups.map((headerGroup) => {
                      const { key, ...rest } = headerGroup.getHeaderGroupProps();
                      return (
                        <tr key={key} {...rest}>
                          {headerGroup.headers.map((column) => {
                            const { key: cKey, ...cRest } = column.getHeaderProps(column.getSortByToggleProps());
                            return (
                              <th key={cKey} {...cRest} scope="col" className="table-th">
                                {column.render("Header")}
                                <span>{column.isSorted ? (column.isSortedDesc ? " 🔽" : " 🔼") : ""}</span>
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
                          No providers found.
                        </td>
                      </tr>
                    ) : (
                      page.map((row) => {
                        prepareRow(row);
                        const { key, ...rest } = row.getRowProps();
                        return (
                          <tr key={key} {...rest}>
                            {row.cells.map((cell) => {
                              const { key: cellKey, ...cellRest } = cell.getCellProps();
                              return (
                                <td key={cellKey} {...cellRest} className="table-td">
                                  {cell.render("Cell")}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            {page.length > 0 && (
              <div className="md:flex justify-between items-center mt-6">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <select
                    className="form-control py-2 w-max"
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                  >
                    {[20, 50, 100].map((n) => (
                      <option key={n} value={n}>Show {n}</option>
                    ))}
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
            )}
          </>
        )}
      </Card>
    </div>
  );
}
