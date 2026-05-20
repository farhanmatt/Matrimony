"use client";

import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import {
  forgotPasswordNewPasswordSchema,
  type ForgotPasswordNewPasswordInput,
} from "@/lib/validations/auth";

function ForgotPasswordNewPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordNewPasswordInput>({
    resolver: zodResolver(forgotPasswordNewPasswordSchema),
    defaultValues: {
      email,
      password: "",
    },
  });

  useEffect(() => {
    if (!email) {
      router.replace("/forgot-password");
      return;
    }

    setValue("email", email);
  }, [email, router, setValue]);

  const onSubmit = async (data: ForgotPasswordNewPasswordInput) => {
    const res = await fetch("/api/auth/forgot-password/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: data.password,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Could not send the verification code");
      return;
    }

    toast.success("Verification code sent to your email.");
    router.push(`/forgot-password/verify?email=${encodeURIComponent(email)}`);
  };

  if (!email) {
    return <PageLoader />;
  }

  return (
    <AuthPageShell
      title="Set new password"
      description="Create a new password for your registered account."
      footer={
        <p className="text-center text-sm text-gray-600">
          Need a different email?{" "}
          <Link
            href="/forgot-password"
            className="text-rose-600 font-semibold hover:text-rose-700"
          >
            Go back
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <input type="hidden" {...register("email")} />

        <div>
          <span className="block text-sm font-medium text-gray-700 mb-1.5">
            Registered Email Address
          </span>
          <div className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            {email}
          </div>
        </div>

        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="reset-password"
          >
            Set New Password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              {...register("password")}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
              placeholder="Min. 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {errors.password ? (
            <p className="text-rose-500 text-xs mt-1">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Sending code...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </AuthPageShell>
  );
}

export default function ForgotPasswordNewPasswordPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ForgotPasswordNewPasswordForm />
    </Suspense>
  );
}
