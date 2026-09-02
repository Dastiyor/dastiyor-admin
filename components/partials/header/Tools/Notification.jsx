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

const notifyLabel = (count) => {
  return (
    <span className="relative lg:h-[32px] lg:w-[32px] lg:bg-slate-100 text-slate-900 lg:dark:bg-slate-900 dark:text-white cursor-pointer rounded-full text-[20px] flex flex-col items-center justify-center">
      <Icon icon="heroicons-outline:bell" />
      {count > 0 && (
        <span className="absolute lg:right-0 lg:top-0 -top-2 -right-2 h-4 w-4 bg-red-500 text-[8px] font-semibold flex flex-col items-center justify-center rounded-full text-white z-[99]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </span>
  );
};

const Notification = () => {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // ponytail: unread=true gives the list and an exact badge count in one request
    fetch("/api/notifications?unread=true&limit=5", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        setItems(data.data || []);
        setUnread(data.pagination?.total || 0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Dropdown
      classMenuItems="md:w-[320px] top-[58px] rounded-xl border-slate-200 dark:border-slate-700 overflow-hidden"
      label={notifyLabel(unread)}
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
        {items.map((item) => (
          <Menu.Item key={item.id}>
            {({ active }) => (
              <Link
                href="/admin/notifications"
                className={`${active
                    ? "bg-slate-100 dark:bg-slate-700/70 text-slate-800"
                    : "text-slate-600 dark:text-slate-300"
                  } block w-full px-4 py-2 text-sm  cursor-pointer`}
              >
                <div className="flex ltr:text-left rtl:text-right">
                  <div className="flex-none ltr:mr-3 rtl:ml-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
                      <Icon icon="heroicons-outline:bell" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm text-slate-600 dark:text-slate-300">
                      {item.title}
                    </div>
                    <div className="text-xs leading-4 text-slate-600 dark:text-slate-300 line-clamp-2">
                      {item.message}
                    </div>
                    <div className="text-slate-400 dark:text-slate-400 text-xs mt-1">
                      {dayjs(item.createdAt).fromNow()}
                      {item.user?.fullName ? ` · ${item.user.fullName}` : ""}
                    </div>
                  </div>
                  {!item.isRead && (
                    <div className="flex-0">
                      <span className="h-[10px] w-[10px] bg-danger-500 border border-white dark:border-slate-400 rounded-full inline-block"></span>
                    </div>
                  )}
                </div>
              </Link>
            )}
          </Menu.Item>
        ))}
      </div>
    </Dropdown>
  );
};

export default Notification;
