import type { Metadata } from "next";
import Link from "next/link";
import AuthPageShell from "@/components/auth/AuthPageShell";

export const metadata: Metadata = {
  title: "Password Updated",
};

export default function ForgotPasswordSuccessPage() {
  return (
    <AuthPageShell
      title="Password updated"
      description="Your password has been changed successfully."
      footer={
        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-semibold text-white btn-primary"
          >
            Back to Sign In
          </Link>
        </div>
      }
    >
      <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-sm leading-6 text-emerald-700">
        You can now sign in using your new password.
      </div>
    </AuthPageShell>
  );
}
