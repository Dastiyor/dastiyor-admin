"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";
import { useConfirm } from "@/components/ui/ConfirmDialog";
import { isHttpUrl } from "@/lib/safeUrl";
import {
  Field,
  Section,
  Row,
  TaskStatus,
  PersonLink,
  ComplaintRows,
  DetailState,
  fmtDate,
  fmtNum,
} from "@/components/partials/admin/Detail";

const STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"];

function parseImages(raw) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v.filter(isHttpUrl) : [];
  } catch {
    return [];
  }
}

export default function TaskDetail() {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();
  const { id } = useParams();
  const router = useRouter();
  const [task, setTask] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${id}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      setTask(json);
      setStatus(json.status);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const call = async (url, method, body, okMsg) => {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      if (okMsg) toast.success(okMsg);
      return json;
    } catch (e) {
      toast.error(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const saveStatus = async () => {
    if (await call(`/api/tasks/${id}`, "PUT", { status }, t("detail.saved"))) load();
  };

  const toggleFeatured = async () => {
    if (!task.featured && task.status !== "OPEN" && !(await confirm({ message: t("tasks.featureNotOpenHint") }))) return;
    if (await call(`/api/tasks/${id}/featured`, "PATCH", { featured: !task.featured }, t("detail.saved"))) load();
  };

  const toggleReview = async () => {
    const r = task.review;
    if (await call(`/api/reviews/${r.id}`, "PATCH", { hidden: !r.hidden }, t("detail.saved"))) load();
  };

  const remove = async () => {
    if (!(await confirm({ message: t("tasks.confirmDelete"), confirmText: t("common.delete"), danger: true }))) return;
    if (await call(`/api/tasks/${id}`, "DELETE", null, t("detail.deleted"))) router.push("/admin/tasks");
  };

  if (!task) {
    return <DetailState loading={!error} error={error} backHref="/admin/tasks" backLabel={t("detail.backToTasks")} />;
  }

  const images = parseImages(task.images);
  const budget =
    task.budgetType === "negotiable"
      ? t("tasks.budgetType.negotiable")
      : task.budgetAmountNum != null
        ? `${fmtNum(task.budgetAmountNum, locale)} TJS`
        : task.budgetAmount || "—";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/tasks" className="text-slate-500 hover:text-primary-500 inline-flex items-center gap-1">
          <Icon icon="heroicons:arrow-left" className="rtl:rotate-180" />
          {t("detail.backToTasks")}
        </Link>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xl font-medium text-slate-900 dark:text-white">{task.title}</h4>
          <TaskStatus status={task.status} />
          {task.featured && (
            <span className="badge bg-warning-500/10 text-warning-500 inline-flex items-center gap-1">
              <Icon icon="heroicons:star-solid" /> {t("detail.featured")}
            </span>
          )}
          {task.reports.some((r) => r.status === "OPEN") && (
            <span className="badge bg-danger-500/10 text-danger-500">
              {t("detail.complaintsBadge", { count: task.reports.filter((r) => r.status === "OPEN").length })}
            </span>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <Field label={t("tasks.colAuthor")}><PersonLink person={task.user} /></Field>
          <Field label={t("detail.assignee")}><PersonLink person={task.assignedUser} /></Field>
          <Field label={t("tasks.colCategory")}>
            {task.category}
            {task.subcategory ? ` / ${task.subcategory}` : ""}
          </Field>
          <Field label={t("tasks.colBudget")}>{budget}</Field>
          <Field label={t("tasks.fieldCity")}>
            {task.city}
            {task.address ? `, ${task.address}` : ""}
          </Field>
          <Field label={t("tasks.colUrgency")}>{t(`tasks.urgency.${task.urgency || "normal"}`)}</Field>
          <Field label={t("tasks.fieldDueDate")}>{fmtDate(task.dueDate, false, locale)}</Field>
          <Field label={t("detail.created")}>{fmtDate(task.createdAt, true, locale)}</Field>
          <Field label={t("detail.messages")}>{task._count.messages}</Field>
          <Field label={t("detail.favorites")}>{task._count.favorites}</Field>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-200 mt-5 whitespace-pre-wrap bg-slate-50 dark:bg-slate-700 rounded p-4">
          {task.description}
        </p>

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {images.map((src, i) => (
              <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                <img src={src} alt="" className="h-24 w-24 object-cover rounded" />
              </a>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          <select className="form-control py-2 w-max" value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t("common.status")}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(`tasks.status.${s.toLowerCase()}`)}</option>
            ))}
          </select>
          <Button text={t("detail.changeStatus")} className="btn-dark btn-sm" disabled={busy || status === task.status} onClick={saveStatus} />
          <Button
            text={task.featured ? t("tasks.unfeature") : t("tasks.feature")}
            className="btn-outline-dark btn-sm"
            disabled={busy}
            onClick={toggleFeatured}
          />
          <Link href={`/admin/conversations?taskId=${task.id}`} className="btn btn-outline-dark btn-sm">
            {t("detail.viewMessages")}
          </Link>
          <Button text={t("common.delete")} className="btn-danger btn-sm ltr:ml-auto rtl:mr-auto" disabled={busy} onClick={remove} />
        </div>
      </Card>

      {task.reports.length > 0 && (
        <Section title={t("detail.complaints")} count={task.reports.length}>
          <ComplaintRows reports={task.reports} onChange={load} />
        </Section>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title={t("detail.responses")} count={task.responses.length}>
          {task.responses.map((r) => (
            <Row key={r.id}>
              <div className="min-w-0">
                <PersonLink person={r.user} />
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 whitespace-pre-wrap line-clamp-3">{r.message}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {r.price}
                  {r.estimatedTime ? ` · ${r.estimatedTime}` : ""} · {fmtDate(r.createdAt, true, locale)}
                </p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">{t(`responses.status.${String(r.status).toLowerCase()}`)}</span>
            </Row>
          ))}
        </Section>

        <Section title={t("detail.review")}>
          {task.review && (
            <Row>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="text-warning-500">{"★".repeat(task.review.rating)}</span>
                  {task.review.hidden && <span className="text-xs text-slate-400 ltr:ml-2 rtl:mr-2">({t("reviews.hidden")})</span>}
                </p>
                {task.review.comment && <p className="text-sm text-slate-600 dark:text-slate-300">{task.review.comment}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  <PersonLink person={task.review.reviewer} /> → <PersonLink person={task.review.reviewed} />
                </p>
              </div>
              <Button
                text={task.review.hidden ? t("detail.unhide") : t("detail.hide")}
                className="btn-outline-dark btn-sm shrink-0"
                disabled={busy}
                onClick={toggleReview}
              />
            </Row>
          )}
        </Section>
      </div>
    </div>
  );
}
