"use client";

import React, { useState, useMemo } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Checkbox from "@/components/ui/Checkbox";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import DataTable from "@/components/partials/table/DataTable";
import TablePagination from "@/components/partials/table/TablePagination";
import useServerTable from "@/hooks/useServerTable";
import useDebouncedValue from "@/hooks/useDebouncedValue";
import { useTranslation } from "@/context/LanguageContext";
import { useUrlFilter, UrlFilterChip } from "@/components/partials/admin/UrlFilter";
import { UserLink, TaskLink } from "@/components/partials/admin/Links";
import { toast } from "react-toastify";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { dateLocale } from "@/components/partials/admin/Detail";

const TYPE_KEYS = {
  SYSTEM: "notifications.typeSystem",
  TASK_UPDATE: "notifications.typeTaskUpdate",
  NEW_MESSAGE: "notifications.typeNewMessage",
  NEW_OFFER: "notifications.typeNewOffer",
  OFFER_ACCEPTED: "notifications.typeOfferAccepted",
};

export default function AdminNotifications() {
  const { t, locale } = useTranslation();
  const [unreadOnly, setUnreadOnly] = useState(false);

  // "Send notification" on a user's page links here with ?userId= to address it to them.
  const presetUserId = useUrlFilter("userId");
  const [sendForm, setSendForm] = useState({ title: "", message: "", type: "SYSTEM", link: "", userId: presetUserId });
  const [sending, setSending] = useState(false);
  const confirm = useConfirm();

  const handleSend = async () => {
    if (!sendForm.title.trim() || !sendForm.message.trim()) {
      toast.error(t("notifications.titleMessageRequired"));
      return;
    }
    if (!sendForm.userId.trim() && !(await confirm({ message: t("notifications.confirmBroadcast"), confirmText: t("notifications.broadcast"), danger: true }))) return;
    setSending(true);
    try {
      const body = { ...sendForm };
      if (!body.userId.trim()) delete body.userId;
      if (!body.link.trim()) delete body.link;
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      toast.success(t("notifications.sentTo", { count: data.sent }));
      setSendForm({ title: "", message: "", type: "SYSTEM", link: "", userId: "" });
      reload();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const params = useMemo(() => ({ unread: unreadOnly ? "true" : "", q }), [unreadOnly, q]);

  const COLUMNS = [
    {
      Header: t("common.user"),
      accessor: "user",
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
      Header: t("notifications.type"),
      accessor: "type",
      Cell: (row) => (
        <span className="badge bg-primary-500/10 text-primary-500 text-xs">
          {TYPE_KEYS[row?.cell?.value] ? t(TYPE_KEYS[row.cell.value]) : row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: t("notifications.titleLabel"),
      accessor: "title",
      Cell: (row) => (
        <span className="text-sm font-medium text-slate-900 dark:text-white">
          {row?.cell?.value ?? "—"}
        </span>
      ),
    },
    {
      Header: t("notifications.message"),
      accessor: "message",
      Cell: (row) => (
        <span className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2 max-w-[240px]">
          {row?.cell?.value || "—"}
        </span>
      ),
    },
    {
      Header: t("notifications.read"),
      accessor: "isRead",
      Cell: (row) =>
        row?.cell?.value ? (
          <span className="text-success-500 text-sm">{t("notifications.yes")}</span>
        ) : (
          <span className="text-warning-500 text-sm">{t("notifications.no")}</span>
        ),
    },
    {
      Header: t("common.date"),
      accessor: "createdAt",
      Cell: (row) => (
        <span className="text-sm text-slate-500">
          {row?.cell?.value
            ? new Date(row.cell.value).toLocaleString(dateLocale(locale), {
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
    endpoint: "/api/notifications",
    params,
    columns,
    sortable: ['type', 'isRead', 'createdAt'],
  });

  return (
    <div>
      <HomeBredCurbs title={t("notifications.title")} />

      <Card title={t("notifications.send")} className="mb-5">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("notifications.sendHint")}
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Textinput
            label={t("notifications.titleLabel")}
            value={sendForm.title}
            onChange={(e) => setSendForm({ ...sendForm, title: e.target.value })}
            placeholder={t("notifications.titlePlaceholder")}
          />
          <Select
            label={t("notifications.type")}
            options={Object.entries(TYPE_KEYS).map(([value, key]) => ({ value, label: t(key) }))}
            value={sendForm.type}
            onChange={(e) => setSendForm({ ...sendForm, type: e.target.value })}
          />
          <Textarea
            label={t("notifications.message")}
            value={sendForm.message}
            onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
            placeholder={t("notifications.messagePlaceholder")}
            className="sm:col-span-2"
          />
          <Textinput
            label={t("notifications.link")}
            value={sendForm.link}
            onChange={(e) => setSendForm({ ...sendForm, link: e.target.value })}
            placeholder={t("notifications.linkPlaceholder")}
          />
          <Textinput
            label={t("notifications.userId")}
            value={sendForm.userId}
            onChange={(e) => setSendForm({ ...sendForm, userId: e.target.value })}
            placeholder={t("notifications.userIdPlaceholder")}
          />
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Button
            text={sendForm.userId.trim() ? t("notifications.sendToUser") : t("notifications.broadcast")}
            className="btn-dark btn-sm"
            onClick={handleSend}
            disabled={sending}
          />
          {!sendForm.userId.trim() && (
            <span className="text-xs text-warning-500 flex items-center gap-1">
              <Icon icon="heroicons-outline:exclamation-triangle" />
              {t("notifications.broadcastWarning")}
            </span>
          )}
        </div>
      </Card>

      <Card title={t("notifications.platform")} noborder>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("notifications.platformHint")}
        </p>
        <div className="md:flex justify-between items-center mb-6 gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Checkbox
              label={t("notifications.unreadOnly")}
              value={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
            />
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
