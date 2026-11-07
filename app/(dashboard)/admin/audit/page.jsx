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

const ACTION_KEYS = {
  LOGIN: "audit.actionLogin",
  REGISTER: "audit.actionRegister",
  CREATE_TASK: "audit.actionCreateTask",
  UPDATE_TASK: "audit.actionUpdateTask",
  DELETE_TASK: "audit.actionDeleteTask",
  ACCEPT_RESPONSE: "audit.actionAcceptResponse",
  REJECT_RESPONSE: "audit.actionRejectResponse",
  CREATE_RESPONSE: "audit.actionCreateResponse",
  SUBSCRIBE: "audit.actionSubscribe",
  CANCEL_SUBSCRIPTION: "audit.actionCancelSubscription",
};

// Filter value for "everything done in this panel" (actions prefixed admin_).
const ADMIN_SCOPE = "__admin";

export default function AdminAuditLog() {
  const { t, locale } = useTranslation();
  const [actionFilter, setActionFilter] = useState("");

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const params = useMemo(
    () => (actionFilter === ADMIN_SCOPE ? { scope: "admin", q } : { action: actionFilter, q }),
    [actionFilter, q]
  );

  const COLUMNS = [
    {
      Header: t("audit.action"),
      accessor: "action",
      Cell: (row) => (
        <span className="font-mono text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded">
          {ACTION_KEYS[row?.cell?.value] ? t(ACTION_KEYS[row.cell.value]) : row?.cell?.value}
        </span>
      ),
    },
    {
      Header: t("common.user"),
      accessor: "user",
      Cell: (row) => {
        const user = row?.cell?.value;
        return user ? (
          <div className="flex flex-col">
            <span className="text-sm text-slate-700 dark:text-slate-300">{user.fullName}</span>
            <span className="text-xs text-slate-500">{user.email}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">{t("audit.anonymous")}</span>
        );
      },
    },
    {
      Header: t("audit.entity"),
      accessor: "entity",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-600 dark:text-slate-300">{row?.cell?.value ?? "—"}</span>
          <span className="text-xs text-slate-400 font-mono">{row?.row?.original?.entityId ?? ""}</span>
        </div>
      ),
    },
    {
      Header: t("audit.ip"),
      accessor: "ipAddress",
      Cell: (row) => (
        <span className="text-xs text-slate-500 font-mono">{row?.cell?.value ?? "—"}</span>
      ),
    },
    {
      Header: t("audit.details"),
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
      Header: t("audit.time"),
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
    endpoint: "/api/audit",
    params,
    columns,
    sortable: ['action', 'createdAt'],
  });

  const COMMON_ACTIONS = [
    "LOGIN", "REGISTER", "CREATE_TASK", "UPDATE_TASK", "DELETE_TASK",
    "ACCEPT_RESPONSE", "REJECT_RESPONSE", "CREATE_RESPONSE",
    "SUBSCRIBE", "CANCEL_SUBSCRIPTION",
  ];

  return (
    <div>
      <HomeBredCurbs title={t("audit.title")} />
      <Card noborder>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <select
              className="form-control py-2 w-max"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">{t("audit.allActions")}</option>
              <option value={ADMIN_SCOPE}>{t("audit.adminActions")}</option>
              {COMMON_ACTIONS.map((a) => (
                <option key={a} value={a}>{t(ACTION_KEYS[a])}</option>
              ))}
            </select>
            <input
              type="text"
              className="form-control py-2"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <span className="text-xs text-slate-400">{t("audit.entriesLoaded", { count: total })}</span>
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
