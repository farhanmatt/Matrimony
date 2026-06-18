"use client";

import { format } from "date-fns";
import { Edit2, Trash2, Power, PowerOff, CheckCircle2, XCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { CouponCode } from "@prisma/client";

interface CouponListProps {
  coupons: CouponCode[];
  isLoading: boolean;
  onEdit: (coupon: CouponCode) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
  onViewUsage: (id: string) => void;
}


export default function CouponList({
  coupons,
  isLoading,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewUsage,
}: CouponListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-600 border-t-transparent" />
        <p className="mt-4 text-sm text-gray-500">Loading coupons...</p>
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          <Trash2 className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">No coupons found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first coupon offer.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-rose-50/50 text-gray-600">
          <tr>
            <th className="px-6 py-4 font-semibold">Coupon For</th>
            <th className="px-6 py-4 font-semibold">Code</th>
            <th className="px-6 py-4 font-semibold">Discount</th>
            <th className="px-6 py-4 font-semibold">Expiry Date</th>
            <th className="px-6 py-4 font-semibold text-center">Usage</th>
            <th className="px-6 py-4 font-semibold">Status</th>
            <th className="px-6 py-4 font-semibold">Created Date</th>
            <th className="px-6 py-4 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rose-50">
          {coupons.map((coupon) => {
            const isExpired = new Date(coupon.expiresAt) < new Date();
            const displayCouponFor = coupon.couponFor
              .split("_")
              .map((word: string) => word.charAt(0) + word.slice(1).toLowerCase())
              .join(" ");

            return (
              <tr key={coupon.id} className="group transition-colors hover:bg-rose-50/20">
                <td className="px-6 py-4">
                  <span className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                    coupon.couponFor === "BOTH" ? "bg-purple-50 text-purple-700" :
                    coupon.couponFor === "PROFILE_UNLOCK" ? "bg-blue-50 text-blue-700" :
                    "bg-orange-50 text-orange-700"
                  )}>
                    {displayCouponFor}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => onViewUsage(coupon.id)}
                    className="font-mono font-bold text-gray-900 transition-colors hover:text-rose-600 hover:underline"
                  >
                    {coupon.code}
                  </button>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {coupon.discountType === "PERCENTAGE" 
                    ? `${coupon.discountValue}%` 
                    : `₹${coupon.discountValue}`}
                </td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-gray-600",
                    isExpired && "text-red-500 font-medium"
                  )}>
                    {format(new Date(coupon.expiresAt), "dd MMM yyyy")}
                    {isExpired && " (Expired)"}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-semibold text-gray-900">
                      {coupon.currentUses} / {coupon.maxUses ?? "∞"}
                    </span>
                    {coupon.maxUses && (
                      <span className="text-[10px] text-gray-500 italic">
                        {Math.max(0, coupon.maxUses - coupon.currentUses)} remaining
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5">
                    {coupon.isActive && !isExpired ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-600 font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500 font-medium">
                          {isExpired ? "Expired" : "Inactive"}
                        </span>
                      </>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">
                  {format(new Date(coupon.createdAt), "dd MMM yyyy")}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => onToggleStatus(coupon.id, coupon.isActive)}
                      title={coupon.isActive ? "Deactivate" : "Activate"}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                        coupon.isActive 
                          ? "bg-amber-50 text-amber-600 hover:bg-amber-100" 
                          : "bg-green-50 text-green-600 hover:bg-green-100"
                      )}
                    >
                      {coupon.isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => onViewUsage(coupon.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-600 transition-colors hover:bg-gray-100"
                      title="View Usage"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onEdit(coupon)}
                      title="Edit"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 transition-colors hover:bg-blue-100"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDelete(coupon.id)}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
