"use client";

import React, { useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";
import ReportStatus from "./ReportStatus";

// Chrome ships without Tajik locale data and silently falls back to English,
// so when it's missing we format like Russian (same number/time conventions)
// and spell out Tajik month names ourselves.
const HAS_TG = typeof Intl !== "undefined" && Intl.DateTimeFormat.supportedLocalesOf(["tg-TJ"]).length > 0;
const TG_MONTHS = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
const tgFallback = (locale) => locale === "tg" && !HAS_TG;

/** Maps the app's language ("ru" / "tg") to a formatting locale the browser actually supports. */
export const dateLocale = (locale) =>
  locale === "tg" ? (HAS_TG ? "tg-TJ" : "ru-RU") : locale === "ru" ? "ru-RU" : undefined;

/** Pass the app's `locale` so dates match the UI language, not the browser's. */
export const fmtDate = (v, withTime = true, locale) => {
  if (!v) return "—";
  const d = new Date(v);
  if (tgFallback(locale)) {
    const day = `${String(d.getDate()).padStart(2, "0")} ${TG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return withTime ? `${day}, ${d.toLocaleTimeString("ru-RU", { timeStyle: "short" })}` : day;
  }
  return d.toLocaleString(dateLocale(locale), withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" });
};

/** 12345.5 -> "12 345,5" in the app's language. */
export const fmtNum = (n, locale) => Number(n || 0).toLocaleString(dateLocale(locale));

/** "2026-11" -> "нояб. 26" in the app's language (dashboard chart axis). */
export const fmtMonth = (key, locale) => {
  const [y, m] = String(key).split("-").map(Number);
  if (!y || !m) return key;
  if (tgFallback(locale)) return `${TG_MONTHS[m - 1]} ${String(y).slice(-2)}`;
  return new Date(y, m - 1, 1).toLocaleDateString(dateLocale(locale), { month: "short", year: "2-digit" });
};

/** A label/value row in a detail card. */
export function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-slate-400">{label}</span>
      <span className="text-sm text-slate-700 dark:text-slate-200 break-words">{children ?? "—"}</span>
    </div>
  );
}

/** A card listing related records, with a count and an optional "see all" link. */
export function Section({ title, count, allHref, empty, children }) {
  const { t } = useTranslation();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {title}
          {typeof count === "number" && <span className="badge bg-slate-500/10 text-slate-500">{count}</span>}
        </span>
      }
      headerslot={
        allHref && count > 0 ? (
          <Link href={allHref} className="text-sm text-primary-500 hover:underline">
            {t("detail.seeAll")}
          </Link>
        ) : null
      }
    >
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty || t("detail.none")}</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700 -my-3">{items}</ul>
      )}
    </Card>
  );
}

export function Row({ children }) {
  return <li className="py-3 flex items-start justify-between gap-4">{children}</li>;
}

const TASK_STATUS_CLASS = {
  OPEN: "bg-primary-500/10 text-primary-500",
  IN_PROGRESS: "bg-warning-500/10 text-warning-500",
  COMPLETED: "bg-success-500/10 text-success-500",
  CANCELLED: "bg-danger-500/10 text-danger-500",
};

export function TaskStatus({ status, className = "" }) {
  const { t } = useTranslation();
  if (!status) return null;
  return (
    <span className={`badge ${TASK_STATUS_CLASS[status] || "bg-slate-500/10 text-slate-500"} ${className}`}>
      {TASK_STATUS_CLASS[status] ? t(`tasks.status.${status.toLowerCase()}`) : status}
    </span>
  );
}

export const ROLE_KEYS = { CUSTOMER: "users.roleCustomer", PROVIDER: "users.roleProvider", ADMIN: "users.roleAdmin" };

const ROLE_CLASS = {
  CUSTOMER: "bg-primary-500/10 text-primary-500",
  PROVIDER: "bg-success-500/10 text-success-500",
  ADMIN: "bg-warning-500/10 text-warning-500",
};

export function RoleBadge({ role, className = "" }) {
  const { t } = useTranslation();
  if (!role) return null;
  return (
    <span className={`badge ${ROLE_CLASS[role] || "bg-slate-500/10 text-slate-500"} ${className}`}>
      {ROLE_KEYS[role] ? t(ROLE_KEYS[role]) : role}
    </span>
  );
}

export function PersonLink({ person }) {
  if (!person) return <span className="text-slate-400">—</span>;
  return (
    <Link href={`/admin/users/${person.id}`} className="hover:text-primary-500">
      <span className="text-sm font-medium text-slate-900 dark:text-white">{person.fullName}</span>
      {person.email && <span className="text-xs text-slate-500 ltr:ml-2 rtl:mr-2">{person.email}</span>}
    </Link>
  );
}

/** Complaints with inline resolve / dismiss / reopen. Calls onChange after a status change. */
export function ComplaintRows({ reports, onChange }) {
  const { t, locale } = useTranslation();
  const [busy, setBusy] = useState(null);

  const setStatus = async (id, status) => {
    setBusy(id);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      toast.success(t(`reports.done.${status}`));
      onChange?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  return reports.map((r) => (
    <Row key={r.id}>
      <div className="min-w-0">
        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{r.reason}</p>
        <p className="text-xs text-slate-500 mt-1">
          {t("reports.reporter")}: <PersonLink person={r.reporter} /> · {fmtDate(r.createdAt, true, locale)}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ReportStatus status={r.status} />
        {r.status === "OPEN" ? (
          <>
            <button className="action-btn text-success-500" title={t("reports.resolve")} disabled={busy === r.id} onClick={() => setStatus(r.id, "RESOLVED")}>
              <Icon icon="heroicons:check" />
            </button>
            <button className="action-btn" title={t("reports.dismiss")} disabled={busy === r.id} onClick={() => setStatus(r.id, "DISMISSED")}>
              <Icon icon="heroicons:x-mark" />
            </button>
          </>
        ) : (
          <button className="action-btn" title={t("reports.reopen")} disabled={busy === r.id} onClick={() => setStatus(r.id, "OPEN")}>
            <Icon icon="heroicons:arrow-uturn-left" />
          </button>
        )}
      </div>
    </Row>
  ));
}

/** Loading / error / not-found states shared by the detail pages. */
export function DetailState({ loading, error, backHref, backLabel }) {
  const { t } = useTranslation();
  if (loading) return <div className="p-6 text-center text-slate-500">{t("common.loading")}</div>;
  return (
    <Card>
      <p className="text-danger-500 mb-4">{error}</p>
      <Link href={backHref} className="btn btn-sm btn-outline-dark">
        {backLabel}
      </Link>
    </Card>
  );
}
