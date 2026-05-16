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

export default function AdminConversations() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userIdFilter, setUserIdFilter] = useState("");
  const [userIdInput, setUserIdInput] = useState("");

  const fetchMessages = async (uid = "") => {
    setLoading(true);
    setError(null);
    try {
      const q = uid ? `&userId=${encodeURIComponent(uid)}` : "";
      const res = await fetch(`/api/conversations?limit=500${q}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setMessages(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(userIdFilter);
  }, [userIdFilter]);

  const COLUMNS = [
    {
      Header: "From",
      accessor: "sender",
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
      Header: "To",
      accessor: "receiver",
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
      Header: "Task",
      accessor: "task",
      Cell: (row) => {
        const t = row?.cell?.value;
        if (!t) return <span className="text-xs text-slate-400">—</span>;
        return (
          <div className="flex flex-col max-w-[180px]">
            <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{t.title}</span>
            <span className="text-xs text-slate-400">{t.status}</span>
          </div>
        );
      },
    },
    {
      Header: "Message",
      accessor: "content",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[260px]">
          {row?.cell?.value || "—"}
        </span>
      ),
    },
    {
      Header: "Read",
      accessor: "isRead",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-success-500 text-xs">Read</span>
        ) : (
          <span className="text-warning-500 text-xs font-medium">Unread</span>
        ),
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
  const data = useMemo(() => messages, [messages]);

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

  return (
    <div>
      <HomeBredCurbs title="Conversations" />
      <Card noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          All messages between users. Read-only moderation view.
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <input
                type="text"
                className="form-control py-2"
                placeholder="Filter by user ID..."
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setUserIdFilter(userIdInput.trim())}
              />
              <button
                className="btn btn-sm btn-dark"
                onClick={() => setUserIdFilter(userIdInput.trim())}
              >
                Filter
              </button>
              {userIdFilter && (
                <button
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => { setUserIdFilter(""); setUserIdInput(""); }}
                >
                  Clear
                </button>
              )}
            </div>
            <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          </div>
          <span className="text-xs text-slate-400">{messages.length} messages loaded</span>
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
                          No messages found.
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
              <div className="flex items-center space-x-3 rtl:space-x-reverse">
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
