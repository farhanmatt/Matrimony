"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthPageShell from "@/components/auth/AuthPageShell";
import {
  forgotPasswordPasswordSchema,
  type ForgotPasswordPasswordInput,
} from "@/lib/validations/auth";

type ForgotPasswordNewPasswordFormProps = {
  email: string;
};

export default function ForgotPasswordNewPasswordForm({
  email,
}: ForgotPasswordNewPasswordFormProps) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordPasswordInput>({
    resolver: zodResolver(forgotPasswordPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordPasswordInput) => {
    const res = await fetch("/api/auth/forgot-password/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "We couldn't send the verification code.");
      return;
    }

    toast.success("Verification code sent to your Gmail address.");
    router.push("/forgot-password/verify");
    router.refresh();
  };

  return (
    <AuthPageShell
      title="Set a new password"
      description="Create the password you want to use for future sign-ins."
      footer={
        <p className="text-center text-sm text-gray-600">
          Need another email?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            Start over
          </Link>
        </p>
      }
    >
      <div className="space-y-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            Registered Email Address
          </p>
          <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {email}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-gray-700"
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
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-11 text-sm transition-all focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Min. 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-xs text-rose-500">
                {errors.password.message}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                Use at least 8 characters with uppercase, lowercase, and a
                number.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl py-3 btn-primary flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Sending code...
              </>
            ) : (
              "Continue"
            )}
          </button>
        </form>
      </div>
    </AuthPageShell>
  );
}
