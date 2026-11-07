"use client";

import React from "react";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/context/LanguageContext";

/** Page numbers around the current one, with gaps: 1 … 4 5 [6] 7 8 … 40 */
function pageWindow(current, count) {
  const pages = new Set([0, count - 1]);
  for (let i = current - 2; i <= current + 2; i++) if (i >= 0 && i < count) pages.add(i);
  const sorted = [...pages].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push(`gap-${p}`);
    out.push(p);
  });
  return out;
}

export default function TablePagination({ table, total, sizes = [10, 25, 50, 100] }) {
  const { t } = useTranslation();
  const { gotoPage, nextPage, previousPage, canNextPage, canPreviousPage, pageCount, setPageSize, state } = table;
  const { pageIndex, pageSize } = state;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  const btn = (enabled) =>
    `text-slate-900 dark:text-white ${enabled ? "" : "opacity-50 cursor-not-allowed"}`;

  return (
    <div className="md:flex md:space-y-0 space-y-5 justify-between mt-6 items-center">
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <select
          className="form-control py-2 w-max"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {sizes.map((n) => (
            <option key={n} value={n}>
              {t("common.show", { n })}
            </option>
          ))}
        </select>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {t("common.rangeOf", { from, to, total })}
        </span>
      </div>
      <ul className="flex items-center space-x-3 rtl:space-x-reverse flex-wrap">
        <li className="text-xl leading-4 rtl:rotate-180">
          <button className={btn(canPreviousPage)} onClick={() => gotoPage(0)} disabled={!canPreviousPage}>
            <Icon icon="heroicons:chevron-double-left-solid" />
          </button>
        </li>
        <li className="text-sm leading-4 rtl:rotate-180">
          <button className={btn(canPreviousPage)} onClick={() => previousPage()} disabled={!canPreviousPage}>
            {t("common.prev")}
          </button>
        </li>
        {pageWindow(pageIndex, pageCount).map((p) =>
          typeof p === "string" ? (
            <li key={p} className="text-slate-400 text-sm">…</li>
          ) : (
            <li key={p}>
              <button
                aria-current={p === pageIndex ? "page" : undefined}
                className={`${
                  p === pageIndex
                    ? "bg-slate-900 dark:bg-slate-600 dark:text-slate-200 text-white font-medium"
                    : "bg-slate-100 dark:bg-slate-700 dark:text-slate-400 text-slate-900 font-normal"
                } text-sm rounded leading-[16px] flex h-6 min-w-[24px] px-1 items-center justify-center transition-all duration-150`}
                onClick={() => gotoPage(p)}
              >
                {p + 1}
              </button>
            </li>
          )
        )}
        <li className="text-sm leading-4 rtl:rotate-180">
          <button className={btn(canNextPage)} onClick={() => nextPage()} disabled={!canNextPage}>
            {t("common.next")}
          </button>
        </li>
        <li className="text-xl leading-4 rtl:rotate-180">
          <button className={btn(canNextPage)} onClick={() => gotoPage(pageCount - 1)} disabled={!canNextPage}>
            <Icon icon="heroicons:chevron-double-right-solid" />
          </button>
        </li>
      </ul>
    </div>
  );
}
