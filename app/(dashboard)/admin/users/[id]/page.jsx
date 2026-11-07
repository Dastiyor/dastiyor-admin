"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";
import {
  Field,
  Section,
  Row,
  TaskStatus,
  PersonLink,
  ComplaintRows,
  DetailState,
  fmtDate,
} from "@/components/partials/admin/Detail";

const ROLE_KEYS = { CUSTOMER: "users.roleCustomer", PROVIDER: "users.roleProvider", ADMIN: "users.roleAdmin" };

function parseList(raw) {
  try {
    const v = JSON.parse(raw || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return raw ? [raw] : [];
  }
}

export default function UserDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/users/${id}/overview`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (body, okMsg) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      toast.success(okMsg);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(t("users.confirmDelete"))) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || res.statusText);
      toast.success(t("detail.deleted"));
      router.push("/admin/users");
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  if (!data) {
    return <DetailState loading={!error} error={error} backHref="/admin/users" backLabel={t("detail.backToUsers")} />;
  }

  const { user, tasks, assignedTasks, responses, reviews, reports, payments, averageRating } = data;
  const c = user._count;
  const locked = user.lockedUntil && new Date(user.lockedUntil) > new Date();
  const docs = parseList(user.verificationDocuments);
  const sub = user.subscription;
  const subActive = sub?.isActive && new Date(sub.endDate) > new Date();

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/users" className="text-slate-500 hover:text-primary-500 inline-flex items-center gap-1">
          <Icon icon="heroicons:arrow-left" className="rtl:rotate-180" />
          {t("detail.backToUsers")}
        </Link>
      </div>

      <Card>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-none">
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <span className="h-20 w-20 rounded-full bg-slate-600 text-white text-2xl flex items-center justify-center">
                {user.fullName?.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-xl font-medium text-slate-900 dark:text-white">{user.fullName}</h4>
              <span className="badge bg-primary-500/10 text-primary-500">{t(ROLE_KEYS[user.role] || user.role)}</span>
              {user.isVerified ? (
                <span className="badge bg-success-500/10 text-success-500">{t("users.verified")}</span>
              ) : (
                <span className="badge bg-slate-500/10 text-slate-500">{t("users.unverified")}</span>
              )}
              {locked && <span className="badge bg-danger-500/10 text-danger-500">{t("detail.locked")}</span>}
              {c.reportsAgainst > 0 && (
                <span className="badge bg-warning-500/10 text-warning-500">{t("detail.complaintsBadge", { count: c.reportsAgainst })}</span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <Field label={t("users.email")}>{user.email}</Field>
              <Field label={t("users.phone")}>
                {user.phone || "—"}
                {user.phone && user.phoneVerified && <Icon icon="heroicons:check-badge" className="inline text-success-500 ltr:ml-1 rtl:mr-1" />}
              </Field>
              <Field label={t("detail.city")}>{user.city}</Field>
              <Field label={t("users.balanceTjs")}>{(user.balance || 0).toLocaleString()} TJS</Field>
              <Field label={t("detail.joined")}>{fmtDate(user.createdAt, false)}</Field>
              <Field label={t("detail.rating")}>
                {averageRating != null ? `${averageRating.toFixed(1)} ★ (${c.reviewsReceived})` : "—"}
              </Field>
              <Field label={t("detail.signIn")}>
                {[user.email && t("detail.password"), user.googleId && "Google", user.appleId && "Apple"].filter(Boolean).join(", ")}
              </Field>
              {user.experienceYears != null && <Field label={t("detail.experience")}>{user.experienceYears}</Field>}
            </div>
            {user.bio && <p className="text-sm text-slate-600 dark:text-slate-300 mt-4 whitespace-pre-wrap">{user.bio}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
          {user.isVerified ? (
            <Button text={t("users.rejectUnverify")} className="btn-outline-dark btn-sm" disabled={busy} onClick={() => update({ isVerified: false }, t("detail.saved"))} />
          ) : (
            <Button text={t("detail.verify")} className="btn-success btn-sm" disabled={busy} onClick={() => update({ isVerified: true }, t("detail.saved"))} />
          )}
          {locked && <Button text={t("users.unlock")} className="btn-warning btn-sm" disabled={busy} onClick={() => update({ unlock: true }, t("detail.saved"))} />}
          <Link href={`/admin/notifications?userId=${user.id}`} className="btn btn-outline-dark btn-sm">
            {t("detail.notify")}
          </Link>
          {user.role !== "ADMIN" && <Button text={t("common.delete")} className="btn-danger btn-sm ltr:ml-auto rtl:mr-auto" disabled={busy} onClick={remove} />}
        </div>
      </Card>

      {docs.length > 0 && (
        <Section title={t("users.verificationDocs")} count={docs.length}>
          {docs.map((url, i) => (
            <Row key={i}>
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary-500 hover:underline truncate">
                {url}
              </a>
            </Row>
          ))}
        </Section>
      )}

      {reports.length > 0 && (
        <Section title={t("detail.complaintsAgainst")} count={c.reportsAgainst} allHref={`/admin/reports?targetUserId=${user.id}`}>
          <ComplaintRows reports={reports} onChange={load} />
        </Section>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <Section title={t("detail.tasksCreated")} count={c.tasks} allHref={`/admin/tasks?userId=${user.id}`}>
          {tasks.map((x) => (
            <Row key={x.id}>
              <Link href={`/admin/tasks/${x.id}`} className="min-w-0 hover:text-primary-500">
                <p className="text-sm font-medium truncate">{x.title}</p>
                <p className="text-xs text-slate-500">{x.category} · {x.city} · {fmtDate(x.createdAt, false)}</p>
              </Link>
              <TaskStatus status={x.status} />
            </Row>
          ))}
        </Section>

        {(user.role === "PROVIDER" || c.assignedTasks > 0) && (
          <Section title={t("detail.tasksAssigned")} count={c.assignedTasks}>
            {assignedTasks.map((x) => (
              <Row key={x.id}>
                <Link href={`/admin/tasks/${x.id}`} className="min-w-0 hover:text-primary-500">
                  <p className="text-sm font-medium truncate">{x.title}</p>
                  <p className="text-xs text-slate-500">{x.category} · {x.city}</p>
                </Link>
                <TaskStatus status={x.status} />
              </Row>
            ))}
          </Section>
        )}

        {(user.role === "PROVIDER" || c.responses > 0) && (
          <Section title={t("detail.responses")} count={c.responses} allHref={`/admin/responses?userId=${user.id}`}>
            {responses.map((r) => (
              <Row key={r.id}>
                <Link href={`/admin/tasks/${r.task?.id}`} className="min-w-0 hover:text-primary-500">
                  <p className="text-sm truncate">{r.task?.title}</p>
                  <p className="text-xs text-slate-500">{r.price} · {fmtDate(r.createdAt, false)}</p>
                </Link>
                <span className="text-xs text-slate-500">{t(`responses.status.${String(r.status).toLowerCase()}`)}</span>
              </Row>
            ))}
          </Section>
        )}

        <Section title={t("detail.reviewsReceived")} count={c.reviewsReceived}>
          {reviews.map((r) => (
            <Row key={r.id}>
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="text-warning-500">{"★".repeat(r.rating)}</span>
                  {r.hidden && <span className="text-xs text-slate-400 ltr:ml-2 rtl:mr-2">({t("reviews.hidden")})</span>}
                </p>
                {r.comment && <p className="text-sm text-slate-600 dark:text-slate-300">{r.comment}</p>}
                <p className="text-xs text-slate-500 mt-1">
                  <PersonLink person={r.reviewer} /> · {fmtDate(r.createdAt, false)}
                </p>
              </div>
            </Row>
          ))}
        </Section>

        <Section title={t("detail.subscription")}>
          {sub && (
            <Row>
              <div>
                <p className="text-sm font-medium">{sub.plan}</p>
                <p className="text-xs text-slate-500">
                  {fmtDate(sub.startDate, false)} – {fmtDate(sub.endDate, false)}
                </p>
              </div>
              <span className={`badge ${subActive ? "bg-success-500/10 text-success-500" : "bg-slate-500/10 text-slate-500"}`}>
                {subActive ? t("subscriptions.active") : t("subscriptions.inactive")}
              </span>
            </Row>
          )}
        </Section>

        <Section title={t("detail.payments")} count={c.payments}>
          {payments.map((p) => (
            <Row key={p.id}>
              <div>
                <p className="text-sm font-medium">
                  {p.amount} {p.currency}
                </p>
                <p className="text-xs text-slate-500">
                  {p.type}{p.plan ? ` (${p.plan})` : ""} · {fmtDate(p.createdAt)}
                </p>
              </div>
              <span className="text-xs text-slate-500">
                {t(`subscriptions.paymentStatus.${String(p.status).toLowerCase()}`)}
              </span>
            </Row>
          ))}
        </Section>
      </div>
    </div>
  );
}
