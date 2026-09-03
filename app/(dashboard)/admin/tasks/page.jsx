"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import GlobalFilter from "@/components/partials/table/GlobalFilter";
import RowSelectCheckbox from "@/components/partials/table/RowSelectCheckbox";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import TableSkeleton from "@/components/ui/TableSkeleton";
import { exportCsv } from "@/lib/exportCsv";
import { bulkDelete } from "@/lib/bulkDelete";
import { useTranslation } from "@/context/LanguageContext";
import {
  useTable,
  useRowSelect,
  useSortBy,
  useGlobalFilter,
  usePagination,
} from "react-table";

export default function AdminTasks() {
  const { t, locale } = useTranslation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("newest");
  const [searchQ, setSearchQ] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [categories, setCategories] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    city: "",
    status: "OPEN",
    urgency: "normal",
    budgetType: "negotiable",
    budgetAmount: "",
    dueDate: "",
    userId: "",
  });
  const searchParams = useSearchParams();

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch larger set for client-side pagination
      const qs = new URLSearchParams({ limit: "1000" });
      if (statusFilter) qs.set("status", statusFilter);
      if (urgencyFilter) qs.set("urgency", urgencyFilter);
      if (sortFilter) qs.set("sort", sortFilter);
      if (searchQ) qs.set("q", searchQ);
      if (dateFrom) qs.set("from", dateFrom);
      if (dateTo) qs.set("to", dateTo);
      const res = await fetch(`/api/tasks?${qs.toString()}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setTasks(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const statusFromUrl = searchParams?.get("status");
    if (statusFromUrl) setStatusFilter(statusFromUrl);
  }, [searchParams]);

  useEffect(() => {
    fetchTasks();
  }, [statusFilter, urgencyFilter, sortFilter, searchQ, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    async function fetchCategories() {
      try {
        const res = await fetch("/api/categories", { credentials: "include" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setCategories(json.data || []);
      } catch {
        // ignore categories load error (fallback to text input behavior)
      }
    }
    fetchCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCreate = () => {
    setCurrentTask(null);
    setFormData({
      title: "",
      description: "",
      category: "",
      subcategory: "",
      city: "",
      status: "OPEN",
      urgency: "normal",
      budgetType: "negotiable",
      budgetAmount: "",
      dueDate: "",
      userId: "",
    });
    setModalOpen(true);
  };

  const handleEdit = (task) => {
    setCurrentTask(task);
    setFormData({
      title: task.title || "",
      description: task.description || "",
      category: task.category || "",
      subcategory: task.subcategory || "",
      city: task.city || "",
      status: task.status || "OPEN",
      urgency: task.urgency || "normal",
      budgetType: task.budgetType || "negotiable",
      budgetAmount: task.budgetAmount || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "",
      userId: task.userId || ""
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("tasks.confirmDelete"))) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      fetchTasks();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleSubmit = async () => {
    const url = currentTask ? `/api/tasks/${currentTask.id}` : "/api/tasks";
    const method = currentTask ? "PUT" : "POST";
    const body = { ...formData };

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || res.statusText);
      }
      setModalOpen(false);
      fetchTasks();
    } catch (e) {
      alert(e.message);
    }
  };

  const COLUMNS = [
    {
      Header: t("tasks.colTask"),
      accessor: "title",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 dark:text-white capitalize">{row?.cell?.value}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{row?.row?.original?.description}</span>
        </div>
      ),
    },
    {
      Header: t("tasks.colCategory"),
      accessor: "category",
      Cell: (row) => <span className="text-sm text-slate-600 dark:text-slate-300">{row?.cell?.value}</span>,
    },
    {
      Header: t("tasks.colBudget"),
      accessor: "budgetAmountNum",
      Cell: (row) => {
        const num = row?.cell?.value;
        const str = row?.row?.original?.budgetAmount;
        const type = row?.row?.original?.budgetType;
        if (type === "negotiable") return <span className="text-xs text-slate-400">{t("tasks.budgetType.negotiable")}</span>;
        return (
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {num != null ? `${num.toLocaleString()} TJS` : str ?? "—"}
          </span>
        );
      },
    },
    {
      Header: t("tasks.colUrgency"),
      accessor: "urgency",
      Cell: (row) => {
        const u = row?.cell?.value || "normal";
        const cls = u === "urgent" ? "bg-danger-500/10 text-danger-500" :
          u === "low" ? "bg-slate-500/10 text-slate-500" :
            "bg-info-500/10 text-info-500";
        return <span className={`badge ${cls} capitalize`}>{t(`tasks.urgency.${u}`)}</span>;
      },
    },
    {
      Header: t("common.status"),
      accessor: "status",
      Cell: (row) => {
        const status = row?.cell?.value;
        const badgeClass = status === "COMPLETED" ? "bg-success-500/10 text-success-500" :
          status === "IN_PROGRESS" ? "bg-warning-500/10 text-warning-500" :
            status === "CANCELLED" ? "bg-danger-500/10 text-danger-500" :
              "bg-primary-500/10 text-primary-500";
        return <span className={`badge ${badgeClass}`}>{status && t(`tasks.status.${status.toLowerCase()}`)}</span>;
      },
    },
    {
      Header: t("tasks.colAuthor"),
      accessor: "user.fullName",
      Cell: (row) => (
        <div className="flex flex-col">
          <span className="text-sm text-slate-600 dark:text-slate-300">{row?.cell?.value || t("tasks.unknownAuthor")}</span>
          <span className="text-xs text-slate-500">{row?.row?.original?.user?.email}</span>
        </div>
      ),
    },
    {
      Header: t("common.actions"),
      accessor: "action",
      Cell: (row) => (
        <div className="flex space-x-3 rtl:space-x-reverse">
          <Tooltip content={t("common.edit")} placement="top" arrow animation="shift-away">
            <button className="action-btn" type="button" onClick={() => handleEdit(row.row.original)}>
              <Icon icon="heroicons:pencil-square" />
            </button>
          </Tooltip>
          <Tooltip content={t("common.delete")} placement="top" arrow animation="shift-away" theme="danger">
            <button className="action-btn" type="button" onClick={() => handleDelete(row.row.original.id)}>
              <Icon icon="heroicons:trash" />
            </button>
          </Tooltip>
        </div>
      ),
    },
  ];

  const columns = useMemo(() => COLUMNS, [locale]);
  const data = useMemo(() => tasks, [tasks]);

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
    if (!confirm(t("tasks.confirmBulkDelete", { count: ids.length }))) return;
    const failed = await bulkDelete("/api/tasks", ids);
    if (failed.length) {
      alert(`${t("tasks.bulkDeleteFailed", { failed: failed.length, total: ids.length })}\n${failed.join("\n")}`);
    }
    toggleAllRowsSelected(false);
    fetchTasks();
  };

  return (
    <div>
      <HomeBredCurbs title={t("tasks.title")} />
      <Card noborder>
        <div className="md:flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Button text={t("tasks.addTask")} className="btn-success btn-sm" onClick={handleCreate} />
            {selectedFlatRows.length > 0 && (
              <Button
                text={t("common.deleteSelected", { count: selectedFlatRows.length })}
                className="btn-danger btn-sm"
                onClick={handleBulkDelete}
              />
            )}
            <button
              className="btn btn-sm btn-outline-dark"
              onClick={() => exportCsv("tasks.csv", tasks.map((t) => ({
                id: t.id, title: t.title, category: t.category, status: t.status,
                urgency: t.urgency, budgetType: t.budgetType, budgetAmount: t.budgetAmountNum ?? t.budgetAmount ?? "",
                city: t.city, createdAt: t.createdAt, user: t.user?.email || "",
              })))}
            >
              {t("common.exportCsv")}
            </button>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <input
                type="text"
                className="form-control py-2"
                placeholder={t("tasks.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setSearchQ(searchInput.trim())}
              />
              <button className="btn btn-sm btn-dark" onClick={() => setSearchQ(searchInput.trim())}>{t("common.search")}</button>
              {searchQ && <button className="btn btn-sm btn-outline-dark" onClick={() => { setSearchQ(""); setSearchInput(""); }}>{t("tasks.clear")}</button>}
            </div>
            <select
              className="form-control py-2 w-max"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">{t("tasks.allStatuses")}</option>
              <option value="OPEN">{t("tasks.status.open")}</option>
              <option value="IN_PROGRESS">{t("tasks.status.in_progress")}</option>
              <option value="COMPLETED">{t("tasks.status.completed")}</option>
              <option value="CANCELLED">{t("tasks.status.cancelled")}</option>
            </select>
            <select
              className="form-control py-2 w-max"
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
            >
              <option value="">{t("tasks.allUrgency")}</option>
              <option value="low">{t("tasks.urgency.low")}</option>
              <option value="normal">{t("tasks.urgency.normal")}</option>
              <option value="urgent">{t("tasks.urgency.urgent")}</option>
            </select>
            <select
              className="form-control py-2 w-max"
              value={sortFilter}
              onChange={(e) => setSortFilter(e.target.value)}
            >
              <option value="newest">{t("tasks.sortNewest")}</option>
              <option value="oldest">{t("tasks.sortOldest")}</option>
              <option value="budget-high">{t("tasks.sortBudgetHigh")}</option>
              <option value="budget-low">{t("tasks.sortBudgetLow")}</option>
            </select>
            <div className="flex items-center gap-2">
              <input type="date" className="form-control py-2" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title={t("tasks.fromDate")} />
              <span className="text-slate-400 text-sm">–</span>
              <input type="date" className="form-control py-2" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title={t("tasks.toDate")} />
              {(dateFrom || dateTo) && (
                <button className="btn btn-sm btn-outline-dark" onClick={() => { setDateFrom(""); setDateTo(""); }}>{t("tasks.clear")}</button>
              )}
            </div>
            <GlobalFilter filter={globalFilter} setFilter={setGlobalFilter} />
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : (
          <>
            <div className="overflow-x-auto -mx-6">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden ">
                  <table
                    className="min-w-full divide-y divide-slate-100 table-fixed dark:divide-slate-700"
                    {...getTableProps()}
                  >
                    <thead className="bg-slate-200 dark:bg-slate-700">
                      {headerGroups.map((headerGroup) => {
                        const { key, ...restHeaderGroupProps } = headerGroup.getHeaderGroupProps();
                        return (
                          <tr key={key} {...restHeaderGroupProps}>
                            {headerGroup.headers.map((column) => {
                              const { key, ...restColumn } = column.getHeaderProps(column.getSortByToggleProps());
                              return (
                                <th
                                  key={key}
                                  {...restColumn}
                                  scope="col"
                                  className=" table-th "
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
                      {page.map((row) => {
                        prepareRow(row);
                        const { key, ...restRowProps } = row.getRowProps();
                        return (
                          <tr key={key} {...restRowProps}>
                            {row.cells.map((cell) => {
                              const { key, ...restCellProps } = cell.getCellProps();
                              return (
                                <td
                                  key={key}
                                  {...restCellProps}
                                  className="table-td"
                                >
                                  {cell.render("Cell")}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="md:flex md:space-y-0 space-y-5 justify-between mt-6 items-center">
              <div className=" flex items-center space-x-3 rtl:space-x-reverse">
                <select
                  className="form-control py-2 w-max"
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                >
                  {[10, 25, 50, 100].map((pageSize) => (
                    <option key={pageSize} value={pageSize}>
                      {t("common.show", { n: pageSize })}
                    </option>
                  ))}
                </select>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {t("common.pageOf", { page: pageIndex + 1, total: pageOptions.length })}
                </span>
              </div>
              <ul className="flex items-center  space-x-3  rtl:space-x-reverse flex-wrap">
                <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    className={` ${!canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    onClick={() => gotoPage(0)}
                    disabled={!canPreviousPage}
                  >
                    <Icon icon="heroicons:chevron-double-left-solid" />
                  </button>
                </li>
                <li className="text-sm leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    className={` ${!canPreviousPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    onClick={() => previousPage()}
                    disabled={!canPreviousPage}
                  >
                    {t("common.prev")}
                  </button>
                </li>
                {pageOptions.map((page, pageIdx) => (
                  <li key={pageIdx}>
                    <button
                      href="#"
                      aria-current="page"
                      className={` ${pageIdx === pageIndex
                          ? "bg-slate-900 dark:bg-slate-600  dark:text-slate-200 text-white font-medium "
                          : "bg-slate-100 dark:bg-slate-700 dark:text-slate-400 text-slate-900  font-normal  "
                        }    text-sm rounded leading-[16px] flex h-6 w-6 items-center justify-center transition-all duration-150`}
                      onClick={() => gotoPage(pageIdx)}
                    >
                      {page + 1}
                    </button>
                  </li>
                ))}
                <li className="text-sm leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    className={` ${!canNextPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    onClick={() => nextPage()}
                    disabled={!canNextPage}
                  >
                    {t("common.next")}
                  </button>
                </li>
                <li className="text-xl leading-4 text-slate-900 dark:text-white rtl:rotate-180">
                  <button
                    onClick={() => gotoPage(pageCount - 1)}
                    disabled={!canNextPage}
                    className={` ${!canNextPage ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    <Icon icon="heroicons:chevron-double-right-solid" />
                  </button>
                </li>
              </ul>
            </div>
          </>
        )}
      </Card>

      <Modal
        activeModal={modalOpen}
        onClose={() => setModalOpen(false)}
        title={currentTask ? t("tasks.editTask") : t("tasks.addTask")}
        footerContent={
          <Button
            text={currentTask ? t("common.update") : t("common.create")}
            className="btn-dark"
            onClick={handleSubmit}
          />
        }
      >
        <div className="space-y-4">
          <Textinput
            label={t("tasks.fieldTitle")}
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={t("tasks.titlePlaceholder")}
          />
          <Textarea
            label={t("tasks.fieldDescription")}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder={t("tasks.descriptionPlaceholder")}
          />
          <Textinput
            label={t("tasks.fieldCategory")}
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })}
            placeholder={t("tasks.categoryPlaceholder")}
          />
          {categories?.length > 0 && (
            <Select
              label={t("tasks.categoryPick")}
              options={categories.map((c) => c.name)}
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: "" })}
            />
          )}
          {(() => {
            const cat = categories.find((c) => c.name === formData.category || c.slug === formData.category);
            if (!cat?.subcategories) return null;
            let subs = [];
            try { subs = JSON.parse(cat.subcategories) || []; } catch { subs = []; }
            if (!Array.isArray(subs) || subs.length === 0) return null;
            return (
              <Select
                label={t("tasks.fieldSubcategory")}
                options={subs}
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
              />
            );
          })()}
          <Textinput
            label={t("tasks.fieldCity")}
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder={t("tasks.fieldCity")}
          />
          <Textinput
            label={t("tasks.fieldBudgetAmount")}
            value={formData.budgetAmount}
            onChange={(e) => setFormData({ ...formData, budgetAmount: e.target.value })}
            placeholder={t("tasks.budgetAmountPlaceholder")}
          />
          <Select
            label={t("common.status")}
            options={[
              { value: "OPEN", label: t("tasks.status.open") },
              { value: "IN_PROGRESS", label: t("tasks.status.in_progress") },
              { value: "COMPLETED", label: t("tasks.status.completed") },
              { value: "CANCELLED", label: t("tasks.status.cancelled") },
            ]}
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          />
          <Select
            label={t("tasks.fieldUrgency")}
            options={[
              { value: "low", label: t("tasks.urgency.low") },
              { value: "normal", label: t("tasks.urgency.normal") },
              { value: "urgent", label: t("tasks.urgency.urgent") },
            ]}
            value={formData.urgency}
            onChange={(e) => setFormData({ ...formData, urgency: e.target.value })}
          />
          <Select
            label={t("tasks.fieldBudgetType")}
            options={[
              { value: "fixed", label: t("tasks.budgetType.fixed") },
              { value: "negotiable", label: t("tasks.budgetType.negotiable") },
            ]}
            value={formData.budgetType}
            onChange={(e) => setFormData({ ...formData, budgetType: e.target.value })}
          />
          <Textinput
            label={t("tasks.fieldDueDate")}
            type="date"
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />
          <Textinput
            label={t("tasks.fieldUserId")}
            value={formData.userId}
            onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
            placeholder="cuid..."
          />
        </div>
      </Modal>
    </div>
  );
}
