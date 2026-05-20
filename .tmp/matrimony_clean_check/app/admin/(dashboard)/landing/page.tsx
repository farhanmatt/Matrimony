import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLandingSettingsForm from "@/components/admin/AdminLandingSettingsForm";

export const metadata: Metadata = {
  title: "Landing Banner - Admin",
};

export default async function AdminLandingPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Landing Banner</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update the hero image used on the front landing page.
        </p>
      </div>

      <div className="border-t border-gray-200" />

      <AdminLandingSettingsForm />
    </div>
  );
}
