import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ForgotPasswordVerificationForm from "@/components/auth/ForgotPasswordVerificationForm";
import { auth } from "@/lib/auth";
import {
  getPasswordResetRequestFromCookies,
  PASSWORD_RESET_CODE_TTL_MINUTES,
} from "@/lib/password-reset";

export const metadata: Metadata = {
  title: "Verify Password Reset",
};

export default async function ForgotPasswordVerifyPage() {
  const session = await auth();

  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  const resetRequest = await getPasswordResetRequestFromCookies();

  if (!resetRequest) {
    redirect("/forgot-password");
  }

  if (
    !resetRequest.pendingPasswordHash ||
    !resetRequest.verificationCodeHash ||
    !resetRequest.verificationCodeExpiresAt
  ) {
    redirect("/forgot-password/new-password");
  }

  return (
    <ForgotPasswordVerificationForm
      email={resetRequest.user.email}
      initialVerificationCodeExpiresAt={resetRequest.verificationCodeExpiresAt.toISOString()}
      otpValidityMinutes={PASSWORD_RESET_CODE_TTL_MINUTES}
    />
  );
}
