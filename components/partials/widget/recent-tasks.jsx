"use client";
import React from "react";
import Link from "next/link";
import { useTranslation } from "@/context/LanguageContext";
import { TaskStatus } from "@/components/partials/admin/Detail";

const RecentTasks = ({ tasks = [] }) => {
    const { t } = useTranslation();
    if (!tasks.length) {
        return (
            <div className="text-center py-4 text-slate-500">
                {t("dashboard.noRecentTasks")}
            </div>
        );
    }

    return (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700 -mx-6 -mb-6">
            {tasks.map((task) => (
                <li
                    key={task.id}
                    className="flex items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                    <div className="flex-none mr-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xl">
                            {task.user?.avatar ? (
                                <img src={task.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <span className="text-slate-500">{task.user?.fullName?.charAt(0) || "U"}</span>
                            )}
                        </div>
                    </div>
                    {/* min-w-0 lets long titles truncate instead of pushing the badge off a phone screen */}
                    <div className="flex-1 min-w-0 mr-3">
                        <Link href={`/admin/tasks/${task.id}`} className="text-slate-800 dark:text-slate-300 font-medium hover:text-primary-500 text-sm block mb-1 truncate">
                            {task.title}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {t("dashboard.by")} <span className="font-medium text-slate-700 dark:text-slate-300">{task.user?.fullName}</span>
                        </div>
                    </div>
                    <div className="flex-none text-right">
                        <TaskStatus status={task.status} />
                        <div className="text-xs text-slate-400 mt-1">
                            {new Date(task.createdAt).toLocaleDateString()}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default RecentTasks;
