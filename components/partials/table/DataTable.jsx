"use client";

import React from "react";
import TableSkeleton from "@/components/ui/TableSkeleton";

/**
 * Renders a react-table instance in the panel's table style. Shows a skeleton
 * on the first load, then dims the old rows while the next page loads.
 */
export default function DataTable({ table, loading, loaded = true, emptyText, skeletonCols = 6 }) {
  const { getTableProps, getTableBodyProps, headerGroups, page, prepareRow, visibleColumns } = table;

  if (!loaded) return <TableSkeleton rows={8} cols={skeletonCols} />;

  return (
    <div className="overflow-x-auto -mx-6">
      <div className="inline-block min-w-full align-middle">
        <table
          className={`min-w-full divide-y divide-slate-100 table-fixed dark:divide-slate-700 transition-opacity ${
            loading ? "opacity-50 pointer-events-none" : ""
          }`}
          {...getTableProps()}
        >
          <thead className="bg-slate-200 dark:bg-slate-700">
            {headerGroups.map((headerGroup) => {
              const { key, ...rest } = headerGroup.getHeaderGroupProps();
              return (
                <tr key={key} {...rest}>
                  {headerGroup.headers.map((column) => {
                    const { key: cKey, ...cRest } = column.getHeaderProps(
                      column.getSortByToggleProps ? column.getSortByToggleProps() : undefined
                    );
                    return (
                      <th key={cKey} {...cRest} scope="col" className="table-th">
                        <span className="inline-flex items-center gap-1">
                          {column.render("Header")}
                          {column.isSorted ? (column.isSortedDesc ? " 🔽" : " 🔼") : ""}
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
                <td colSpan={visibleColumns.length} className="table-td text-center text-slate-500 py-8">
                  {emptyText}
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
  );
}
