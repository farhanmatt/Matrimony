"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthPageShell from "@/components/auth/AuthPageShell";
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailInput,
} from "@/lib/validations/auth";

export default function ForgotPasswordEmailForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordEmailInput>({
    resolver: zodResolver(forgotPasswordEmailSchema),
  });

  const onSubmit = async (data: ForgotPasswordEmailInput) => {
    const res = await fetch("/api/auth/forgot-password/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "We couldn't start the password reset.");
      return;
    }

    toast.success("Email confirmed. Set your new password.");
    router.push("/forgot-password/new-password");
    router.refresh();
  };

  return (
    <AuthPageShell
      title="Forgot your password?"
      description="Enter the email address registered with your account."
      footer={
        <p className="text-center text-sm text-gray-600">
          Remembered it?{" "}
          <Link
            href="/login"
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            Back to Sign In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label
            className="mb-1.5 block text-sm font-medium text-gray-700"
            htmlFor="forgot-email"
          >
            Registered Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm transition-all focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
            placeholder="you@example.com"
          />
          {errors.email ? (
            <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl py-3 btn-primary flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </AuthPageShell>
  );
}
