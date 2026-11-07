"use client";

import React from "react";
import { useTranslation } from "@/context/LanguageContext";

const STATUSES = ["OPEN", "RESOLVED", "DISMISSED"];
const STATUS_CLASS = {
  OPEN: "bg-danger-500/10 text-danger-500",
  RESOLVED: "bg-success-500/10 text-success-500",
  DISMISSED: "bg-slate-500/10 text-slate-500",
};

export default function ReportStatus({ status }) {
  const { t } = useTranslation();
  return (
    <span className={`badge ${STATUS_CLASS[status] || "bg-slate-500/10 text-slate-500"}`}>
      {STATUSES.includes(status) ? t(`reports.status.${status}`) : status}
    </span>
  );
}

