"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUrlFilter, UrlFilterChip } from "@/components/partials/admin/UrlFilter";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import DataTable from "@/components/partials/table/DataTable";
import TablePagination from "@/components/partials/table/TablePagination";
import useServerTable from "@/hooks/useServerTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { exportCsv } from "@/lib/exportCsv";
import { fetchAllRows } from "@/lib/listClient";
import { bulkDelete } from "@/lib/bulkDelete";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";

const MAX_FEATURED = 3;

export default function AdminTasks() {
  const { t, locale } = useTranslation();
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams?.get("status") || "");
  const [urgencyFilter, setUrgencyFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("newest");
  const [searchInput, setSearchInput] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const q = useDebouncedValue(searchInput.trim());
  const userIdFilter = useUrlFilter("userId");
  const params = useMemo(
    () => ({
      status: statusFilter,
      urgency: urgencyFilter,
      sort: sortFilter,
      q,
      from: dateFrom,
      to: dateTo,
      featured: featuredOnly ? "true" : "",
      userId: userIdFilter,
    }),
    [statusFilter, urgencyFilter, sortFilter, q, dateFrom, dateTo, featuredOnly, userIdFilter]
  );

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
  useEffect(() => {
    const statusFromUrl = searchParams?.get("status");
    if (statusFromUrl) setStatusFilter(statusFromUrl);
  }, [searchParams]);

  const send = async (url, method, body) => {
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      return json;
    } catch (e) {
      toast.error(e.message);
      return null;
    }
  };

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
    if (await send(`/api/tasks/${id}`, "DELETE")) reload();
  };

  const toggleFeatured = async (task) => {
    const turningOn = !task.featured;
    if (turningOn && task.status !== "OPEN" && !confirm(t("tasks.featureNotOpenHint"))) return;
    if (await send(`/api/tasks/${task.id}/featured`, "PATCH", { featured: turningOn })) reload();
  };

  const handleSubmit = async () => {
    const url = currentTask ? `/api/tasks/${currentTask.id}` : "/api/tasks";
    const method = currentTask ? "PUT" : "POST";
    setSaving(true);
    const ok = await send(url, method, { ...formData });
    setSaving(false);
    if (ok) {
      setModalOpen(false);
      reload();
    }
  };

  // Site-wide count from the API (the cap covers all tasks, not just this page).
  const [featuredCount, setFeaturedCount] = useState(0);

  const COLUMNS = [
    {
      Header: t("tasks.colTask"),
      accessor: "title",
      Cell: (row) => (
        <Link href={`/admin/tasks/${row.row.original.id}`} className="flex flex-col group">
          <span className="font-medium text-slate-900 dark:text-white capitalize group-hover:text-primary-500">{row?.cell?.value}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{row?.row?.original?.description}</span>
        </Link>
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
        <Link href={`/admin/users/${row?.row?.original?.userId}`} className="flex flex-col group">
          <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-primary-500">{row?.cell?.value || t("tasks.unknownAuthor")}</span>
          <span className="text-xs text-slate-500">{row?.row?.original?.user?.email}</span>
        </Link>
      ),
    },
    {
      Header: t("tasks.colFeatured"),
      accessor: "featured",
      Cell: (row) => {
        const task = row?.row?.original;
        const isOn = !!task?.featured;
        const atCap = !isOn && featuredCount >= MAX_FEATURED;
        return (
          <Tooltip
            content={isOn ? t("tasks.unfeature") : atCap ? t("tasks.featureCapReached") : t("tasks.feature")}
            placement="top"
            arrow
          >
            <button
              type="button"
              className="action-btn"
              disabled={atCap}
              onClick={() => toggleFeatured(task)}
            >
              <Icon
                icon={isOn ? "heroicons:star-solid" : "heroicons:star"}
                className={isOn ? "text-warning-500" : atCap ? "opacity-30" : ""}
              />
            </button>
          </Tooltip>
        );
      },
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale, featuredCount]);
  const { table, total, meta, loading, loaded, error, reload, sortBy } = useServerTable({
    endpoint: "/api/tasks",
    params,
    columns,
    sortable: ["title", "category", "budgetAmountNum", "urgency", "status", "featured"],
    selectable: true,
  });
  const { selectedFlatRows, toggleAllRowsSelected, setSortBy } = table;
  useEffect(() => {
    if (typeof meta.featuredCount === "number") setFeaturedCount(meta.featuredCount);
  }, [meta.featuredCount]);

  const handleBulkDelete = async () => {
    const ids = selectedFlatRows.map((r) => r.original.id);
    if (!ids.length) return;
    if (!confirm(t("tasks.confirmBulkDelete", { count: ids.length }))) return;
    const failed = await bulkDelete("/api/tasks", ids);
    if (failed.length) {
      toast.error(`${t("tasks.bulkDeleteFailed", { failed: failed.length, total: ids.length })}\n${failed.join("\n")}`);
    }
    toggleAllRowsSelected(false);
    reload();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllRows("/api/tasks", params, sortBy);
      exportCsv("tasks.csv", rows.map((x) => ({
        id: x.id, title: x.title, category: x.category, status: x.status,
        urgency: x.urgency, budgetType: x.budgetType, budgetAmount: x.budgetAmountNum ?? x.budgetAmount ?? "",
        city: x.city, createdAt: x.createdAt, user: x.user?.email || "",
      })));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
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
            <button className="btn btn-sm btn-outline-dark" onClick={handleExport} disabled={exporting || total === 0}>
              {exporting ? t("common.loading") : t("common.exportCsv")}
            </button>
            <span className="text-xs text-slate-400">
              {t("tasks.featuredCount", { count: featuredCount, max: MAX_FEATURED })}
            </span>
            {userIdFilter && <UrlFilterChip label={t("detail.filteredByUser")} />}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <input
                type="text"
                className="form-control py-2"
                placeholder={t("tasks.searchPlaceholder")}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button className="btn btn-sm btn-outline-dark" onClick={() => setSearchInput("")}>
                  {t("tasks.clear")}
                </button>
              )}
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
              onChange={(e) => {
                setSortFilter(e.target.value);
                setSortBy([]); // the dropdown replaces any column-header sort
              }}
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
            <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={featuredOnly}
                onChange={(e) => setFeaturedOnly(e.target.checked)}
              />
              {t("tasks.featuredOnly")}
            </label>
          </div>
        </div>
        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error}
          </p>
        )}
        <DataTable table={table} loading={loading} loaded={loaded} emptyText={t("common.noResult")} skeletonCols={8} />
        <TablePagination table={table} total={total} />
      </Card>

      <Modal
        activeModal={modalOpen}
        onClose={() => setModalOpen(false)}
        title={currentTask ? t("tasks.editTask") : t("tasks.addTask")}
        footerContent={
          <Button
            text={currentTask ? t("common.update") : t("common.create")}
            className="btn-dark"
            isLoading={saving}
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
