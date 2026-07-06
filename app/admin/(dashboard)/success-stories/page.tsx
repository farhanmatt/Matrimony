import { Metadata } from "next";
import SuccessStoriesClient from "@/components/admin/SuccessStoriesClient";

export const metadata: Metadata = {
  title: "Success Stories | Admin Panel",
  description: "Manage success stories for the landing page.",
};

export default function SuccessStoriesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Success Stories
          </h1>
          <p className="text-sm text-gray-500">
            Manage success stories displayed on the landing page.
          </p>
        </div>
      </div>

      <SuccessStoriesClient />
    </div>
  );
}
