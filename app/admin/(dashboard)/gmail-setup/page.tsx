import { Metadata } from "next";
import GmailSetupForm from "@/components/admin/GmailSetupForm";

export const metadata: Metadata = {
  title: "Gmail Setup | Admin Panel",
};

export default function GmailSetupPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Gmail Setup
          </h1>
          <p className="text-sm text-gray-500">
            Configure the official Gmail address used across the platform for support and contact.
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-rose-100 bg-white shadow-sm p-6 max-w-2xl">
        <GmailSetupForm />
      </div>
    </div>
  );
}
