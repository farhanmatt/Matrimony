"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import AuthPageShell from "@/components/auth/AuthPageShell";
import {
  forgotPasswordEmailSchema,
  type ForgotPasswordEmailInput,
} from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
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
      toast.error(json.error ?? "Could not continue with password reset");
      return;
    }

    router.push(
      `/forgot-password/new-password?email=${encodeURIComponent(json.email)}`
    );
  };

  return (
    <AuthPageShell
      title="Forgot password"
      description="Enter your registered email address to continue."
      footer={
        <p className="text-center text-sm text-gray-600">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="text-rose-600 font-semibold hover:text-rose-700"
          >
            Sign In
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-1.5"
            htmlFor="forgot-email"
          >
            Registered Email Address
          </label>
          <input
            id="forgot-email"
            type="email"
            autoComplete="email"
            {...register("email")}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
            placeholder="you@example.com"
          />
          {errors.email ? (
            <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Checking...
            </>
          ) : (
            "Continue"
          )}
        </button>
      </form>
    </AuthPageShell>
  );
}
