"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import Switch from "@/components/ui/Switch";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";

const defaultPayment = {
  currencyCode: "TJS",
  currencySymbol: "TJS",
  commission: "10",
  smartpayActive: true,
  smartpayMerchantId: "",
  smartpaySecretKey: "",
  smartpayMode: "sandbox",
  bankActive: false,
  bankName: "",
  accountHolder: "",
  accountNumber: "",
  swift: "",
  bankAddress: "",
};

const PaymentSettings = () => {
  const { t } = useTranslation();
  const [data, setData] = useState(defaultPayment);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings/payment", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setData({ ...defaultPayment, ...json });
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
      const res = await fetch("/api/settings/payment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t("settings.payment.saved"));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">{t("common.loading")}</div>;

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card title={t("settings.payment.general")}>
        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-5">
          <Textinput
            label={t("settings.payment.currencyCode")}
            type="text"
            placeholder="TJS"
            value={data.currencyCode}
            onChange={(e) => setData({ ...data, currencyCode: e.target.value })}
          />
          <Textinput
            label={t("settings.payment.currencySymbol")}
            type="text"
            placeholder="TJS"
            value={data.currencySymbol}
            onChange={(e) => setData({ ...data, currencySymbol: e.target.value })}
          />
          <Textinput
            label={t("settings.payment.commission")}
            type="number"
            placeholder="10"
            value={data.commission}
            onChange={(e) => setData({ ...data, commission: e.target.value })}
          />
        </div>
      </Card>

      <Card title={t("settings.payment.smartpay")}>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">
          {t("settings.payment.smartpayNote")}
        </p>
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <label className="form-label font-medium">{t("settings.payment.enableSmartpay")}</label>
            <Switch
              value={data.smartpayActive}
              onChange={() => setData({ ...data, smartpayActive: !data.smartpayActive })}
            />
          </div>
          {data.smartpayActive && (
            <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
              <Textinput
                label={t("settings.payment.merchantId")}
                type="text"
                placeholder="smartpay_merchant_..."
                value={data.smartpayMerchantId}
                onChange={(e) => setData({ ...data, smartpayMerchantId: e.target.value })}
              />
              <Textinput
                label={t("settings.payment.secretKey")}
                type="password"
                placeholder="sk_..."
                value={data.smartpaySecretKey}
                onChange={(e) => setData({ ...data, smartpaySecretKey: e.target.value })}
              />
              <div>
                <label className="form-label block mb-2">{t("settings.payment.mode")}</label>
                <select
                  className="form-control py-2"
                  value={data.smartpayMode}
                  onChange={(e) => setData({ ...data, smartpayMode: e.target.value })}
                >
                  <option value="sandbox">{t("settings.payment.sandbox")}</option>
                  <option value="live">{t("settings.payment.live")}</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title={t("settings.payment.bank")}>
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <label className="form-label font-medium">{t("settings.payment.enableBank")}</label>
            <Switch
              value={data.bankActive}
              onChange={() => setData({ ...data, bankActive: !data.bankActive })}
            />
          </div>
          {data.bankActive && (
            <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
              <Textinput label={t("settings.payment.bankName")} type="text" value={data.bankName} onChange={(e) => setData({ ...data, bankName: e.target.value })} />
              <Textinput label={t("settings.payment.accountHolder")} type="text" value={data.accountHolder} onChange={(e) => setData({ ...data, accountHolder: e.target.value })} />
              <Textinput label={t("settings.payment.accountNumber")} type="text" value={data.accountNumber} onChange={(e) => setData({ ...data, accountNumber: e.target.value })} />
              <Textinput label={t("settings.payment.swift")} type="text" value={data.swift} onChange={(e) => setData({ ...data, swift: e.target.value })} />
              <div className="lg:col-span-2">
                <Textinput label={t("settings.payment.bankAddress")} type="text" value={data.bankAddress} onChange={(e) => setData({ ...data, bankAddress: e.target.value })} />
              </div>
            </div>
          )}
        </div>
      </Card>

      <div className="text-right">
        <Button text={t("settings.saveChanges")} className="btn-dark w-full sm:w-auto" onClick={handleSave} disabled={saving} />
      </div>
    </div>
  );
};

export default PaymentSettings;
