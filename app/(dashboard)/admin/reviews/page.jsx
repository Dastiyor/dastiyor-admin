"use client";

import React, { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import TableSkeleton from "@/components/ui/TableSkeleton";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";
import { useTranslation } from "@/context/LanguageContext";

export default function AdminReviews() {
  const { t, locale } = useTranslation();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHidden, setShowHidden] = useState(true);
  const [minRating, setMinRating] = useState(0);

  const fetchReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews?limit=500&includeHidden=true", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setReviews(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

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
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, hidden: data.hidden } : r))
      );
    } catch (e) {
      alert(e.message);
    }
  };

  const COLUMNS = [
    {
      Header: t("reviews.from"),
      accessor: "reviewer",
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
      Header: t("reviews.to"),
      accessor: "reviewed",
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
      Header: t("reviews.task"),
      accessor: "task",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[180px]">
          {row?.cell?.value?.title ?? "—"}
        </span>
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

  const columns = useMemo(() => COLUMNS, [locale]);
  const data = useMemo(() => {
    let filtered = showHidden ? reviews : reviews.filter((r) => !r.hidden);
    if (minRating > 0) filtered = filtered.filter((r) => (r.rating || 0) <= minRating);
    return filtered;
  }, [reviews, showHidden, minRating]);

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
              {t("reviews.count", { count: data.length })}
            </span>
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
          <TableSkeleton rows={8} cols={7} />
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
                              <th
                                key={cKey}
                                {...cRest}
                                scope="col"
                                className="table-th"
                              >
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
                          {t("reviews.empty")}
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
                    {[10, 20, 50].map((n) => (
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
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-4 flex items-center gap-2">
          <Icon icon="heroicons-outline:information-circle" className="text-lg" />
          {t("reviews.moderationNote")}
        </p>
      </Card>
    </div>
  );
}
