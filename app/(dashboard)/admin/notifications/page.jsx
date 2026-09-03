"use client";

import React, { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";

const TYPE_KEYS = {
  SYSTEM: "notifications.typeSystem",
  TASK_UPDATE: "notifications.typeTaskUpdate",
  NEW_MESSAGE: "notifications.typeNewMessage",
  NEW_OFFER: "notifications.typeNewOffer",
  OFFER_ACCEPTED: "notifications.typeOfferAccepted",
};

export default function AdminNotifications() {
  const { t, locale } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const [sendForm, setSendForm] = useState({ title: "", message: "", type: "SYSTEM", link: "", userId: "" });
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      toast.error(t("notifications.titleMessageRequired"));
      return;
    }
    setSending(true);
    try {
      const body = { ...sendForm };
      if (!body.userId.trim()) delete body.userId;
      if (!body.link.trim()) delete body.link;
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success(t("notifications.sentTo", { count: data.sent }));
      setSendForm({ title: "", message: "", type: "SYSTEM", link: "", userId: "" });
      fetchNotifications();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = unreadOnly ? "&unread=true" : "";
      const res = await fetch(`/api/notifications?limit=500${q}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setNotifications(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [unreadOnly]);

  const COLUMNS = [
    {
      Header: t("common.user"),
      accessor: "user",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {row?.cell?.value?.fullName ?? "—"}
          </span>
          <span className="text-xs text-slate-500">{row?.cell?.value?.email}</span>
        </div>
      ),
    },
    {
      Header: t("notifications.type"),
      accessor: "type",
      Cell: (row) => (
        <span className="badge bg-primary-500/10 text-primary-500 text-xs">
          {TYPE_KEYS[row?.cell?.value] ? t(TYPE_KEYS[row.cell.value]) : row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: t("notifications.titleLabel"),
      accessor: "title",
      Cell: (row) => (
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          {row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: t("notifications.message"),
      accessor: "message",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[240px]">
          {row?.cell?.value || "—"}
        </span>
      ),
    },
    {
      Header: t("notifications.read"),
      accessor: "isRead",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-success-500 text-sm">{t("notifications.yes")}</span>
        ) : (
          <span className="text-warning-500 text-sm">{t("notifications.no")}</span>
        ),
    },
    {
      Header: t("common.date"),
      accessor: "createdAt",
      Cell: (row) => (
        <span className="text-sm text-slate-500">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleString(undefined, {
                dateStyle: "short",
                timeStyle: "short",
              })
            : "—"}
        </span>
      ),
    },
  ];

  const columns = useMemo(() => COLUMNS, [locale]);
  const data = useMemo(() => notifications, [notifications]);

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
      <HomeBredCurbs title={t("notifications.title")} />

      <Card title={t("notifications.send")} className="mb-5">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("notifications.sendHint")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Textinput
            label={t("notifications.titleLabel")}
            value={sendForm.title}
            onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
            placeholder={t("notifications.titlePlaceholder")}
          />
          <Select
            label={t("notifications.type")}
            options={Object.entries(TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
            value={sendForm.type}
            onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
          />
          <Textarea
            label={t("notifications.message")}
            value={sendForm.message}
            onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
            placeholder={t("notifications.messagePlaceholder")}
            className="sm:col-span-2"
          />
          <Textinput
            label={t("notifications.link")}
            value={sendForm.link}
            onChange={(e) => setSendForm({ ...sendForm, link: e.target.value })}
            placeholder={t("notifications.linkPlaceholder")}
          />
          <Textinput
            label={t("notifications.userId")}
            value={sendForm.userId}
            onChange={(e) => setSendForm({ ...sendForm, userId: e.target.value })}
            placeholder={t("notifications.userIdPlaceholder")}
          />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button
            text={sendForm.userId.trim() ? t("notifications.sendToUser") : t("notifications.broadcast")}
            className="btn-dark btn-sm"
            onClick={handleSend}
            disabled={sending}
          />
          {!sendForm.userId.trim() && (
            <span className="text-xs text-warning-500 flex items-center gap-1">
              <Icon icon="heroicons-outline:exclamation-triangle" />
              {t("notifications.broadcastWarning")}
            </span>
          )}
        </div>
      </Card>

      <Card title={t("notifications.platform")} noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("notifications.platformHint")}
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Checkbox
              label={t("notifications.unreadOnly")}
              value={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
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
          <div className="p-5 text-center text-slate-500">{t("common.loading")}</div>
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
                          {t("notifications.empty")}
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
                        {t("common.show", { n })}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {t("common.pageOf", { page: pageIndex + 1, total: pageOptions.length || 1 })}
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
                    {t("common.prev")}
                  </button>
                  <button
                    className="btn btn-sm btn-outline-dark"
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                  >
                    {t("common.next")}
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
    </div>
  );
}
