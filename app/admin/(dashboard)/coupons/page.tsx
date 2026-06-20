import { Metadata } from "next";
import CouponManagementClient from "@/components/admin/CouponManagementClient";

export const metadata: Metadata = {
  title: "Coupon Management | Admin Panel",
  description: "Manage coupon offers for profile and chat unlocks.",
};

export default function CouponManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">
            Coupon Management
          </h1>
          <p className="text-sm text-gray-500">
            Create and manage coupon offers for your users.
          </p>
        </div>
      </div>

      <CouponManagementClient />
    </div>
  );
}
