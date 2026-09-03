"use client";

import React, { useState, useEffect } from "react";
import Card from "@/components/ui/Card";
import Textinput from "@/components/ui/Textinput";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/context/LanguageContext";
import { toast } from "react-toastify";

const defaultProfile = {
  fullName: "",
  email: "",
  phone: "",
  bio: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

const ProfileSettings = () => {
  const { t } = useTranslation();
  const [avatar, setAvatar] = useState("/assets/images/users/user-1.jpg");
  const [data, setData] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) setAvatar(URL.createObjectURL(file));
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/settings/profile", { credentials: "include" });
        if (res.ok) {
          const json = await res.json();
          if (!cancelled) setData({ ...defaultProfile, ...json });
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
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success(t("settings.profile.updateProfile") || "Saved");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-500">Loading...</div>;

  return (
    <div className="grid grid-cols-1 gap-5">
      <Card title={t("settings.profile.personalInfo")}>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-none">
            <div className="md:h-[150px] md:w-[150px] h-[100px] w-[100px] rounded-full ring-4 ring-slate-100 relative mx-auto md:mx-0">
              <img src={avatar} alt="Profile Avatar" className="w-full h-full object-cover rounded-full" />
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 h-8 w-8 bg-slate-50 text-slate-600 rounded-full shadow-sm flex items-center justify-center cursor-pointer hover:bg-slate-200 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarChange} />
              </label>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
              <Textinput label={t("settings.profile.fullName")} type="text" placeholder="John Doe" value={data.fullName} onChange={(e) => setData({ ...data, fullName: e.target.value })} />
              <Textinput label={t("settings.profile.email")} type="email" placeholder="john.doe@example.com" value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} />
              <Textinput label={t("settings.profile.phone")} type="text" placeholder="+1 234 567 890" value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} />
            </div>
            <Textarea label={t("settings.profile.bio")} placeholder={t("settings.profile.bio")} value={data.bio} onChange={(e) => setData({ ...data, bio: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card title={t("settings.profile.address")}>
        <div className="grid lg:grid-cols-2 grid-cols-1 gap-5">
          <Textinput label={t("settings.profile.addressLine1")} type="text" placeholder="123 Main St" value={data.addressLine1} onChange={(e) => setData({ ...data, addressLine1: e.target.value })} />
          <Textinput label={t("settings.profile.addressLine2")} type="text" placeholder="Apt 4B" value={data.addressLine2} onChange={(e) => setData({ ...data, addressLine2: e.target.value })} />
          <Textinput label={t("settings.profile.city")} type="text" placeholder="New York" value={data.city} onChange={(e) => setData({ ...data, city: e.target.value })} />
          <Textinput label={t("settings.profile.state")} type="text" placeholder="NY" value={data.state} onChange={(e) => setData({ ...data, state: e.target.value })} />
          <Textinput label={t("settings.profile.zip")} type="text" placeholder="10001" value={data.zip} onChange={(e) => setData({ ...data, zip: e.target.value })} />
          <Textinput label={t("settings.profile.country")} type="text" placeholder="USA" value={data.country} onChange={(e) => setData({ ...data, country: e.target.value })} />
        </div>
      </Card>

      <div className="text-right">
        <Button text={t("settings.profile.updateProfile")} className="btn-dark w-full sm:w-auto" onClick={handleSave} disabled={saving} />
      </div>
    </div>
  );
};

export default ProfileSettings;
