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

export default function AdminResponses() {
  const { t, locale } = useTranslation();
  const [statusFilter, setStatusFilter] = useState("");

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const params = useMemo(() => ({ status: statusFilter, q }), [statusFilter, q]);

  const COLUMNS = [
    {
      Header: t("responses.task"),
      accessor: "task",
      Cell: (row) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
            {row?.cell?.value?.title ?? "—"}
          </span>
          <span className="text-xs text-slate-500">
            {row?.cell?.value?.status
              ? t(`responses.taskStatus.${row.cell.value.status.toLowerCase()}`)
              : ""}
          </span>
        </div>
      ),
    },
    {
      Header: t("responses.provider"),
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
      Header: t("responses.price"),
      accessor: "priceNum",
      Cell: (row) => {
        const num = row?.cell?.value;
        const str = row?.row?.original?.price;
        return (
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {num != null ? `${num.toLocaleString()} TJS` : str ?? "—"}
          </span>
        );
      },
    },
    {
      Header: t("responses.message"),
      accessor: "message",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[220px]">
          {row?.cell?.value || "—"}
        </span>
      ),
    },
    {
      Header: t("responses.estimatedTime"),
      accessor: "estimatedTime",
      Cell: (row) => (
        <span className="text-sm text-slate-500">{row?.cell?.value || "—"}</span>
      ),
    },
    {
      Header: t("common.status"),
      accessor: "status",
      Cell: (row) => {
        const s = row?.cell?.value;
        const cls =
          s === "ACCEPTED"
            ? "bg-success-500/10 text-success-500"
            : s === "REJECTED"
              ? "bg-danger-500/10 text-danger-500"
              : "bg-primary-500/10 text-primary-500";
        return (
          <span className={`badge ${cls}`}>
            {s ? t(`responses.status.${s.toLowerCase()}`) : "—"}
          </span>
        );
      },
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale]);
  const { table, data, setData, total, loading, loaded, error, reload } = useServerTable({
    endpoint: "/api/responses",
    params,
    columns,
    sortable: ['priceNum', 'status', 'createdAt'],
  });

  return (
    <div>
      <HomeBredCurbs title={t("responses.title")} />
      <Card title={t("responses.cardTitle")} noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("responses.description")}
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <select
              className="form-control py-2 w-max"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t("responses.allStatuses")}</option>
              <option value="PENDING">{t("responses.status.pending")}</option>
              <option value="ACCEPTED">{t("responses.status.accepted")}</option>
              <option value="REJECTED">{t("responses.status.rejected")}</option>
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
        <DataTable table={table} loading={loading} loaded={loaded} emptyText={t("common.noResult")} />
        <TablePagination table={table} total={total} />
      </Card>
    </div>
  );
}
