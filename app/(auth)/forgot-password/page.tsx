import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ForgotPasswordEmailForm from "@/components/auth/ForgotPasswordEmailForm";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Forgot Password",
};

export default async function ForgotPasswordPage() {
  const session = await auth();

  if (session) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/dashboard");
  }

  return <ForgotPasswordEmailForm />;
}
