"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import AuthPageShell from "@/components/auth/AuthPageShell";
import {
  forgotPasswordVerificationSchema,
  type ForgotPasswordVerificationInput,
} from "@/lib/validations/auth";

type ForgotPasswordVerificationFormProps = {
  email: string;
  initialVerificationCodeExpiresAt: string;
  otpValidityMinutes: number;
};

export default function ForgotPasswordVerificationForm({
  email,
  initialVerificationCodeExpiresAt,
  otpValidityMinutes,
}: ForgotPasswordVerificationFormProps) {
  const router = useRouter();
  const [verificationCodeExpiresAt, setVerificationCodeExpiresAt] = useState(
    initialVerificationCodeExpiresAt
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [isResending, setIsResending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordVerificationInput>({
    resolver: zodResolver(forgotPasswordVerificationSchema),
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const timeLeftMs = useMemo(() => {
    const expiresAtMs = new Date(verificationCodeExpiresAt).getTime();
    return Math.max(0, expiresAtMs - currentTime);
  }, [currentTime, verificationCodeExpiresAt]);

  const isOtpExpired = timeLeftMs <= 0;

  const countdownLabel = useMemo(() => {
    const totalSeconds = Math.ceil(timeLeftMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }, [timeLeftMs]);

  const onSubmit = async (data: ForgotPasswordVerificationInput) => {
    const res = await fetch("/api/auth/forgot-password/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      if (json.otpExpired) {
        setVerificationCodeExpiresAt(new Date().toISOString());
      }
      toast.error(json.error ?? "We couldn't verify the code.");
      return;
    }

    toast.success("Password updated successfully.");
    router.push("/forgot-password/success");
    router.refresh();
  };

  const handleResendOtp = async () => {
    setIsResending(true);

    try {
      const res = await fetch("/api/auth/forgot-password/resend", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "We couldn't resend the verification code.");
        return;
      }

      reset({ code: "" });
      setVerificationCodeExpiresAt(
        json.verificationCodeExpiresAt ?? new Date().toISOString()
      );
      setCurrentTime(Date.now());
      toast.success("A new OTP has been sent to your registered email.");
    } catch {
      toast.error("We couldn't resend the verification code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthPageShell
      title="Verify the code"
      description="Enter the 6-digit code sent to your registered Gmail address."
      footer={
        <p className="text-center text-sm text-gray-600">
          Need to start over?{" "}
          <Link
            href="/forgot-password"
            className="font-semibold text-rose-600 hover:text-rose-700"
          >
            Use another email
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
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-lg tracking-[0.35em] transition-all focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              placeholder="123456"
            />
            {errors.code ? (
              <p className="mt-1 text-xs text-rose-500">{errors.code.message}</p>
            ) : isOtpExpired ? (
              <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-rose-500">
                  This OTP has expired. Click below to resend a new code.
                </p>
                <button
                  type="button"
                  onClick={() => void handleResendOtp()}
                  disabled={isResending}
                  className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isResending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    "Resend OTP"
                  )}
                </button>
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-500">
                This OTP is valid for {otpValidityMinutes} minutes. Time left:{" "}
                {countdownLabel}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isOtpExpired || isResending}
            className="w-full rounded-xl py-3 btn-primary flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Setting password...
              </>
            ) : (
              "Set Password"
            )}
          </button>
        </form>
      </div>
    </AuthPageShell>
  );
}
