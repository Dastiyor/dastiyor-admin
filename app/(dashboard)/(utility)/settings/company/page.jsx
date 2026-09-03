"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";

const defaultCompany = {
  name: "",
  email: "",
  phone: "",
  supportEmail: "",
  address: "",
};

const CompanySettings = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(defaultCompany);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings/company", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setData({ ...defaultCompany, ...json });
        }
      } catch {
        // keep defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t("settings.saveChanges") || "Saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">{t("common.loading")}</div>;

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card title={t("settings.company.generalInfo")}>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
          <Textinput label={t("settings.company.name")} type="text" placeholder="e.g. Dastiyor" value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} />
          <Textinput label={t("settings.company.email")} type="email" placeholder="e.g. info@dastiyor.com" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
          <Textinput label={t("settings.company.phone")} type="text" placeholder="e.g. +1 234 567 890" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
          <Textinput label={t("settings.company.supportEmail")} type="email" placeholder="e.g. support@dastiyor.com" value={data.supportEmail} onChange={(e) => setData({ ...data, supportEmail: e.target.value })} />
          <div className="lg:col-span-2">
            <Textarea label={t("settings.company.address")} placeholder={t("settings.company.address")} value={data.address} onChange={(e) => setData({ ...data, address: e.target.value })} />
          </div>
        </div>
      </Card>

      <div className="text-right">
        <Button text={t("settings.saveChanges")} className="btn-dark w-full sm:w-auto" onClick={handleSave} disabled={saving} />
      </div>
    </div>
  );
};

export default CompanySettings;
