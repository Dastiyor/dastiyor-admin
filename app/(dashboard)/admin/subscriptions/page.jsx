"use client";

import React, { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import DataTable from "@/components/partials/table/DataTable";
import TablePagination from "@/components/partials/table/TablePagination";
import useServerTable from "@/hooks/useServerTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import Tooltip from "@/components/ui/Tooltip";
import { exportCsv } from "@/lib/exportCsv";
import { fetchAllRows } from "@/lib/listClient";
import { toast } from "react-toastify";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/context/LanguageContext";
import { UserLink, TaskLink } from "@/components/partials/admin/Links";
import { dateLocale } from "@/components/partials/admin/Detail";

export default function AdminSubscriptions() {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();
  const [filterActive, setFilterActive] = useState(""); // "" | "true" | "false"
  const [extendModal, setExtendModal] = useState(false);
  const [selectedSub, setSelectedSub] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentDateFrom, setPaymentDateFrom] = useState("");
  const [paymentDateTo, setPaymentDateTo] = useState("");
  const [refundBusy, setRefundBusy] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const params = useMemo(() => ({ active: filterActive, q }), [filterActive, q]);
  const paymentParams = useMemo(
    () => ({ status: paymentStatus, from: paymentDateFrom, to: paymentDateTo }),
    [paymentStatus, paymentDateFrom, paymentDateTo]
  );

  const handleRefund = async (paymentId) => {
    if (!(await confirm({ message: t("subscriptions.confirmRefund"), danger: true }))) return;
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
      toast.success(t("subscriptions.paymentRefunded"));
      payTable.reload();
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
      toast.success(data.message || t("subscriptions.extended"));
      setExtendModal(false);
      setSelectedSub(null);
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (sub) => {
    if (!(await confirm({ message: t("subscriptions.confirmCancel", { name: sub.user?.fullName }), danger: true }))) return;
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
      toast.success(t("subscriptions.cancelled"));
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const COLUMNS = [
    {
      Header: t("common.user"),
      accessor: "user",
      Cell: (row) => (
        <UserLink id={row?.cell?.value?.id} className="flex flex-col">
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {row?.cell?.value?.fullName ?? "—"}
          </span>
          <span className="text-xs text-slate-500">{row?.cell?.value?.email}</span>
        </UserLink>
      ),
    },
    {
      Header: t("subscriptions.plan"),
      accessor: "plan",
      Cell: (row) => (
        <span className="badge bg-primary-500/10 text-primary-500 capitalize">
          {row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: t("subscriptions.start"),
      accessor: "startDate",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleDateString(dateLocale(locale), { dateStyle: "medium" })
            : "—"}
        </span>
      ),
    },
    {
      Header: t("subscriptions.end"),
      accessor: "endDate",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleDateString(dateLocale(locale), { dateStyle: "medium" })
            : "—"}
        </span>
      ),
    },
    {
      Header: t("common.status"),
      accessor: "isActive",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-success-500 text-sm">{t("subscriptions.active")}</span>
        ) : (
          <span className="text-slate-500 text-sm">{t("subscriptions.inactive")}</span>
        ),
    },
    {
      Header: t("common.actions"),
      accessor: "id",
      Cell: (row) => {
        const sub = row?.row?.original;
        return (
          <div className="flex space-x-2 rtl:space-x-reverse">
            {sub?.isActive && (
              <>
                <Tooltip content={t("subscriptions.extend")} placement="top">
                  <button
                    type="button"
                    className="action-btn"
                    onClick={() => handleExtend(sub)}
                    disabled={busy}
                  >
                    <Icon icon="heroicons-outline:calendar-days" />
                  </button>
                </Tooltip>
                <Tooltip content={t("common.cancel")} placement="top" theme="danger">
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale]);
  const { table, total, loading, loaded, error, reload } = useServerTable({
    endpoint: "/api/subscriptions",
    params,
    columns,
    sortable: ["plan", "startDate", "endDate", "isActive"],
  });

  // Payments render their own rows; the table instance only drives paging.
  const NO_COLUMNS = useMemo(() => [], []);
  const payTable = useServerTable({ endpoint: "/api/payments", params: paymentParams, columns: NO_COLUMNS });
  const payments = payTable.data;

  const exportPayments = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllRows("/api/payments", paymentParams);
      exportCsv("payments.csv", rows.map((p) => ({
        id: p.id, user: p.user?.email || "", amount: p.amount, currency: p.currency || "TJS",
        type: p.type || "", plan: p.plan || "", paymentMethod: p.paymentMethod || "",
        status: p.status, createdAt: p.createdAt,
      })));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <HomeBredCurbs title={t("subscriptions.title")} />
      <Card title={t("subscriptions.cardTitle")} noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("subscriptions.description")}
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <select
              className="form-control py-2 w-max"
              value={filterActive}
              onChange={(e) => setFilterActive(e.target.value)}
            >
              <option value="">{t("common.all")}</option>
              <option value="true">{t("subscriptions.activeOnly")}</option>
              <option value="false">{t("subscriptions.inactiveOnly")}</option>
            </select>
            <input
              type="text"
              className="form-control py-2"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error}
          </p>
        )}
        <DataTable table={table} loading={loading} loaded={loaded} emptyText={t("subscriptions.empty")} />
        <TablePagination table={table} total={total} />
      </Card>

      <Card title={t("subscriptions.paymentsTitle")} className="mt-5">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4 flex items-center gap-2">
          <Icon icon="heroicons-outline:information-circle" className="text-lg" />
          {t("subscriptions.paymentsNote")}
        </p>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            className="form-control py-2 w-max"
            value={paymentStatus}
            onChange={(e) => setPaymentStatus(e.target.value)}
          >
            <option value="">{t("subscriptions.allStatuses")}</option>
            <option value="PENDING">{t("subscriptions.paymentStatus.pending")}</option>
            <option value="COMPLETED">{t("subscriptions.paymentStatus.completed")}</option>
            <option value="FAILED">{t("subscriptions.paymentStatus.failed")}</option>
            <option value="CANCELLED">{t("subscriptions.paymentStatus.cancelled")}</option>
          </select>
          <input type="date" className="form-control py-2" value={paymentDateFrom} onChange={(e) => setPaymentDateFrom(e.target.value)} title={t("subscriptions.from")} />
          <span className="text-slate-400 text-sm">–</span>
          <input type="date" className="form-control py-2" value={paymentDateTo} onChange={(e) => setPaymentDateTo(e.target.value)} title={t("subscriptions.to")} />
          {(paymentDateFrom || paymentDateTo || paymentStatus) && (
            <button className="btn btn-sm btn-outline-dark" onClick={() => { setPaymentStatus(""); setPaymentDateFrom(""); setPaymentDateTo(""); }}>
              {t("subscriptions.clear")}
            </button>
          )}
          <button
            className="btn btn-sm btn-outline-dark ml-auto"
            onClick={exportPayments}
            disabled={exporting || payTable.total === 0}
          >
            {exporting ? t("common.loading") : t("common.exportCsv")}
          </button>
        </div>
        {payTable.error && (
          <p className="text-danger text-sm mb-4">{payTable.error}</p>
        )}
        {!payTable.loaded ? (
          <div className="p-4 text-center text-slate-500">{t("common.loading")}</div>
        ) : payments.length === 0 ? (
          <p className="text-slate-500 text-sm py-4">{t("subscriptions.noPayments")}</p>
        ) : (
          <div className={`overflow-x-auto ${payTable.loading ? "opacity-50 pointer-events-none" : ""}`}>
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-200 dark:bg-slate-700">
                <tr>
                  <th className="table-th text-left">{t("common.user")}</th>
                  <th className="table-th text-left">{t("subscriptions.amount")}</th>
                  <th className="table-th text-left">{t("subscriptions.typePlan")}</th>
                  <th className="table-th text-left">{t("subscriptions.method")}</th>
                  <th className="table-th text-left">{t("common.status")}</th>
                  <th className="table-th text-left">{t("common.date")}</th>
                  <th className="table-th text-left">{t("common.actions")}</th>
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
                      }`}>
                        {p.status ? t(`subscriptions.paymentStatus.${p.status.toLowerCase()}`) : "—"}
                      </span>
                    </td>
                    <td className="table-td text-sm text-slate-500">
                      {p.createdAt ? new Date(p.createdAt).toLocaleString(dateLocale(locale), { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="table-td">
                      {p.status === "COMPLETED" && (
                        <Tooltip content={t("subscriptions.refund")} placement="top" theme="danger">
                          <button
                            type="button"
                            className="action-btn text-danger-500"
                            onClick={() => handleRefund(p.id)}
                            disabled={refundBusy === p.id}
                          >
                            <Icon icon="heroicons-outline:x-circle" />
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
        {payTable.total > 0 && <TablePagination table={payTable.table} total={payTable.total} />}
      </Card>

      <Modal
        activeModal={extendModal}
        onClose={() => !busy && setExtendModal(false)}
        title={t("subscriptions.extendTitle")}
        footerContent={
          <>
            <Button text={t("common.cancel")} className="btn-outline-dark" onClick={() => setExtendModal(false)} />
            <Button
              text={t("subscriptions.extend")}
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
              {t("subscriptions.extendPrompt", {
                name: selectedSub.user?.fullName,
                plan: selectedSub.plan,
              })}
            </p>
            <Textinput
              label={t("subscriptions.days")}
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
