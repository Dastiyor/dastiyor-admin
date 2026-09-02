"use client";

import React, { useEffect, useState } from "react";
import Dropdown from "@/components/ui/Dropdown";
import Icon from "@/components/ui/Icon";
import Link from "next/link";
import { Menu } from "@headlessui/react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useTranslation } from "@/context/LanguageContext";

dayjs.extend(relativeTime);

const SEEN_KEY = "admin_activity_seen_at";

const EVENT_STYLE = {
  USER_JOINED: { icon: "heroicons-outline:user-plus", key: "activity.userJoined" },
  TASK_CREATED: { icon: "heroicons-outline:clipboard-document-list", key: "activity.taskCreated" },
  REPORT_OPENED: { icon: "heroicons-outline:shield-exclamation", key: "activity.reportOpened" },
  REVIEW_POSTED: { icon: "heroicons-outline:star", key: "activity.reviewPosted" },
};

const notifyLabel = (count, onClick) => (
  <span
    onClick={onClick}
    className="relative lg:h-[32px] lg:w-[32px] lg:bg-slate-100 text-slate-900 lg:dark:bg-slate-900 dark:text-white cursor-pointer rounded-full text-[20px] flex flex-col items-center justify-center"
  >
    <Icon icon="heroicons-outline:bell" />
    {count > 0 && (
      <span className="absolute lg:right-0 lg:top-0 -top-2 -right-2 h-4 w-4 bg-red-500 text-[8px] font-semibold flex flex-col items-center justify-center rounded-full text-white z-[99]">
        {count > 99 ? "99+" : count}
      </span>
    )}
  </span>
);

const Notification = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [seenAt, setSeenAt] = useState(null);

  useEffect(() => {
    // ponytail: localStorage — "seen" is a per-viewer convenience, not shared state
    try {
      setSeenAt(window.localStorage.getItem(SEEN_KEY));
    } catch {}

    let cancelled = false;
    fetch("/api/activity?limit=8", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setItems(data.data || []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const unseen = seenAt
    ? items.filter((i) => new Date(i.createdAt) > new Date(seenAt)).length
    : items.length;

  const markSeen = () => {
    const now = new Date().toISOString();
    setSeenAt(now);
    try {
      window.localStorage.setItem(SEEN_KEY, now);
    } catch {}
  };

  return (
    <Dropdown
      classMenuItems="md:w-[320px] top-[58px] rounded-xl border-slate-200 dark:border-slate-700 overflow-hidden"
      label={notifyLabel(unseen, markSeen)}
    >
      <div className="flex justify-between px-4 py-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
        <div className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-6">
          {t("common.notifications")}
        </div>
        <div className="text-slate-800 dark:text-slate-200 text-xs md:text-right">
          <Link href="/admin/notifications" className="underline">
            {t("common.viewAll")}
          </Link>
        </div>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-700">
        {items.length === 0 && (
          <div className="px-4 py-6 text-sm text-center text-slate-500 dark:text-slate-400">
            {t("common.noNotifications")}
          </div>
        )}
        {items.map((item) => {
          const style = EVENT_STYLE[item.type] || EVENT_STYLE.USER_JOINED;
          return (
            <Menu.Item key={item.id}>
              {({ active }) => (
                <Link
                  href={item.link}
                  className={`${active
                      ? "bg-slate-100 dark:bg-slate-700/70 text-slate-800"
                      : "text-slate-600 dark:text-slate-300"
                    } block w-full px-4 py-2 text-sm cursor-pointer`}
                >
                  <div className="flex ltr:text-left rtl:text-right">
                    <div className="flex-none ltr:mr-3 rtl:ml-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
                        <Icon icon={style.icon} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-slate-600 dark:text-slate-300">
                        {t(style.key)}
                      </div>
                      <div className="text-xs leading-4 text-slate-600 dark:text-slate-300 line-clamp-2">
                        {item.name}
                        {item.meta ? ` · ${item.meta}` : ""}
                      </div>
                      <div className="text-slate-400 dark:text-slate-400 text-xs mt-1">
                        {dayjs(item.createdAt).fromNow()}
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </Menu.Item>
          );
        })}
      </div>
    </Dropdown>
  );
};

export default Notification;
