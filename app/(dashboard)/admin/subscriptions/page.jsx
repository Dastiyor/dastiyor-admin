"use client";

import React, { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import Tooltip from "@/components/ui/Tooltip";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";
import { toast } from "react-toastify";

export default function AdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterActive, setFilterActive] = useState(""); // "" | "true" | "false"
  const [extendModal, setExtendModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [refundBusy, setRefundBusy] = useState(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = filterActive ? `&active=${filterActive}` : "";
      const res = await fetch(`/api/subscriptions?limit=500${q}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setSubscriptions(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [filterActive]);

  const fetchPayments = async () => {
    setPaymentsLoading(true);
    try {
      const qs = new URLSearchParams({ limit: "200" });
      if (paymentStatus) qs.set("status", paymentStatus);
      if (paymentDateFrom) qs.set("from", paymentDateFrom);
      if (paymentDateTo) qs.set("to", paymentDateTo);
      const res = await fetch(`/api/payments?${qs.toString()}`, { credentials: "include" });
      if (res.ok) {
        const json = await res.json();
        setPayments(json.data || []);
      }
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [paymentStatus, paymentDateFrom, paymentDateTo]);

  const handleRefund = async (paymentId) => {
    if (!confirm("Mark this payment as refunded? This will update the status to CANCELLED.")) return;
    setRefundBusy(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "refund" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success("Payment refunded");
      fetchPayments();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setRefundBusy(null);
    }
  };

  const handleExtend = (sub) => {
    setSelectedSub(sub);
    setExtendDays(30);
    setExtendModal(true);
  };

  const submitExtend = async () => {
    if (!selectedSub) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/subscriptions/${selectedSub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "extend", extendDays: extendDays }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success(data.message || "Subscription extended");
      setExtendModal(false);
      setSelectedSub(null);
      fetchSubscriptions();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (sub) => {
    if (!confirm(`Cancel subscription for ${sub.user?.fullName}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success("Subscription cancelled");
      fetchSubscriptions();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const COLUMNS = [
    {
      Header: "User",
      accessor: "user",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {row?.cell?.value?.fullName ?? "—"}
          </span>
          <span className="text-xs text-slate-500">{row?.cell?.value?.email}</span>
        </div>
      ),
    },
    {
      Header: "Plan",
      accessor: "plan",
      Cell: (row) => (
        <span className="badge bg-primary-500/10 text-primary-500 capitalize">
          {row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: "Start",
      accessor: "startDate",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleDateString(undefined, { dateStyle: "medium" })
            : "—"}
        </span>
      ),
    },
    {
      Header: "End",
      accessor: "endDate",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleDateString(undefined, { dateStyle: "medium" })
            : "—"}
        </span>
      ),
    },
    {
      Header: "Status",
      accessor: "isActive",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-success-500 text-sm">Active</span>
        ) : (
          <span className="text-slate-500 text-sm">Inactive</span>
        ),
    },
    {
      Header: "Actions",
      accessor: "id",
      Cell: (row) => {
        const sub = row?.row?.original;
        return (
          <div className="flex space-x-2 rtl:space-x-reverse">
            {sub?.isActive && (
              <>
                <Tooltip content="Extend" placement="top">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleExtend(sub)}
                    disabled={busy}
                  >
                    <Icon icon="heroicons-outline:calendar-days" />
                  </button>
                </Tooltip>
                <Tooltip content="Cancel" placement="top" theme="danger">
                  <button
                    type="button"
                    className="action-btn text-danger-500"
                    onClick={() => handleCancel(sub)}
                    disabled={busy}
                  >
                    <Icon icon="heroicons-outline:no-symbol" />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        );
      },
    },
  ];

  const columns = useMemo(() => COLUMNS, []);
  const data = useMemo(() => subscriptions, [subscriptions]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
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
      <HomeBredCurbs title="Subscriptions & payments" />
      <Card title="Subscriptions" noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          Manage Basic, Standard, Premium plans. Extend or cancel active subscriptions.
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <select
              className="form-control py-2 w-max"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Active only</option>
              <option value="false">Inactive only</option>
            </select>
            <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          </div>
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
                            const { key: cKey, ...cRest } = column.getHeaderProps(
                              column.getSortByToggleProps()
                            );
                            return (
                              <th key={cKey} {...cRest} scope="col" className="table-th">
                                {column.render("Header")}
                                <span>
                                  {column.isSorted
                                    ? column.isSortedDesc
                                      ? " 🔽"
                                      : " 🔼"
                                    : ""}
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
                        <td
                          colSpan={COLUMNS.length}
                          className="table-td text-center text-slate-500 py-8"
                        >
                          No subscriptions found.
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
                    {[10, 25, 50].map((n) => (
                      <option key={n} value={n}>
                        Show {n}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    Page {pageIndex + 1} of {pageOptions.length || 1}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-4 md:mt-0">
                  <button
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => gotoPage(0)}
                    disabled={!canPreviousPage}
                  >
                    <Icon icon="heroicons:chevron-double-left-solid" />
                  </button>
                  <button
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                  >
                    Prev
                  </button>
                  <button
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                  >
                    Next
                  </button>
                  <button
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => gotoPage(pageCount - 1)}
                    disabled={!canNextPage}
                  >
                    <Icon icon="heroicons:chevron-double-right-solid" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Card title="Payments" className="mt-5">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-2">
          <Icon icon="heroicons-outline:information-circle" className="text-lg" />
          Payment history (SmartPay). Amounts in TJS (Tajik Somoni).
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            className="form-control py-2 w-max"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
          <input type="date" className="form-control py-2" value={paymentDateFrom} onChange={(e) => setPaymentDateFrom(e.target.value)} title="From" />
          <span className="text-slate-400 text-sm">–</span>
          <input type="date" className="form-control py-2" value={paymentDateTo} onChange={(e) => setPaymentDateTo(e.target.value)} title="To" />
          {(paymentDateFrom || paymentDateTo || paymentStatus) && (
            <button className="btn btn-sm btn-outline-dark" onClick={() => { setPaymentStatus(""); setPaymentDateFrom(""); setPaymentDateTo(""); }}>
              Clear
            </button>
          )}
        </div>
        {paymentsLoading ? (
          <div className="p-4 text-center text-slate-500">Loading payments...</div>
        ) : payments.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-200 dark:bg-slate-700">
                <tr>
                  <th className="table-th text-left">User</th>
                  <th className="table-th text-left">Amount</th>
                  <th className="table-th text-left">Type / Plan</th>
                  <th className="table-th text-left">Method</th>
                  <th className="table-th text-left">Status</th>
                  <th className="table-th text-left">Date</th>
                  <th className="table-th text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="table-td">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{p.user?.fullName ?? "—"}</span>
                        <span className="text-xs text-slate-500">{p.user?.email}</span>
                      </div>
                    </td>
                    <td className="table-td text-sm text-slate-600 dark:text-slate-300">
                      {p.amount} {p.currency ?? "TJS"}
                    </td>
                    <td className="table-td text-sm text-slate-600 dark:text-slate-300 capitalize">
                      {p.type ?? "—"}
                      {p.plan && <span className="text-xs text-slate-400 ml-1">({p.plan})</span>}
                    </td>
                    <td className="table-td text-sm text-slate-600 dark:text-slate-300 capitalize">
                      {p.paymentMethod ?? "—"}
                    </td>
                    <td className="table-td">
                      <span className={`text-sm ${
                        p.status === "COMPLETED" ? "text-success-500" :
                        p.status === "FAILED" ? "text-danger-500" :
                        p.status === "CANCELLED" ? "text-warning-500" :
                        "text-slate-500"
                      }`}>{p.status}</span>
                    </td>
                    <td className="table-td text-sm text-slate-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="table-td">
                      {p.status === "COMPLETED" && (
                        <Tooltip content="Refund" placement="top" theme="danger">
                          <button
                            type="button"
                            className="action-btn text-danger-500"
                            onClick={() => handleRefund(p.id)}
                            disabled={refundBusy === p.id}
                          >
                            <Icon icon="heroicons-outline:arrow-uturn-left" />
                          </button>
                        </Tooltip>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        activeModal={extendModal}
        onClose={() => !busy && setExtendModal(false)}
        title="Extend subscription"
        footerContent={
          <>
            <Button text="Cancel" className="btn-outline-dark" onClick={() => setExtendModal(false)} />
            <Button
              text="Extend"
              className="btn-dark"
              onClick={submitExtend}
              disabled={busy}
            />
          </>
        }
      >
        {selectedSub && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Extend subscription for <strong>{selectedSub.user?.fullName}</strong> (plan:{" "}
              {selectedSub.plan}) by:
            </p>
            <Textinput
              label="Days"
              type="number"
              min={1}
              value={extendDays}
              onChange={(e) => setExtendDays(parseInt(e.target.value, 10) || 30)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
