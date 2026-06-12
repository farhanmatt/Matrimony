"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import SiteLogo from "@/components/common/SiteLogo";
import {
  formatOtpRemainingTime,
  getOtpRemainingSeconds,
} from "@/lib/utils/otp-timer";
import { resolveAllowedImageSrc } from "@/lib/utils/image";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";

const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

type PendingRegistrationState = {
  email: string;
  password: string;
  verificationCodeExpiresAt: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_LOGO_IMAGE);
  const [pendingRegistration, setPendingRegistration] =
    useState<PendingRegistrationState | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [otpRemainingSeconds, setOtpRemainingSeconds] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const isOtpExpired = Boolean(pendingRegistration) && otpRemainingSeconds <= 0;

  useEffect(() => {
    setLogoImageUrl(
      resolveAllowedImageSrc(
        document.body.dataset.logoImageUrl ?? "",
        DEFAULT_LOGO_IMAGE
      ) ?? DEFAULT_LOGO_IMAGE
    );

    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logoImageUrl?: string }>;
      const nextValue = customEvent.detail?.logoImageUrl ?? "";

      setLogoImageUrl(
        resolveAllowedImageSrc(nextValue, DEFAULT_LOGO_IMAGE) ??
          DEFAULT_LOGO_IMAGE
      );
    };

    window.addEventListener("branding-logo-updated", handleBrandingUpdate);
    return () =>
      window.removeEventListener("branding-logo-updated", handleBrandingUpdate);
  }, []);

  useEffect(() => {
    if (!pendingRegistration) {
      setOtpRemainingSeconds(0);
      return;
    }

    const updateRemainingSeconds = () => {
      setOtpRemainingSeconds(
        getOtpRemainingSeconds(pendingRegistration.verificationCodeExpiresAt)
      );
    };

    updateRemainingSeconds();
    const intervalId = window.setInterval(updateRemainingSeconds, 1000);

    return () => window.clearInterval(intervalId);
  }, [pendingRegistration]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: RegisterInput) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      toast.error(json.error ?? "Registration failed");
      return;
    }

    const verificationCodeExpiresAt =
      json.verificationCodeExpiresAt ??
      new Date(Date.now() + 2 * 60 * 1000).toISOString();

    setOtpRemainingSeconds(getOtpRemainingSeconds(verificationCodeExpiresAt));
    setPendingRegistration({
      email: json.email ?? data.email,
      password: data.password,
      verificationCodeExpiresAt,
    });
    setOtpCode("");
    toast.success(json.message ?? "Verification OTP sent to your email.");
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!pendingRegistration) {
      toast.error("Please submit the registration form again.");
      return;
    }

    const code = otpCode.trim();
    if (!/^\d{6}$/.test(code)) {
      toast.error("Enter the 6-digit OTP sent to your email.");
      return;
    }

    if (
      getOtpRemainingSeconds(pendingRegistration.verificationCodeExpiresAt) <= 0
    ) {
      toast.error("This OTP has expired. Please request a new OTP.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const res = await fetch("/api/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "OTP verification failed");
        return;
      }

      toast.success("Email verified! Signing you in...");

      await signIn("credentials", {
        email: pendingRegistration.email,
        password: pendingRegistration.password,
        redirect: false,
      });

      router.push("/dashboard");
      router.refresh();
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingRegistration) {
      toast.error("Please submit the registration form again.");
      return;
    }

    if (getOtpRemainingSeconds(pendingRegistration.verificationCodeExpiresAt) > 0) {
      toast.error("You can request a new OTP after the current OTP expires.");
      return;
    }

    setIsResendingOtp(true);

    try {
      const res = await fetch("/api/auth/register/resend", {
        method: "POST",
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Unable to resend OTP");
        return;
      }

      const verificationCodeExpiresAt =
        json.verificationCodeExpiresAt ??
        new Date(Date.now() + 2 * 60 * 1000).toISOString();

      setOtpCode("");
      setOtpRemainingSeconds(getOtpRemainingSeconds(verificationCodeExpiresAt));
      setPendingRegistration((current) =>
        current
          ? {
              ...current,
              verificationCodeExpiresAt,
            }
          : current
      );
      toast.success(json.message ?? "A new OTP has been sent.");
    } finally {
      setIsResendingOtp(false);
    }
  };

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="ui-enter-scale w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="ui-link-shift inline-flex items-center justify-center">
            <SiteLogo
              src={logoImageUrl}
              alt="Vivah Bandhan logo"
              className="ui-soft-float h-14 max-w-[260px] sm:h-16 sm:max-w-[320px]"
            />
          </Link>
          <h1 className="ui-enter-up mt-5 mb-1 text-2xl font-display font-bold text-gray-900" style={{ animationDelay: "120ms" }}>
            Create your account
          </h1>
        </div>

        <div className="ui-enter-up ui-card-lift rounded-2xl bg-white p-8 shadow-xl" style={{ animationDelay: "240ms" }}>
          <button
            onClick={handleGoogle}
            disabled={isGoogleLoading}
            suppressHydrationWarning
            className="ui-link-shift mb-6 flex w-full items-center justify-center gap-3 rounded-xl border-2 border-gray-200 px-4 py-3 font-medium text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 font-medium">OR REGISTER WITH EMAIL</span>
            </div>
          </div>

          {pendingRegistration ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <p className="text-sm font-semibold text-gray-900">
                  Check your email
                </p>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  We sent a 6-digit OTP to{" "}
                  <span className="font-semibold text-gray-900">
                    {pendingRegistration.email}
                  </span>
                  .
                </p>
                <p
                  className={`mt-3 text-sm font-semibold ${
                    isOtpExpired ? "text-rose-600" : "text-gray-700"
                  }`}
                >
                  {isOtpExpired
                    ? "This OTP has expired. Please request a new OTP."
                    : `OTP expires in ${formatOtpRemainingTime(
                        otpRemainingSeconds
                      )}`}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-otp">
                  Email OTP
                </label>
                <input
                  id="reg-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otpCode}
                  onChange={(event) =>
                    setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  suppressHydrationWarning
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                  placeholder="000000"
                />
                {isOtpExpired ? (
                  <p className="mt-1 text-xs text-rose-500">
                    This OTP is no longer valid.
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isVerifyingOtp || isOtpExpired}
                suppressHydrationWarning
                className="btn-primary ui-link-shift flex w-full items-center justify-center gap-2 rounded-xl py-3"
              >
                {isVerifyingOtp ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
                ) : (
                  "Verify OTP & Create Account"
                )}
              </button>

              <div className="flex flex-col gap-3 text-center text-sm sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResendingOtp || !isOtpExpired}
                  className="ui-link-shift font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-60"
                >
                  {isResendingOtp
                    ? "Sending..."
                    : isOtpExpired
                      ? "Resend OTP"
                      : `Resend in ${formatOtpRemainingTime(
                          otpRemainingSeconds
                        )}`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPendingRegistration(null);
                    setOtpCode("");
                  }}
                  className="ui-link-shift font-semibold text-gray-500 hover:text-gray-700"
                >
                  Edit details
                </button>
              </div>
            </form>
          ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-name">
                Full Name
              </label>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <input
                    id="reg-name"
                    type="text"
                    autoComplete="name"
                    {...field}
                    value={field.value ?? ""}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                    placeholder="Arjun Sharma"
                  />
                )}
              />
              {errors.name && (
                <p className="text-rose-500 text-xs mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-email">
                Email Address
              </label>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    {...field}
                    value={field.value ?? ""}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                    placeholder="you@example.com"
                  />
                )}
              />
              {errors.email && (
                <p className="text-rose-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-password">
                Password
              </label>
              <div className="relative">
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      {...field}
                      value={field.value ?? ""}
                      suppressHydrationWarning
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                      placeholder="Min. 8 characters"
                    />
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  suppressHydrationWarning
                  className="ui-link-shift absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5" htmlFor="reg-confirm">
                Confirm Password
              </label>
              <Controller
                name="confirmPassword"
                control={control}
                render={({ field }) => (
                  <input
                    id="reg-confirm"
                    type="password"
                    autoComplete="new-password"
                    {...field}
                    value={field.value ?? ""}
                    suppressHydrationWarning
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-all"
                    placeholder="Repeat your password"
                  />
                )}
              />
              {errors.confirmPassword && (
                <p className="text-rose-500 text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              suppressHydrationWarning
              className="btn-primary ui-link-shift flex w-full items-center justify-center gap-2 rounded-xl py-3"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sending OTP...</>
              ) : (
                "Create Free Account"
              )}
            </button>
          </form>
          )}

          <p className="text-center text-xs text-gray-500 mt-4 leading-relaxed">
            By registering, you agree to our{" "}
            <Link href="/terms" className="ui-link-shift text-rose-500 hover:underline">Terms</Link> and{" "}
            <Link href="/privacy" className="ui-link-shift text-rose-500 hover:underline">Privacy Policy</Link>.
          </p>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{" "}
            <Link href="/login" className="ui-link-shift font-semibold text-rose-600 hover:text-rose-700">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
