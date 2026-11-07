"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import Icon from "@/components/ui/Icon";
import { useTranslation } from "@/context/LanguageContext";

/** Bottom bar on phones: conversations, your profile, complaints. */
const MobileFooter = () => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const user = useSelector((state) => state.auth?.user);
  const tone = (href) =>
    pathname?.startsWith(href) ? "text-primary-500" : "text-slate-600 dark:text-slate-300";

  const Item = ({ href, icon, label }) => (
    <Link href={href} className={`flex flex-col items-center ${tone(href)}`}>
      <Icon icon={icon} className="text-[20px] mb-1" />
      <span className="block text-[11px]">{label}</span>
    </Link>
  );

  return (
    <div className="bg-white bg-no-repeat custom-dropshadow footer-bg dark:bg-slate-700 flex justify-around items-center backdrop-filter backdrop-blur-[40px] fixed left-0 w-full z-[9999] bottom-0 py-[12px] px-4">
      <Item href="/admin/conversations" icon="heroicons-outline:chat-bubble-left-ellipsis" label={t("menu.conversations")} />
      <Link
        href="/settings/profile"
        aria-label={t("settings.profile.title")}
        className="relative bg-white bg-no-repeat backdrop-filter backdrop-blur-[40px] rounded-full footer-bg dark:bg-slate-700 h-[65px] w-[65px] z-[-1] -mt-[40px] flex justify-center items-center"
      >
        <span
          className={`h-[50px] w-[50px] rounded-full custom-dropshadow overflow-hidden flex items-center justify-center bg-slate-600 text-white text-lg border-2 ${
            pathname?.startsWith("/settings/profile") ? "border-primary-500" : "border-slate-100"
          }`}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            user?.fullName?.charAt(0) || <Icon icon="heroicons-outline:user" />
          )}
        </span>
      </Link>
      <Item href="/admin/reports" icon="heroicons-outline:flag" label={t("menu.reports")} />
    </div>
  );
};

export default MobileFooter;
