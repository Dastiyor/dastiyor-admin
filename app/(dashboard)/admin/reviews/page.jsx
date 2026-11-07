"use client";

import React, { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import DataTable from "@/components/partials/table/DataTable";
import TablePagination from "@/components/partials/table/TablePagination";
import useServerTable from "@/hooks/useServerTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/context/LanguageContext";
import { UserLink, TaskLink } from "@/components/partials/admin/Links";
import { toast } from "react-toastify";

export default function AdminReviews() {
  const { t, locale } = useTranslation();
  const [showHidden, setShowHidden] = useState(true);
  const [minRating, setMinRating] = useState(0);

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const params = useMemo(
    () => ({ includeHidden: showHidden ? "true" : "", maxRating: minRating || "", q }),
    [showHidden, minRating, q]
  );

  const toggleHidden = async (review) => {
    try {
      const res = await fetch(`/api/reviews/${review.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ hidden: !review.hidden }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setData((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, hidden: data.hidden } : r))
      );
    } catch (e) {
      toast.error(e.message);
    }
  };

  const COLUMNS = [
    {
      Header: t("reviews.from"),
      accessor: "reviewer",
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
      Header: t("reviews.to"),
      accessor: "reviewed",
      Cell: (row) => (
        <UserLink id={row?.cell?.value?.id} className="flex flex-col">
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {row?.cell?.value?.fullName ?? "—"}
          </span>
          <span className="text-xs text-slate-500">{row?.cell?.value?.email}</span>
        </UserLink>
      ),
    },
    {
      Header: t("reviews.task"),
      accessor: "task",
      Cell: (row) => (
        <TaskLink id={row?.cell?.value?.id} className="max-w-[180px]">
          <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
            {row?.cell?.value?.title ?? "—"}
          </span>
        </TaskLink>
      ),
    },
    {
      Header: t("reviews.rating"),
      accessor: "rating",
      Cell: (row) => (
        <span className="inline-flex items-center gap-1">
          <Icon icon="heroicons:star" className="text-warning-500 text-lg" />
          <span className="font-medium text-slate-900 dark:text-white">{row?.cell?.value ?? "—"}</span>
        </span>
      ),
    },
    {
      Header: t("reviews.comment"),
      accessor: "comment",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[220px]">
          {row?.cell?.value || "—"}
        </span>
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
    {
      Header: t("reviews.visibility"),
      accessor: "hidden",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-xs text-slate-400">{t("reviews.hidden")}</span>
        ) : (
          <span className="text-xs text-success-500">{t("reviews.visible")}</span>
        ),
    },
    {
      Header: t("common.actions"),
      accessor: "id",
      Cell: (row) => {
        const review = row?.row?.original;
        const isHidden = review?.hidden;
        return (
          <button
            type="button"
            className={`btn btn-xs ${
              isHidden ? "btn-success" : "btn-outline-dark"
            }`}
            onClick={() => toggleHidden(review)}
          >
            {isHidden ? t("reviews.unhide") : t("reviews.hide")}
          </button>
        );
      },
    },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale]);
  const { table, data, setData, total, loading, loaded, error, reload } = useServerTable({
    endpoint: "/api/reviews",
    params,
    columns,
    sortable: ['rating', 'hidden', 'createdAt'],
  });

  return (
    <div>
      <HomeBredCurbs title={t("reviews.title")} />
      <Card title={t("reviews.cardTitle")} noborder>
        <div className="md:flex justify-between items-center mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Checkbox
              label={t("reviews.showHidden")}
              value={showHidden}
              onChange={(e) => setShowHidden(e.target.checked)}
            />
            <select
              className="form-control py-2 w-max"
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              title={t("reviews.ratingFilterTitle")}
            >
              <option value={0}>{t("reviews.allRatings")}</option>
              <option value={1}>{t("reviews.ratingOnlyOne")}</option>
              <option value={2}>{t("reviews.ratingAtMost", { n: 2 })}</option>
              <option value={3}>{t("reviews.ratingAtMost", { n: 3 })}</option>
              <option value={4}>{t("reviews.ratingAtMost", { n: 4 })}</option>
            </select>
            <span className="text-xs text-slate-400">
              {t("reviews.count", { count: total })}
            </span>
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
