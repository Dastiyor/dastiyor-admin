import React from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";

const RecentTasks = ({ tasks = [] }) => {
    if (!tasks.length) {
        return (
            <div className="text-center py-4 text-slate-500">
                No recent tasks found.
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
                    <div className="flex-1">
                        <Link href={`/admin/tasks/${task.id}`} className="text-slate-800 dark:text-slate-300 font-medium hover:text-primary-500 text-sm block mb-1 truncate">
                            {task.title}
                        </Link>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            by <span className="font-medium text-slate-700 dark:text-slate-300">{task.user?.fullName}</span>
                        </div>
                    </div>
                    <div className="flex-none text-right">
                        <span className={`badge ${task.status === "COMPLETED" ? "bg-success-500/10 text-success-500" :
                                task.status === "IN_PROGRESS" ? "bg-warning-500/10 text-warning-500" :
                                    task.status === "CANCELLED" ? "bg-danger-500/10 text-danger-500" :
                                        "bg-primary-500/10 text-primary-500"
                            } text-xs px-2 py-1 rounded-full`}>
                            {task.status}
                        </span>
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
