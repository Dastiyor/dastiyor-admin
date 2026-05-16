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

export default function AdminAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = actionFilter ? `&action=${encodeURIComponent(actionFilter)}` : "";
      const res = await fetch(`/api/audit?limit=500${q}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setLogs(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  const COLUMNS = [
    {
      Header: "Action",
      accessor: "action",
      Cell: (row) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
          {row?.cell?.value}
        </span>
      ),
    },
    {
      Header: "User",
      accessor: "user",
      Cell: (row) => {
        const user = row?.cell?.value;
        return user ? (
          <div className="flex flex-col">
            <span className="text-sm text-slate-700 dark:text-slate-300">{user.fullName}</span>
            <span className="text-xs text-slate-500">{user.email}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Anonymous</span>
        );
      },
    },
    {
      Header: "Entity",
      accessor: "entity",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-600 dark:text-slate-300">{row?.cell?.value ?? "—"}</span>
          <span className="text-xs text-slate-400 font-mono">{row?.row?.original?.entityId ?? ""}</span>
        </div>
      ),
    },
    {
      Header: "IP",
      accessor: "ipAddress",
      Cell: (row) => (
        <span className="text-xs text-slate-500 font-mono">{row?.cell?.value ?? "—"}</span>
      ),
    },
    {
      Header: "Details",
      accessor: "details",
      Cell: (row) => {
        const raw = row?.cell?.value;
        if (!raw) return <span className="text-slate-400 text-xs">—</span>;
        try {
          const parsed = JSON.parse(raw);
          return (
            <span className="text-xs text-slate-500 font-mono line-clamp-2 max-w-[200px]">
              {JSON.stringify(parsed)}
            </span>
          );
        } catch {
          return <span className="text-xs text-slate-500 line-clamp-2 max-w-[200px]">{raw}</span>;
        }
      },
    },
    {
      Header: "Time",
      accessor: "createdAt",
      Cell: (row) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })
            : "—"}
        </span>
      ),
    },
  ];

  const columns = useMemo(() => COLUMNS, []);
  const data = useMemo(() => logs, [logs]);

  const tableInstance = useTable(
    { columns, data, initialState: { pageIndex: 0, pageSize: 25 } },
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

  const COMMON_ACTIONS = [
    "LOGIN", "REGISTER", "CREATE_TASK", "UPDATE_TASK", "DELETE_TASK",
    "ACCEPT_RESPONSE", "REJECT_RESPONSE", "CREATE_RESPONSE",
    "SUBSCRIBE", "CANCEL_SUBSCRIPTION",
  ];

  return (
    <div>
      <HomeBredCurbs title="Audit Log" />
      <Card noborder>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <select
              className="form-control py-2 w-max"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All actions</option>
              {COMMON_ACTIONS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          </div>
          <span className="text-xs text-slate-400">{logs.length} entries loaded</span>
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
                                <span>
                                  {column.isSorted ? (column.isSortedDesc ? " 🔽" : " 🔼") : ""}
                                </span>
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
                          No audit log entries found.
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
            <div className="md:flex justify-between items-center mt-6">
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
                <select
                  className="form-control py-2 w-max"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[25, 50, 100].map((n) => (
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
          </>
        )}
      </Card>
    </div>
  );
}
