"use client";

import React, { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import DataTable from "@/components/partials/table/DataTable";
import TablePagination from "@/components/partials/table/TablePagination";
import useServerTable from "@/hooks/useServerTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/context/LanguageContext";
import { useUrlFilter, UrlFilterChip } from "@/components/partials/admin/UrlFilter";
import { UserLink, TaskLink } from "@/components/partials/admin/Links";

export default function AdminConversations() {
  const { t, locale } = useTranslation();
  const [userIdFilter, setUserIdFilter] = useState("");
  const taskIdFilter = useUrlFilter("taskId");
  const [userIdInput, setUserIdInput] = useState("");

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const params = useMemo(() => ({ userId: userIdFilter, taskId: taskIdFilter, q }), [userIdFilter, taskIdFilter, q]);

  const COLUMNS = [
    {
      Header: t("conversations.colFrom"),
      accessor: "sender",
      Cell: (row) => {
        const u = row?.cell?.value;
        return (
          <UserLink id={u?.id} className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{u?.fullName ?? "—"}</span>
            <span className="text-xs text-slate-500">{u?.email}</span>
            <span className="text-xs text-slate-400 capitalize">{u?.role && t(`conversations.role.${u.role.toLowerCase()}`)}</span>
          </UserLink>
        );
      },
    },
    {
      Header: t("conversations.colTo"),
      accessor: "receiver",
      Cell: (row) => {
        const u = row?.cell?.value;
        return (
          <UserLink id={u?.id} className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{u?.fullName ?? "—"}</span>
            <span className="text-xs text-slate-500">{u?.email}</span>
            <span className="text-xs text-slate-400 capitalize">{u?.role && t(`conversations.role.${u.role.toLowerCase()}`)}</span>
          </UserLink>
        );
      },
    },
    {
      Header: t("conversations.colTask"),
      accessor: "task",
      Cell: (row) => {
        const task = row?.cell?.value;
        if (!task) return <span className="text-xs text-slate-400">—</span>;
        return (
          <TaskLink id={task.id} className="flex flex-col max-w-[180px]">
            <span className="text-sm text-slate-700 dark:text-slate-300 line-clamp-1">{task.title}</span>
            <span className="text-xs text-slate-400">{task.status && t(`conversations.taskStatus.${task.status.toLowerCase()}`)}</span>
          </TaskLink>
        );
      },
    },
    {
      Header: t("conversations.colMessage"),
      accessor: "content",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[260px]">
          {row?.cell?.value || "—"}
        </span>
      ),
    },
    {
      Header: t("conversations.colRead"),
      accessor: "isRead",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-success-500 text-xs">{t("conversations.read")}</span>
        ) : (
          <span className="text-warning-500 text-xs font-medium">{t("conversations.unread")}</span>
        ),
    },
    {
      Header: t("conversations.colTime"),
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale]);
  const { table, data, setData, total, loading, loaded, error, reload } = useServerTable({
    endpoint: "/api/conversations",
    params,
    columns,
    sortable: ['isRead', 'createdAt'],
  });

  return (
    <div>
      <HomeBredCurbs title={t("conversations.title")} />
      <Card noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("conversations.subtitle")}
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <input
                type="text"
                className="form-control py-2"
                placeholder={t("conversations.filterPlaceholder")}
                value={userIdInput}
                onChange={(e) => setUserIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setUserIdFilter(userIdInput.trim())}
              />
              <button
                className="btn btn-sm btn-dark"
                onClick={() => setUserIdFilter(userIdInput.trim())}
              >
                {t("conversations.filter")}
              </button>
              {userIdFilter && (
                <button
                  className="btn btn-sm btn-outline-dark"
                  onClick={() => { setUserIdFilter(""); setUserIdInput(""); }}
                >
                  {t("conversations.clear")}
                </button>
              )}
            </div>
            <input
              type="text"
              className="form-control py-2"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {taskIdFilter && <UrlFilterChip label={t("detail.filteredByTask")} />}
          </div>
          <span className="text-xs text-slate-400">{t("conversations.messagesLoaded", { count: total })}</span>
        </div>

        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error}
          </p>
        )}

        <DataTable table={table} loading={loading} loaded={loaded} emptyText={t("common.noResult")} />
        <TablePagination table={table} total={total} />
      </Card>
    </div>
  );
}
