"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import Icon from "@/components/ui/Icon";

/** Read a filter that a detail page passed in the URL, e.g. /admin/tasks?userId=… */
export function useUrlFilter(key) {
  const sp = useSearchParams();
  return sp?.get(key) || "";
}

/** Shows that the list is narrowed by a URL filter, with a link that clears it. */
export function UrlFilterChip({ label }) {
  const pathname = usePathname();
  return (
    <Link
      href={pathname}
      className="badge bg-primary-500/10 text-primary-500 inline-flex items-center gap-1 hover:bg-primary-500/20"
    >
      {label}
      <Icon icon="heroicons:x-mark" />
    </Link>
  );
}
