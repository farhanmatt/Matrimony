import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ForgotPasswordNewPasswordForm from "@/components/auth/ForgotPasswordNewPasswordForm";
import { auth } from "@/lib/auth";
import { getPasswordResetRequestFromCookies } from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Set New Password",
};

export default async function ForgotPasswordNewPasswordPage() {
  const session = await auth();

  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  const resetRequest = await getPasswordResetRequestFromCookies();

  if (!resetRequest) {
    redirect("/forgot-password");
  }

  if (
    resetRequest.pendingPasswordHash &&
    resetRequest.verificationCodeHash &&
    resetRequest.verificationCodeExpiresAt
  ) {
    redirect("/forgot-password/verify");
  }

  return <ForgotPasswordNewPasswordForm email={resetRequest.user.email} />;
}
