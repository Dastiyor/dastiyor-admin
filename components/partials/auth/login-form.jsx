import React, { useState } from "react";
import Textinput from "@/components/ui/Textinput";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useRouter } from "next/navigation";
import Checkbox from "@/components/ui/Checkbox";
import { useSelector, useDispatch } from "react-redux";
import { handleLogin } from "./store";
import { toast } from "react-toastify";
import { useTranslation } from "@/context/LanguageContext";

const LoginForm = () => {
  const { t } = useTranslation();
  const schema = yup
    .object({
      email: yup.string().email(t("login.invalidEmail")).required(t("login.emailRequired")),
      password: yup.string().required(t("login.passwordRequired")),
    })
    .required();
  const dispatch = useDispatch();
  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm({
    resolver: yupResolver(schema),
    //
    mode: "all",
  });
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || t("login.invalidCredentials"), {
          position: "top-right",
          autoClose: 2000,
        });
        return;
      }
      dispatch(handleLogin({ user: json.user }));
      router.push("/admin/dashboard");
    } catch (e) {
      toast.error(e.message || t("login.invalidCredentials"), {
        position: "top-right",
        autoClose: 2000,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const [checked, setChecked] = useState(false);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 ">
      <Textinput
        name="email"
        label={t("login.email")}
        type="email"
        placeholder="admin@dastiyor.com"
        register={register}
        error={errors?.email}
      />
      <Textinput
        name="password"
        label={t("login.password")}
        type="password"
        register={register}
        error={errors.password}
      />
      <div className="flex justify-between">
        <Checkbox
          value={checked}
          onChange={() => setChecked(!checked)}
          label={t("login.rememberMe")}
        />
        {/* ponytail: reset lives on the main site (same users table), no mailer here */}
        <a
          href="https://www.dastiyor.com/forgot-password"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-slate-800 dark:text-slate-400 leading-6 font-medium"
        >
          {t("login.forgotPassword")}{" "}
        </a>
      </div>

      <button type="submit" className="btn btn-dark block w-full text-center" disabled={submitting}>
        {submitting ? "..." : t("login.signIn")}
      </button>
    </form>
  );
};

export default LoginForm;
