"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { useTranslation } from "@/context/LanguageContext";

const STATUSES = ["NEW", "IN_PROGRESS", "PROPOSED", "CLOSED"];
const STATUS_CLASS = {
  NEW: "bg-primary-500/10 text-primary-500",
  IN_PROGRESS: "bg-warning-500/10 text-warning-500",
  PROPOSED: "bg-success-500/10 text-success-500",
  CLOSED: "bg-slate-500/10 text-slate-500",
};

/** Company sourcing requests from the web app's /sourcing page. */
export default function AdminSourcing() {
  const { t, locale } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sourcing${filter ? `?status=${filter}` : ""}`, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      setRequests((await res.json()).data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const open = (r) => {
    setSelected(r);
    setDraft({ status: r.status, adminNotes: r.adminNotes || "", proposed: r.proposed || [] });
    setQuery("");
    setFound([]);
  };

  useEffect(() => {
    if (!draft || query.trim().length < 2) { setFound([]); return; }
    const id = setTimeout(async () => {
      const res = await fetch(`/api/users?role=PROVIDER&limit=10&q=${encodeURIComponent(query.trim())}`, { credentials: "include" });
      if (res.ok) setFound((await res.json()).data || []);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/sourcing/${selected.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: draft.status, adminNotes: draft.adminNotes, proposedIds: draft.proposed.map((p) => p.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.emailed ? t("sourcing.savedEmailed") : t("sourcing.saved"));
      setSelected(null);
      load();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const date = (d) => (d ? new Date(d).toLocaleDateString(locale === "tg" ? "tg-TJ" : "ru-RU") : "—");

  return (
    <div className="space-y-5">
      <Card title={t("sourcing.title")}>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">{t("sourcing.subtitle")}</p>
        <div className="flex items-center gap-3 mb-6">
          <select className="form-control py-2 w-max" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">{t("sourcing.allStatuses")}</option>
            {STATUSES.map((s) => <option key={s} value={s}>{t(`sourcing.status.${s}`)}</option>)}
          </select>
          <Button text={t("common.refresh")} className="btn-outline-dark btn-sm" onClick={load} />
        </div>

        {error && (
          <p className="text-danger text-sm mb-4 flex items-center gap-2">
            <Icon icon="heroicons-outline:exclamation-circle" className="text-lg" />{error}
          </p>
        )}

        {loading ? (
          <div className="p-5 text-center text-slate-500">{t("common.loading")}</div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-700">
              <thead className="bg-slate-200 dark:bg-slate-700">
                <tr>
                  {["date", "company", "category", "city", "headcount", "status"].map((c) => (
                    <th key={c} scope="col" className="table-th">{t(`sourcing.col.${c}`)}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100 dark:bg-slate-800 dark:divide-slate-700">
                {requests.length === 0 ? (
                  <tr><td colSpan={6} className="table-td text-center text-slate-500 py-8">{t("sourcing.empty")}</td></tr>
                ) : requests.map((r) => (
                  <tr key={r.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700" onClick={() => open(r)}>
                    <td className="table-td">{date(r.createdAt)}</td>
                    <td className="table-td">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{r.contactName}</span>
                        <span className="text-xs text-slate-500">{r.contactPhone}</span>
                      </div>
                    </td>
                    <td className="table-td">{r.category}</td>
                    <td className="table-td">{r.city}</td>
                    <td className="table-td">{r.headcount}</td>
                    <td className="table-td"><span className={`badge ${STATUS_CLASS[r.status] || ""}`}>{t(`sourcing.status.${r.status}`)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && draft && (
        <Card title={`${selected.contactName} · ${selected.category}, ${selected.city}`}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2 text-sm">
              <p><b>{t("sourcing.col.headcount")}:</b> {selected.headcount}</p>
              <p><b>{t("sourcing.experience")}:</b> {selected.experienceYears ?? "—"}</p>
              <p><b>{t("sourcing.budget")}:</b> {selected.budget || "—"}</p>
              <p><b>{t("sourcing.deadline")}:</b> {date(selected.deadline)}</p>
              <p><b>{t("sourcing.contact")}:</b> {selected.contactPhone}{selected.contactEmail ? `, ${selected.contactEmail}` : ""}</p>
              <p><b>{t("sourcing.account")}:</b> {selected.user?.fullName} {selected.user?.email ? `(${selected.user.email})` : ""}</p>
              <p className="whitespace-pre-wrap bg-slate-50 dark:bg-slate-700 rounded p-3">{selected.description}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="form-label" htmlFor="sr-status">{t("sourcing.col.status")}</label>
                <select id="sr-status" className="form-control py-2" value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`sourcing.status.${s}`)}</option>)}
                </select>
                {draft.status === "PROPOSED" && selected.status !== "PROPOSED" && (
                  <p className="text-xs text-slate-500 mt-1">{t("sourcing.willEmail")}</p>
                )}
              </div>

              <div>
                <label className="form-label" htmlFor="sr-notes">{t("sourcing.notes")}</label>
                <textarea id="sr-notes" className="form-control" rows={4} maxLength={5000} value={draft.adminNotes}
                  onChange={(e) => setDraft({ ...draft, adminNotes: e.target.value })} />
              </div>

              <div>
                <label className="form-label" htmlFor="sr-search">{t("sourcing.proposed")}</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {draft.proposed.map((p) => (
                    <span key={p.id} className="badge bg-success-500/10 text-success-500 flex items-center gap-1">
                      {p.fullName}
                      <button type="button" aria-label={t("sourcing.remove")}
                        onClick={() => setDraft({ ...draft, proposed: draft.proposed.filter((x) => x.id !== p.id) })}>×</button>
                    </span>
                  ))}
                </div>
                <input id="sr-search" className="form-control py-2" placeholder={t("sourcing.searchProvider")} value={query} onChange={(e) => setQuery(e.target.value)} />
                {found.length > 0 && (
                  <ul className="border border-slate-200 dark:border-slate-600 rounded mt-1 divide-y divide-slate-100 dark:divide-slate-700">
                    {found.filter((u) => !draft.proposed.some((p) => p.id === u.id)).map((u) => (
                      <li key={u.id}>
                        <button type="button" className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                          onClick={() => { setDraft({ ...draft, proposed: [...draft.proposed, { id: u.id, fullName: u.fullName }] }); setQuery(""); }}>
                          {u.fullName} <span className="text-slate-500">{u.phone || u.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-3">
                <Button text={t("common.cancel")} className="btn-outline-dark" onClick={() => setSelected(null)} />
                <Button text={t("common.save")} className="btn-dark" isLoading={busy} onClick={save} />
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
