"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { getCredentialsErrorMessage } from "@/lib/auth-error-messages";
import {
  adminLoginSchema,
  type AdminLoginInput,
} from "@/lib/validations/auth";
import { PageLoader } from "@/components/common/LoadingSpinner";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/admin";
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-900/20 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Back to Site */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to website</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 p-[1px] mb-6">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Admin Console
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Enter your administrative credentials to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label 
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" 
                htmlFor="admin-email"
              >
                Admin Email or Name
              </label>
              <input
                id="admin-email"
                type="text"
                {...register("identifier")}
                suppressHydrationWarning
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all placeholder:text-slate-600"
                placeholder="admin@matrimony.com or Admin User"
              />
              {errors.identifier && (
                <p className="text-rose-500 text-xs mt-1">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label 
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2" 
                htmlFor="admin-password"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  suppressHydrationWarning
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3.5 pr-12 text-white text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  suppressHydrationWarning
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              suppressHydrationWarning
              className="w-full bg-gradient-to-r from-rose-600 to-indigo-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-rose-900/20 hover:shadow-rose-900/40 hover:-translate-y-0.5 transition-all active:translate-y-0 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Authenticating...</>
              ) : (
                <>Sign In to Dashboard</>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <p className="text-center text-slate-500 text-xs mt-8">
          &copy; <span suppressHydrationWarning>{new Date().getFullYear()}</span>{" "}
          Vivah Bandhan Administration System.
          <br />Secure encrypted connection active.
        </p>
      </div>
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
