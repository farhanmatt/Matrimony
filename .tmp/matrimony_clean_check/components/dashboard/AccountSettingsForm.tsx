"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";
import { toast } from "sonner";
import {
  accountSettingsSchema,
  type AccountSettingsInput,
} from "@/lib/validations/settings";

type AccountSettingsUser = {
  name: string;
  email: string;
  emailVerified: boolean;
  hasPassword: boolean;
};

function emptyToNull(value: unknown) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type PasswordFieldKey = "current" | "new" | "confirm";

export default function AccountSettingsForm({
  user,
}: {
  user: AccountSettingsUser;
}) {
  const { update } = useSession();
  const [visiblePasswordFields, setVisiblePasswordFields] = useState<
    Record<PasswordFieldKey, boolean>
  >({
    current: false,
    new: false,
    confirm: false,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountSettingsInput>({
    resolver: zodResolver(accountSettingsSchema),
    defaultValues: {
      name: user.name,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    reset({
      name: user.name,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [reset, user.name]);

  const onSubmit = async (data: AccountSettingsInput) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to update account settings");
      return;
    }

    await update({
      user: {
        name: json.user.name,
        image: json.user.image,
      },
    });

    toast.success("Account settings updated!");
    reset({
      name: json.user.name ?? "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const togglePasswordField = (field: PasswordFieldKey) => {
    setVisiblePasswordFields((current) => ({
      ...current,
      [field]: !current[field],
    }));
  };

  const inputClass =
    "h-11 w-full rounded-[16px] border border-slate-200 bg-white px-4 text-[15px] text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-300";
  const labelClass = "mb-2 block text-sm font-semibold text-slate-800";
  const errorClass = "mt-2 text-xs text-rose-500";

  const passwordFields = [
    {
      key: "current" as const,
      label: "Current Password",
      name: "currentPassword" as const,
      placeholder: user.hasPassword ? "Enter current password" : "Not required",
      autoComplete: "current-password",
    },
    {
      key: "new" as const,
      label: "New Password",
      name: "newPassword" as const,
      placeholder: "Enter new password",
      autoComplete: "new-password",
    },
    {
      key: "confirm" as const,
      label: "Confirm Password",
      name: "confirmPassword" as const,
      placeholder: "Confirm new password",
      autoComplete: "new-password",
    },
  ] as const;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      <section id="account-details" className="scroll-mt-28">
        <div className="mb-6 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-rose-500" />
            <h2 className="font-display text-[1.5rem] font-bold text-slate-900">
              Account Details
            </h2>
          </div>
          <p className="mt-2 text-[15px] text-slate-500">
            Update your personal information and email.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="settings-name">
              Display Name
            </label>
            <div className="relative">
              <input
                id="settings-name"
                type="text"
                {...register("name")}
                className={`${inputClass} pr-11`}
                placeholder="Your name"
              />
              <Pencil className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-rose-400" />
            </div>
            {errors.name ? <p className={errorClass}>{errors.name.message}</p> : null}
          </div>

          <div>
            <label className={labelClass} htmlFor="settings-email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
              <input
                id="settings-email"
                type="email"
                value={user.email}
                disabled
                className={`${inputClass} cursor-not-allowed bg-slate-50 pl-12 pr-24 text-slate-500`}
              />
              {user.emailVerified ? (
                <span className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  Verified
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[13px] text-slate-400">
              Email changes are disabled to keep login sessions secure.
            </p>
          </div>
        </div>
      </section>

      <section id="password-settings" className="scroll-mt-28">
        <div className="mb-6 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <KeyRound className="h-5 w-5 text-rose-500" />
            <h2 className="font-display text-[1.5rem] font-bold text-slate-900">
              Password
            </h2>
          </div>
          <p className="mt-2 text-[15px] text-slate-500">
            Change your password to keep your account secure.
          </p>
        </div>

        <div className="mb-6 flex gap-3 rounded-[18px] border border-blue-100 bg-blue-50 px-4 py-4 text-blue-700">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-[15px] leading-7">
            {user.hasPassword
              ? "Enter your current password only when you want to change it."
              : "This account does not have a password yet. Add one to enable email and password login."}
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {passwordFields.map((field) => {
            const fieldError =
              field.name === "currentPassword"
                ? errors.currentPassword
                : field.name === "newPassword"
                  ? errors.newPassword
                  : errors.confirmPassword;
            const isVisible = visiblePasswordFields[field.key];

            return (
              <div key={field.name}>
                <label className={labelClass} htmlFor={`settings-${field.name}`}>
                  {field.label}
                </label>
                <div className="relative">
                  <input
                    id={`settings-${field.name}`}
                    type={isVisible ? "text" : "password"}
                    autoComplete={field.autoComplete}
                    {...register(field.name, { setValueAs: emptyToNull })}
                    className={`${inputClass} pr-12`}
                    placeholder={field.placeholder}
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordField(field.key)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-rose-500"
                    aria-label={
                      isVisible ? "Hide password value" : "Show password value"
                    }
                  >
                    {isVisible ? (
                      <EyeOff className="h-4.5 w-4.5" />
                    ) : (
                      <Eye className="h-4.5 w-4.5" />
                    )}
                  </button>
                </div>
                {fieldError ? (
                  <p className={errorClass}>{fieldError.message}</p>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mt-3 text-[13px] text-slate-500">
          Password must be at least 8 characters long and include uppercase, lowercase and a number.
        </p>
      </section>

      <div className="pt-1">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-7 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Changes
            </>
          )}
        </button>
      </div>
    </form>
  );
}
