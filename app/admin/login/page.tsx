"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { getCredentialsErrorMessage } from "@/lib/auth-error-messages";
import SiteLogo from "@/components/common/SiteLogo";
import { resolveAllowedImageSrc } from "@/lib/utils/image";
import {
  adminLoginSchema,
  type AdminLoginInput,
} from "@/lib/validations/auth";
import { PageLoader } from "@/components/common/LoadingSpinner";

const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

function DotPattern({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute grid grid-cols-5 gap-3 ${className}`}
    >
      {Array.from({ length: 20 }).map((_, index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 rounded-full bg-rose-200/80"
        />
      ))}
    </div>
  );
}

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [showPassword, setShowPassword] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_LOGO_IMAGE);

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginInput) => {
    try {
      const result = await signIn("credentials", {
        identifier: data.identifier,
        email: data.identifier,
        password: data.password,
        portal: "admin",
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        toast.error(
          result.error === "CredentialsSignin"
            ? getCredentialsErrorMessage(result.code, { admin: true })
            : "Authentication failed. Please try again."
        );
        return;
      }

      toast.success("Admin access granted. Welcome back.");
      router.replace(result?.url ?? callbackUrl);
      router.refresh();
    } catch (error) {
      toast.error("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="relative h-[100svh] overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,247,250,0.98)_30%,rgba(255,255,255,0.94)_68%,rgba(255,243,247,0.98)_100%)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 bottom-[-8rem] h-[28rem] w-[28rem] rounded-full bg-rose-200/45 blur-3xl" />
        <div className="absolute -right-24 top-[18rem] h-[24rem] w-[24rem] rounded-full bg-pink-100/70 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-72 bg-[radial-gradient(circle_at_center,rgba(255,137,173,0.12),transparent_70%)]" />
        <div className="absolute left-[-8rem] bottom-10 h-[24rem] w-[32rem] rounded-[50%] border border-rose-100/70" />
        <div className="absolute left-[-5rem] bottom-[-3rem] h-[20rem] w-[28rem] rounded-[50%] border border-rose-100/60" />
        <div className="absolute right-[-7rem] bottom-14 h-[18rem] w-[18rem] rounded-full border border-rose-100/60" />
        <DotPattern className="left-10 bottom-16" />
        <DotPattern className="right-12 top-10 hidden sm:grid" />
        <div className="absolute bottom-10 right-6 text-rose-100/90 sm:right-14">
          <ShieldCheck className="h-28 w-28 sm:h-40 sm:w-40" strokeWidth={1.2} />
        </div>
      </div>

      <Link
        href="/"
        className="group absolute left-4 top-4 z-20 inline-flex items-center gap-2 text-sm font-medium text-rose-500 transition-colors hover:text-rose-600 sm:left-7 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        <span>Back to website</span>
      </Link>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-4xl items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[560px] flex-col items-center justify-center">
          <div className="text-center">
            <div className="flex justify-center">
              <SiteLogo
                src={logoImageUrl}
                alt="Vivah Bandhan logo"
                className="h-14 max-w-[320px] sm:h-16 sm:max-w-[420px]"
              />
            </div>
            <p className="mt-1.5 text-xs font-semibold tracking-[0.34em] text-slate-700 sm:text-sm">
              ADMIN CONSOLE
            </p>
            <p className="mt-2.5 text-sm text-slate-600 sm:text-[15px]">
              Sign in to access your admin dashboard
            </p>
          </div>

          <div className="mt-5 w-full rounded-[1.65rem] border border-white/80 bg-white/85 p-4 shadow-[0_24px_70px_rgba(251,113,133,0.14)] backdrop-blur-xl sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-[18px]">
              <div className="mx-auto w-full max-w-[440px]">
                <label
                  className="mb-1.5 block text-sm font-semibold text-slate-900"
                  htmlFor="admin-email"
                >
                  Email or Username
                </label>
                <div className="group flex items-center rounded-2xl border border-rose-100 bg-white/90 px-4 shadow-sm transition-all focus-within:border-rose-300 focus-within:shadow-[0_0_0_4px_rgba(251,113,133,0.12)]">
                  <User className="h-[18px] w-[18px] text-rose-400" />
                  <input
                    id="admin-email"
                    type="text"
                    autoComplete="username"
                    {...register("identifier")}
                    suppressHydrationWarning
                    className="h-11 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Enter admin email or username"
                  />
                </div>
                {errors.identifier ? (
                  <p className="mt-1 text-xs text-rose-500">
                    {errors.identifier.message}
                  </p>
                ) : null}
              </div>

              <div className="mx-auto w-full max-w-[440px]">
                <label
                  className="mb-1.5 block text-sm font-semibold text-slate-900"
                  htmlFor="admin-password"
                >
                  Password
                </label>
                <div className="group flex items-center rounded-2xl border border-rose-100 bg-white/90 px-4 shadow-sm transition-all focus-within:border-rose-300 focus-within:shadow-[0_0_0_4px_rgba(251,113,133,0.12)]">
                  <Lock className="h-[18px] w-[18px] text-rose-400" />
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    {...register("password")}
                    suppressHydrationWarning
                    className="h-11 w-full bg-transparent px-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    suppressHydrationWarning
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="text-slate-400 transition-colors hover:text-slate-600"
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
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                suppressHydrationWarning
                className="mx-auto flex w-full max-w-[440px] items-center justify-center gap-3 rounded-2xl bg-[#f44b5e] px-6 py-3 text-base font-semibold text-white shadow-[0_16px_30px_rgba(244,75,94,0.22)] transition-all hover:-translate-y-0.5 hover:bg-[#eb4155] hover:shadow-[0_20px_36px_rgba(244,75,94,0.28)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <div className="my-5 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                Or
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-2.5 rounded-2xl border border-rose-100/70 bg-gradient-to-r from-rose-50 via-white to-rose-50 p-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 sm:border-r sm:border-rose-100 sm:pr-3">
                <ShieldCheck className="mt-0.5 h-[18px] w-[18px] flex-none text-rose-500" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 sm:text-sm">
                    Secure Access
                  </p>
                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Protected admin area
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:border-r sm:border-rose-100 sm:px-3">
                <BarChart3 className="mt-0.5 h-[18px] w-[18px] flex-none text-rose-500" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 sm:text-sm">
                    Powerful Analytics
                  </p>
                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Real-time insights
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:pl-3">
                <Users className="mt-0.5 h-[18px] w-[18px] flex-none text-rose-500" />
                <div>
                  <p className="text-[13px] font-semibold text-slate-900 sm:text-sm">
                    User Management
                  </p>
                  <p className="text-[11px] text-slate-500 sm:text-xs">
                    Manage users and profiles
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <p className="absolute inset-x-0 bottom-3 z-20 text-center text-[11px] text-slate-500 sm:bottom-4 sm:text-xs">
        &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span>{" "}
        Vivah Bandhan Administration System. All rights reserved.
      </p>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLoginForm />
    </Suspense>
  );
}
