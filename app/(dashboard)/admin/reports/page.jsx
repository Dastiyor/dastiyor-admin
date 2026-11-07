"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Tooltip from "@/components/ui/Tooltip";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import DataTable from "@/components/partials/table/DataTable";
import TablePagination from "@/components/partials/table/TablePagination";
import useServerTable from "@/hooks/useServerTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/context/LanguageContext";
import { useUrlFilter, UrlFilterChip } from "@/components/partials/admin/UrlFilter";
import { toast } from "react-toastify";
import ReportStatus from "@/components/partials/admin/ReportStatus";
import { dateLocale } from "@/components/partials/admin/Detail";

const STATUSES = ["OPEN", "RESOLVED", "DISMISSED"];

export default function AdminReports() {
  const { t, locale } = useTranslation();
  const targetUserId = useUrlFilter("targetUserId");
  // Coming from a user's page: show all their complaints, not only open ones.
  const [statusFilter, setStatusFilter] = useState(targetUserId ? "" : "OPEN");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(null);
  const q = useDebouncedValue(search.trim());
  const params = useMemo(() => ({ status: statusFilter, q, targetUserId }), [statusFilter, q, targetUserId]);

  const setStatus = async (report, status) => {
    setBusy(report.id);
    try {
      const res = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      toast.success(t(`reports.done.${status}`));
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const COLUMNS = [
    {
      Header: t("reports.reporter"),
      accessor: "reporter",
      Cell: ({ value }) =>
        value ? (
          <Link href={`/admin/users/${value.id}`} className="flex flex-col hover:text-primary-500">
            <span className="text-sm font-medium text-slate-900 dark:text-white">{value.fullName}</span>
            <span className="text-xs text-slate-500">{value.email}</span>
          </Link>
        ) : (
          "—"
        ),
    },
    {
      Header: t("reports.target"),
      id: "target",
      accessor: (r) => r,
      Cell: ({ value: r }) => (
        <div className="flex flex-col gap-1">
          {r.targetUser && (
            <Link href={`/admin/users/${r.targetUser.id}`} className="text-sm hover:text-primary-500 inline-flex items-center gap-1">
              <Icon icon="heroicons-outline:user" className="text-slate-400" />
              {r.targetUser.fullName}
            </Link>
          )}
          {r.targetTask && (
            <Link href={`/admin/tasks/${r.targetTask.id}`} className="text-sm hover:text-primary-500 inline-flex items-center gap-1">
              <Icon icon="heroicons-outline:clipboard-document-list" className="text-slate-400" />
              <span className="line-clamp-1 max-w-[220px]">{r.targetTask.title}</span>
            </Link>
          )}
          {!r.targetUser && !r.targetTask && <span className="text-slate-400 text-xs">{t("reports.targetGone")}</span>}
        </div>
      ),
    },
    {
      Header: t("reports.reason"),
      accessor: "reason",
      Cell: ({ value }) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap line-clamp-3 max-w-[320px]">{value}</span>
      ),
    },
    {
      Header: t("common.status"),
      accessor: "status",
      Cell: ({ value }) => <ReportStatus status={value} />,
    },
    {
      Header: t("common.date"),
      accessor: "createdAt",
      Cell: ({ value }) => (
        <span className="text-xs text-slate-500 whitespace-nowrap">
          {new Date(value).toLocaleString(dateLocale(locale), { dateStyle: "short", timeStyle: "short" })}
        </span>
      ),
    },
    {
      Header: t("common.actions"),
      accessor: "id",
      Cell: ({ row }) => {
        const r = row.original;
        const disabled = busy === r.id;
        return (
          <div className="flex space-x-3 rtl:space-x-reverse">
            {r.status === "OPEN" ? (
              <>
                <Tooltip content={t("reports.resolve")} placement="top" arrow>
                  <button type="button" className="action-btn text-success-500" disabled={disabled} onClick={() => setStatus(r, "RESOLVED")}>
                    <Icon icon="heroicons:check" />
                  </button>
                </Tooltip>
                <Tooltip content={t("reports.dismiss")} placement="top" arrow>
                  <button type="button" className="action-btn" disabled={disabled} onClick={() => setStatus(r, "DISMISSED")}>
                    <Icon icon="heroicons:x-mark" />
                  </button>
                </Tooltip>
              </>
            ) : (
              <Tooltip content={t("reports.reopen")} placement="top" arrow>
                <button type="button" className="action-btn" disabled={disabled} onClick={() => setStatus(r, "OPEN")}>
                  <Icon icon="heroicons:arrow-uturn-left" />
                </button>
              </Tooltip>
            )}
          </div>
        );
      },
    },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale, busy]);
  const { table, total, meta, loading, loaded, error, reload } = useServerTable({
    endpoint: "/api/reports",
    params,
    columns,
    sortable: ["status", "createdAt"],
  });

  return (
    <div>
      <HomeBredCurbs title={t("reports.title")} />
      <Card noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{t("reports.description")}</p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <select className="form-control py-2 w-max" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">{t("reports.allStatuses")}</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{t(`reports.status.${s}`)}</option>
              ))}
            </select>
            <input
              type="text"
              className="form-control py-2"
              placeholder={t("common.search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {targetUserId && <UrlFilterChip label={t("detail.filteredByUser")} />}
          </div>
          {typeof meta.openCount === "number" && (
            <span className="text-sm text-slate-500">{t("reports.openCount", { count: meta.openCount })}</span>
          )}
        </div>
        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error}
          </p>
        )}
        <DataTable table={table} loading={loading} loaded={loaded} emptyText={t("reports.empty")} />
        <TablePagination table={table} total={total} />
      </Card>
    </div>
  );
}
