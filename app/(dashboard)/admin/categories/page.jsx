"use client";

import React, { useEffect, useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import RowSelectCheckbox from "@/components/partials/table/RowSelectCheckbox";
import Tooltip from "@/components/ui/Tooltip";
import { useTranslation } from "@/context/LanguageContext";
import { bulkDelete } from "@/lib/bulkDelete";
import {
  useTable,
  useSortBy,
  useGlobalFilter,
  usePagination,
  useRowSelect,
} from "react-table";

function parseSubcategories(val) {
  if (val == null || val === "") return [];
  try {
    const arr = typeof val === "string" ? JSON.parse(val) : val;
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export default function AdminCategories() {
  const { t, locale } = useTranslation();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    order: 0,
    subcategories: "",
  });

  const fetchCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setCategories(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreate = () => {
    setCurrentCategory(null);
    setFormData({ name: "", slug: "", order: 0, subcategories: "" });
    setModalOpen(true);
  };

  const handleEdit = (cat) => {
    setCurrentCategory(cat);
    const subs = parseSubcategories(cat.subcategories);
    setFormData({
      name: cat.name || "",
      slug: cat.slug || "",
      order: cat.order ?? 0,
      subcategories: Array.isArray(subs) ? subs.join(", ") : "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("categories.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || res.statusText);
      }
      fetchCategories();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubmit = async () => {
    const subList = formData.subcategories
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const payload = {
      name: formData.name.trim(),
      slug: formData.slug.trim() || formData.name.trim().toLowerCase().replace(/\s+/g, "-"),
      order: parseInt(formData.order, 10) || 0,
      subcategories: subList,
    };
    const url = currentCategory ? `/api/categories/${currentCategory.id}` : "/api/categories";
    const method = currentCategory ? "PUT" : "POST";
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setModalOpen(false);
      fetchCategories();
    } catch (e) {
      alert(e.message);
    }
  };

  const COLUMNS = [
    {
      Header: t("categories.name"),
      accessor: "name",
      Cell: (row) => (
        <span className="font-medium text-slate-900 dark:text-white">{row?.cell?.value ?? "—"}</span>
      ),
    },
    {
      Header: t("categories.slug"),
      accessor: "slug",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">
          {row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: t("categories.subcategories"),
      accessor: "subcategories",
      Cell: (row) => {
        const subs = parseSubcategories(row?.cell?.value);
        return (
          <span className="text-sm text-slate-600 dark:text-slate-300">
            {subs.length ? subs.join(", ") : "—"}
          </span>
        );
      },
    },
    {
      Header: t("categories.order"),
      accessor: "order",
      Cell: (row) => (
        <span className="text-sm text-slate-500">{row?.cell?.value ?? 0}</span>
      ),
    },
    {
      Header: t("common.actions"),
      accessor: "id",
      Cell: (row) => {
        const cat = row?.row?.original;
        return (
          <div className="flex space-x-2 rtl:space-x-reverse">
            <Tooltip content={t("common.edit")} placement="top">
              <button
                type="button"
                className="action-btn"
                onClick={() => handleEdit(cat)}
              >
                <Icon icon="heroicons:pencil-square" />
              </button>
            </Tooltip>
            <Tooltip content={t("common.delete")} placement="top" theme="danger">
              <button
                type="button"
                className="action-btn text-danger-500"
                onClick={() => handleDelete(cat.id)}
              >
                <Icon icon="heroicons:trash" />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const columns = useMemo(() => COLUMNS, [locale]);
  const data = useMemo(() => categories, [categories]);

  const tableInstance = useTable(
    {
      columns,
      data,
      initialState: { pageIndex: 0, pageSize: 10 },
    },
    useGlobalFilter,
    useSortBy,
    usePagination,
    useRowSelect,
    (hooks) => {
      hooks.visibleColumns.push((columns) => [
        {
          id: "selection",
          Header: ({ getToggleAllRowsSelectedProps }) => (
            <div>
              <RowSelectCheckbox {...getToggleAllRowsSelectedProps()} />
            </div>
          ),
          Cell: ({ row }) => (
            <div>
              <RowSelectCheckbox {...row.getToggleRowSelectedProps()} />
            </div>
          ),
        },
        ...columns,
      ]);
    }
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
    selectedFlatRows,
    toggleAllRowsSelected,
  } = tableInstance;

  const { globalFilter, pageIndex, pageSize } = state;

  const handleBulkDelete = async () => {
    const ids = selectedFlatRows.map((r) => r.original.id);
    if (!ids.length) return;
    if (!confirm(t("categories.confirmBulkDelete", { count: ids.length }))) return;
    const failed = await bulkDelete("/api/categories", ids);
    if (failed.length) {
      alert(`${t("categories.bulkDeleteFailed", { failed: failed.length, total: ids.length })}\n${failed.join("\n")}`);
    }
    toggleAllRowsSelected(false);
    fetchCategories();
  };

  return (
    <div>
      <HomeBredCurbs title={t("categories.title")} />
      <Card title={t("categories.serviceCategories")} noborder>
        <div className="md:flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button text={t("categories.add")} className="btn-success btn-sm" onClick={handleCreate} />
            {selectedFlatRows.length > 0 && (
              <Button
                text={t("common.deleteSelected", { count: selectedFlatRows.length })}
                className="btn-danger btn-sm"
                onClick={handleBulkDelete}
              />
            )}
          </div>
          <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
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
                          {t("categories.empty")}
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
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-4 flex items-center gap-2">
          <Icon icon="heroicons-outline:information-circle" className="text-lg" />
          {t("categories.hint")}
        </p>
      </Card>

      <Modal
        activeModal={modalOpen}
        onClose={() => setModalOpen(false)}
        title={currentCategory ? t("categories.edit") : t("categories.add")}
        footerContent={
          <Button
            text={currentCategory ? t("common.update") : t("common.create")}
            className="btn-dark"
            onClick={handleSubmit}
          />
        }
      >
        <div className="space-y-4">
          <Textinput
            label={t("categories.name")}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("categories.namePlaceholder")}
          />
          <Textinput
            label={t("categories.slug")}
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder={t("categories.slugPlaceholder")}
          />
          <Textinput
            label={t("categories.order")}
            type="number"
            value={formData.order}
            onChange={(e) => setFormData({ ...formData, order: e.target.value })}
          />
          <Textarea
            label={t("categories.subcategoriesLabel")}
            value={formData.subcategories}
            onChange={(e) => setFormData({ ...formData, subcategories: e.target.value })}
            placeholder={t("categories.subcategoriesPlaceholder")}
          />
        </div>
      </Modal>
    </div>
  );
}
