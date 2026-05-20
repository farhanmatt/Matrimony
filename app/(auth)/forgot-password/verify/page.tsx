"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import AuthPageShell from "@/components/auth/AuthPageShell";
import { PageLoader } from "@/components/common/LoadingSpinner";
import {
  forgotPasswordVerificationSchema,
  type ForgotPasswordVerificationInput,
} from "@/lib/validations/auth";

function ForgotPasswordVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordVerificationInput>({
    resolver: zodResolver(forgotPasswordVerificationSchema),
    defaultValues: {
      email,
      code: "",
    },
  });

  useEffect(() => {
    if (!email) {
      router.replace("/forgot-password");
      return;
    }

    setValue("email", email);
  }, [email, router, setValue]);

  const onSubmit = async (data: ForgotPasswordVerificationInput) => {
    const res = await fetch("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: data.code,
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Could not reset the password");
      return;
    }

    toast.success("Password updated successfully.");
    router.push("/login?passwordReset=success");
  };

  if (!email) {
    return <PageLoader />;
  }

  return (
    <AuthPageShell
      title="Verify code"
      description="Enter the verification code sent to your registered email."
      footer={
        <p className="text-center text-sm text-gray-600">
          Need to change the password again?{" "}
          <Link
            href={`/forgot-password/new-password?email=${encodeURIComponent(email)}`}
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
            htmlFor="verification-code"
          >
            Enter Verification Code
          </label>
          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            {...register("code")}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm tracking-[0.35em] text-center focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
            placeholder="123456"
          />
          {errors.code ? (
            <p className="text-rose-500 text-xs mt-1">{errors.code.message}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3 rounded-xl"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Setting password...
            </>
          ) : (
            "Set Password"
          )}
        </button>
      </form>
    </AuthPageShell>
  );
}

export default function ForgotPasswordVerifyPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ForgotPasswordVerifyForm />
    </Suspense>
  );
}
