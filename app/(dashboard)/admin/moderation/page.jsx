"use client";

import React, { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import Button from "@/components/ui/Button";
import HomeBredCurbs from "@/components/partials/HomeBredCurbs";
import Link from "next/link";
import { toast } from "react-toastify";

export default function AdminModeration() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const fetchModeration = async () => {
    try {
      const res = await fetch("/api/moderation", { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchModeration().then(() => { if (cancelled) return; });
    return () => { cancelled = true; };
  }, []);

  const setReportStatus = async (reportId, status) => {
    setUpdatingId(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(status === "RESOLVED" ? "Report resolved" : "Report dismissed");
      await fetchModeration();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const bulkSetStatus = async (status) => {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/reports/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ status }),
          })
        )
      );
      toast.success(`${selectedIds.size} reports ${status === "RESOLVED" ? "resolved" : "dismissed"}`);
      setSelectedIds(new Set());
      await fetchModeration();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = (reports) => {
    if (selectedIds.size === reports.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(reports.map((r) => r.id)));
    }
  };

  if (loading) {
    return (
      <div>
        <HomeBredCurbs title="Moderation tools" />
        <div className="p-8 text-center text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <HomeBredCurbs title="Moderation tools" />
        <p className="text-danger flex items-center gap-2">
          <Icon icon="heroicons-outline:exclamation-circle" />
          {error}
        </p>
      </div>
    );
  }

  const { openTasksCount = 0, unverifiedProviders = [], recentOpenTasks = [], openReportsCount = 0, recentReports = [] } = data || {};

  return (
    <div>
      <HomeBredCurbs title="Moderation tools" />
      <Card title="Content moderation">
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
          Queue for tasks and profiles that may need review. Open tasks and unverified providers below.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/tasks?status=OPEN"
            className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary-500 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 dark:text-white mb-1">Open tasks</h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Tasks awaiting provider responses
                </p>
              </div>
              <span className="text-2xl font-bold text-primary-500">{openTasksCount}</span>
            </div>
          </Link>
          <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 dark:text-white mb-1">Unverified providers</h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Providers pending verification
                </p>
              </div>
              <span className="text-2xl font-bold text-warning-500">{unverifiedProviders.length}</span>
            </div>
          </div>
          <div className="p-5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-medium text-slate-900 dark:text-white mb-1">Reports</h5>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  User-reported content
                </p>
              </div>
              <span className="text-2xl font-bold text-danger-500">{openReportsCount}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card title="Recent open tasks" noborder>
            <div className="overflow-x-auto">
              {recentOpenTasks.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No open tasks.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {recentOpenTasks.slice(0, 10).map((task) => (
                    <li key={task.id} className="py-3 first:pt-0">
                      <Link
                        href={`/admin/tasks`}
                        className="flex justify-between gap-2 text-sm hover:text-primary-500"
                      >
                        <span className="line-clamp-1 text-slate-900 dark:text-white">
                          {task.title}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {task._count?.responses ?? 0} responses
                        </span>
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {task.user?.fullName} · {task.city}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href="/admin/tasks"
              className="inline-flex items-center gap-1 text-sm text-primary-500 mt-3"
            >
              View all tasks <Icon icon="heroicons-outline:arrow-right" className="text-lg" />
            </Link>
          </Card>

          <Card title="Unverified providers" noborder>
            <div className="overflow-x-auto">
              {unverifiedProviders.length === 0 ? (
                <p className="text-slate-500 text-sm py-4">No unverified providers.</p>
              ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                  {unverifiedProviders.slice(0, 10).map((user) => (
                    <li key={user.id} className="py-3 first:pt-0">
                      <Link
                        href="/admin/users"
                        className="flex flex-col text-sm hover:text-primary-500"
                      >
                        <span className="font-medium text-slate-900 dark:text-white">
                          {user.fullName}
                        </span>
                        <span className="text-xs text-slate-500">{user.email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-sm text-primary-500 mt-3"
            >
              View all users <Icon icon="heroicons-outline:arrow-right" className="text-lg" />
            </Link>
          </Card>
        </div>

        <Card title="Reports (complaints)" noborder className="mt-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              User-reported content. Resolve or dismiss each report.
            </p>
            {recentReports.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{selectedIds.size} selected</span>
                <Button
                  text="Resolve selected"
                  className="btn-success btn-xs"
                  onClick={() => bulkSetStatus("RESOLVED")}
                  disabled={selectedIds.size === 0 || bulkBusy}
                />
                <Button
                  text="Dismiss selected"
                  className="btn-outline-dark btn-xs"
                  onClick={() => bulkSetStatus("DISMISSED")}
                  disabled={selectedIds.size === 0 || bulkBusy}
                />
              </div>
            )}
          </div>
          {recentReports.length === 0 ? (
            <p className="text-slate-500 text-sm py-4">No open reports.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                <input
                  type="checkbox"
                  className="table-checkbox"
                  checked={selectedIds.size === recentReports.length && recentReports.length > 0}
                  onChange={() => toggleAll(recentReports)}
                />
                <span className="text-xs text-slate-500">Select all</span>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentReports.map((r) => (
                  <li key={r.id} className="py-4 first:pt-0">
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        className="table-checkbox mt-1 shrink-0"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                      />
                      <div className="flex-1">
                        <div className="flex flex-col gap-1">
                          <p className="text-sm text-slate-900 dark:text-white font-medium">{r.reason}</p>
                          <p className="text-xs text-slate-500">
                            Reported by {r.reporter?.fullName} ({r.reporter?.email})
                            {r.targetUser && ` · Against user: ${r.targetUser.fullName}`}
                            {r.targetTask && ` · Against task: ${r.targetTask.title}`}
                          </p>
                          <p className="text-xs text-slate-400">
                            {r.createdAt ? new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) : ""}
                          </p>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Button
                            text="Resolve"
                            className="btn-success btn-xs"
                            onClick={() => setReportStatus(r.id, "RESOLVED")}
                            disabled={updatingId === r.id}
                          />
                          <Button
                            text="Dismiss"
                            className="btn-outline-dark btn-xs"
                            onClick={() => setReportStatus(r.id, "DISMISSED")}
                            disabled={updatingId === r.id}
                          />
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <p className="text-slate-500 dark:text-slate-400 text-sm mt-6 flex items-center gap-2">
          <Icon icon="heroicons-outline:information-circle" className="text-lg" />
          Approve or reject from Users and Tasks pages. Resolve reports above.
        </p>
      </Card>
    </div>
  );
}
