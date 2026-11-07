import React from "react";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/context/LanguageContext";
import { fmtNum } from "@/components/partials/admin/Detail";

const GroupChart4 = ({ stats }) => {
  const { t, locale } = useTranslation();
  const statistics = [
    {
      title: t("dashboard.totalTasks"),
      count: stats?.tasks || 0,
      bg: "bg-info-500",
      text: "text-info-500",
      icon: "heroicons-outline:menu-alt-1",
    },
    {
      title: t("dashboard.totalUsers"),
      count: stats?.users || 0,
      bg: "bg-warning-500",
      text: "text-warning-500",
      icon: "heroicons-outline:users",
    },
    {
      title: t("dashboard.totalReviews"),
      count: stats?.reviews || 0,
      bg: "bg-primary-500",
      text: "text-primary-500",
      icon: "heroicons-outline:star",
    },
    {
      title: t("dashboard.activeSubs"),
      count: stats?.subscriptionsActive || 0,
      bg: "bg-success-500",
      text: "text-success-500",
      icon: "heroicons-outline:credit-card",
    },
  ];

  return (
    <>
      {statistics.map((item, i) => (
        <div
          key={i}
          className={`${item.bg} rounded-md p-4 bg-opacity-[0.15] dark:bg-opacity-50 text-center`}
        >
          <div
            className={`${item.text} mx-auto h-10 w-10 flex flex-col items-center justify-center rounded-full bg-white text-2xl mb-4 `}
          >
            <Icon icon={item.icon} />
          </div>
          <span className="block text-sm text-slate-600 font-medium dark:text-white mb-1">
            {item.title}
          </span>
          <span className="block mb- text-2xl text-slate-900 dark:text-white font-medium">
            {fmtNum(item.count, locale)}
          </span>
        </div>
      ))}
    </>
  );
};

export default GroupChart4;
