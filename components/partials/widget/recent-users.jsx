"use client";
import React from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/context/LanguageContext";

const RecentUsers = ({ users = [] }) => {
    const { t } = useTranslation();

    if (!users.length) {
        return (
            <div className="text-center py-4 text-slate-500">
                {t("dashboard.noRecentUsers")}
            </div>
        );
    }

    return (
        <ul className="divide-y divide-slate-100 dark:divide-slate-700 -mx-6 -mb-6">
            {users.map((user) => (
                <li
                    key={user.id}
                    className="flex items-center px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                    <div className="flex-none mr-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-600 flex items-center justify-center text-xl overflow-hidden">
                            {user.avatar ? (
                                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-slate-500">{user.fullName?.charAt(0) || "U"}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        <Link href={`/admin/users`} className="text-slate-800 dark:text-slate-300 font-medium hover:text-primary-500 text-sm block mb-1">
                            {user.fullName || t("dashboard.unnamed")}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                            {t("dashboard.joined", { date: new Date(user.createdAt).toLocaleDateString() })}
                        </div>
                    </div>
                    <div className="flex-none text-right">
                        <span className={`badge ${user.role === "admin" ? "bg-danger-500/10 text-danger-500" :
                                user.role === "moderator" ? "bg-warning-500/10 text-warning-500" :
                                    "bg-primary-500/10 text-primary-500"
                            } text-xs px-2 py-1 rounded-full`}>
                            {user.role}
                        </span>
                    </div>
                </li>
            ))}
        </ul>
    );
};

export default RecentUsers;
