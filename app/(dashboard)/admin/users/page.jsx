"use client";

import React, { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Modal from "@/components/ui/Modal";
import Textinput from "@/components/ui/Textinput";
import Select from "@/components/ui/Select";
import Checkbox from "@/components/ui/Checkbox";
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

const ROLE_KEYS = {
  CUSTOMER: "users.roleCustomer",
  PROVIDER: "users.roleProvider",
  ADMIN: "users.roleAdmin",
};

export default function AdminUsers() {
  const { t, locale } = useTranslation();
  const [roleFilter, setRoleFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [docsModal, setDocsModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const q = useDebouncedValue(userSearch.trim());
  const params = useMemo(
    () => ({ role: roleFilter, verified: verifiedFilter, q }),
    [roleFilter, verifiedFilter, q]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", role: "CUSTOMER", isVerified: false, phone: "", balance: "" });

  // Sends a request and surfaces the API's error message; returns the parsed body or null.
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

  const handleCreate = () => {
    setCurrentUser(null);
    setFormData({ fullName: "", email: "", password: "", role: "CUSTOMER", isVerified: false, phone: "", balance: "" });
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setCurrentUser(user);
    setFormData({
      fullName: user.fullName || "",
      email: user.email || "",
      password: "",
      role: user.role || "CUSTOMER",
      isVerified: !!user.isVerified,
      phone: user.phone || "",
      balance: user.balance ?? "",
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm(t("users.confirmDelete"))) return;
    if (await send(`/api/users/${id}`, "DELETE")) reload();
  };

  const handleUnlock = async (id) => {
    if (await send(`/api/users/${id}`, "PUT", { unlock: true })) reload();
  };

  const setVerified = async (user, isVerified) => {
    if (await send(`/api/users/${user.id}`, "PUT", { isVerified })) {
      setDocsModal(null);
      reload();
    }
  };

  const handleSubmit = async () => {
    const url = currentUser ? `/api/users/${currentUser.id}` : "/api/users";
    const method = currentUser ? "PUT" : "POST";
    const body = { ...formData };
    if (currentUser && !body.password) delete body.password;
    if (body.balance === "" || body.balance === null) delete body.balance;

    setSaving(true);
    const ok = await send(url, method, body);
    setSaving(false);
    if (ok) {
      setModalOpen(false);
      reload();
    }
  };

  const COLUMNS = [
    {
      Header: t("common.user"),
      accessor: "fullName",
      Cell: (row) => (
        <div>
          <span className="inline-flex items-center">
            <span className="w-7 h-7 rounded-full ltr:mr-3 rtl:ml-3 flex-none bg-slate-600">
              <span className="text-white text-xs flex w-full h-full justify-center items-center">
                {row?.cell?.value?.charAt(0)}
              </span>
            </span>
            <div className="flex flex-col">
              <span className="text-sm text-slate-600 dark:text-slate-300 capitalize">{row?.cell?.value}</span>
              <span className="text-xs text-slate-500">{row?.row?.original?.email}</span>
            </div>
          </span>
        </div>
      ),
    },
    {
      Header: t("users.role"),
      accessor: "role",
      Cell: (row) => (
        <span className="badge bg-primary-500/10 text-primary-500">
          {ROLE_KEYS[row?.cell?.value] ? t(ROLE_KEYS[row.cell.value]) : row?.cell?.value}
        </span>
      ),
    },
    {
      Header: t("common.status"),
      accessor: "isVerified",
      Cell: (row) => {
        const user = row?.row?.original;
        const isLocked = user?.lockedUntil && new Date(user.lockedUntil) > new Date();
        return (
          <div className="flex flex-col gap-1">
            {row?.cell?.value ? (
              <span className="text-success-500 text-xs">{t("users.verified")}</span>
            ) : (
              <span className="text-slate-400 text-xs">{t("users.unverified")}</span>
            )}
            {user?.googleId && <span className="text-xs text-info-500">Google</span>}
            {user?.appleId && <span className="text-xs text-slate-500">Apple</span>}
            {isLocked && (
              <span className="text-danger-500 text-xs font-medium">
                {t("users.lockedAttempts", { count: user.loginAttempts })}
              </span>
            )}
          </div>
        );
      },
    },
    {
      Header: t("users.tasksResponses"),
      accessor: "id",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300">
          {t("users.tasksResponsesCount", {
            tasks: row?.row?.original?._count?.tasks ?? 0,
            responses: row?.row?.original?._count?.responses ?? 0,
          })}
        </span>
      ),
      disableSortBy: true,
    },
    {
      Header: t("users.balanceTjs"),
      accessor: "balance",
      Cell: (row) => (
        <span className={`text-sm font-medium ${(row?.cell?.value || 0) > 0 ? "text-success-500" : "text-slate-500"}`}>
          {(row?.cell?.value || 0).toLocaleString()} TJS
        </span>
      ),
    },
    {
      Header: t("common.actions"),
      accessor: "action",
      Cell: (row) => {
        const user = row?.row?.original;
        const isLocked = user?.lockedUntil && new Date(user.lockedUntil) > new Date();
        return (
          <div className="flex space-x-3 rtl:space-x-reverse">
            <Tooltip content={t("common.edit")} placement="top" arrow animation="shift-away">
              <button className="action-btn" type="button" onClick={() => handleEdit(user)}>
                <Icon icon="heroicons:pencil-square" />
              </button>
            </Tooltip>
            {user?.verificationDocuments && (
              <Tooltip content={t("users.verificationDocs")} placement="top" arrow animation="shift-away">
                <button className="action-btn text-info-500" type="button" onClick={() => setDocsModal(user)}>
                  <Icon icon="heroicons:document-check" />
                </button>
              </Tooltip>
            )}
            {isLocked && (
              <Tooltip content={t("users.unlock")} placement="top" arrow animation="shift-away">
                <button className="action-btn text-warning-500" type="button" onClick={() => handleUnlock(user.id)}>
                  <Icon icon="heroicons:lock-open" />
                </button>
              </Tooltip>
            )}
            <Tooltip content={t("common.delete")} placement="top" arrow animation="shift-away" theme="danger">
              <button className="action-btn" type="button" onClick={() => handleDelete(user.id)}>
                <Icon icon="heroicons:trash" />
              </button>
            </Tooltip>
          </div>
        );
      },
    },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const columns = useMemo(() => COLUMNS, [locale]);
  const { table, total, loading, loaded, error, reload, sortBy } = useServerTable({
    endpoint: "/api/users",
    params,
    columns,
    sortable: ["fullName", "role", "isVerified", "balance"],
    selectable: true,
  });
  const { selectedFlatRows, toggleAllRowsSelected } = table;

  const handleBulkDelete = async () => {
    const ids = selectedFlatRows.map((r) => r.original.id);
    if (!ids.length) return;
    if (!confirm(t("users.confirmBulkDelete", { count: ids.length }))) return;
    const failed = await bulkDelete("/api/users", ids);
    if (failed.length) {
      toast.error(`${t("users.bulkDeleteFailed", { failed: failed.length, total: ids.length })}\n${failed.join("\n")}`);
    }
    toggleAllRowsSelected(false);
    reload();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const rows = await fetchAllRows("/api/users", params, sortBy);
      exportCsv("users.csv", rows.map((u) => ({
        id: u.id, fullName: u.fullName, email: u.email, role: u.role,
        phone: u.phone || "", isVerified: u.isVerified, balance: u.balance || 0,
        createdAt: u.createdAt,
      })));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <HomeBredCurbs title={t("users.title")} />
      <Card noborder>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button text={t("users.addUser")} className="btn-success btn-sm" onClick={handleCreate} />
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
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              className="form-control py-2"
              placeholder={t("users.searchPlaceholder")}
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />
            <select
              className="form-control py-2 w-max"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">{t("users.allRoles")}</option>
              <option value="CUSTOMER">{t("users.roleCustomer")}</option>
              <option value="PROVIDER">{t("users.roleProvider")}</option>
            </select>
            <select
              className="form-control py-2 w-max"
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
            >
              <option value="">{t("users.allVerification")}</option>
              <option value="true">{t("users.verified")}</option>
              <option value="false">{t("users.unverified")}</option>
            </select>
          </div>
        </div>
        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />
            {error}
          </p>
        )}
        <DataTable table={table} loading={loading} loaded={loaded} emptyText={t("common.noResult")} skeletonCols={7} />
        <TablePagination table={table} total={total} />
      </Card>

      <Modal
        activeModal={modalOpen}
        onClose={() => setModalOpen(false)}
        title={currentUser ? t("users.editUser") : t("users.addUser")}
        footerContent={
          <Button
            text={currentUser ? t("common.update") : t("common.create")}
            className="btn-dark"
            isLoading={saving}
            onClick={handleSubmit}
          />
        }
      >
        <div className="space-y-4">
          <Textinput
            label={t("users.fullName")}
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            placeholder={t("users.fullNamePlaceholder")}
          />
          <Textinput
            label={t("users.email")}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="user@example.com"
          />
          <Textinput
            label={currentUser ? t("users.passwordKeepBlank") : t("users.password")}
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            placeholder="******"
          />
          <Textinput
            label={t("users.phone")}
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1234567890"
          />
          <Select
            label={t("users.role")}
            // ADMIN is offered only for an account that already has it, so editing
            // the existing admin does not silently blank the select.
            options={(formData.role === "ADMIN" ? ["CUSTOMER", "PROVIDER", "ADMIN"] : ["CUSTOMER", "PROVIDER"]).map(
              (r) => ({ value: r, label: t(ROLE_KEYS[r]) })
            )}
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          />
          <Checkbox
            label={t("users.verifiedUser")}
            value={formData.isVerified}
            onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
          />
          {currentUser && (
            <Textinput
              label={t("users.balanceTjs")}
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="0"
            />
          )}
        </div>
      </Modal>

      <Modal
        activeModal={!!docsModal}
        onClose={() => setDocsModal(null)}
        title={`${t("users.verificationDocs")} — ${docsModal?.fullName ?? ""}`}
        className="max-w-2xl"
      >
        {docsModal && (() => {
          let docs = [];
          try { docs = JSON.parse(docsModal.verificationDocuments) || []; } catch { docs = []; }
          return docs.length === 0 ? (
            <p className="text-slate-500 text-sm">{t("users.noDocuments")}</p>
          ) : (
            <div className="space-y-3">
              {docs.map((url, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Icon icon="heroicons:document" className="text-slate-400 text-xl shrink-0" />
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-500 hover:underline truncate"
                  >
                    {url}
                  </a>
                </div>
              ))}
              <div className="flex gap-2 mt-4">
                <Button
                  text={t("users.approveProvider")}
                  className="btn-success btn-sm"
                  onClick={() => setVerified(docsModal, true)}
                />
                <Button
                  text={t("users.rejectUnverify")}
                  className="btn-danger btn-sm"
                  onClick={() => setVerified(docsModal, false)}
                />
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
