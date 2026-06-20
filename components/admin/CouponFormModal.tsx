"use client";

import { useEffect, useState } from "react";
import { X, Calendar, IndianRupee, Percent } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils/helpers";
import { CouponCode } from "@prisma/client";

interface CouponFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  coupon?: CouponCode | null;
}


export default function CouponFormModal({
  isOpen,
  onClose,
  onSuccess,
  coupon,
}: CouponFormModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    couponFor: "BOTH",
    code: "",
    discountType: "PERCENTAGE",
    discountValue: "",
    expiresAt: "",
    maxUses: "",
    isActive: true,
  });

  useEffect(() => {
    if (coupon) {
      setFormData({
        couponFor: coupon.couponFor,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue.toString(),
        expiresAt: new Date(coupon.expiresAt).toISOString().split("T")[0],
        maxUses: coupon.maxUses?.toString() || "",
        isActive: coupon.isActive,
      });
    } else {
      setFormData({
        couponFor: "BOTH",
        code: "",
        discountType: "PERCENTAGE",
        discountValue: "",
        expiresAt: "",
        maxUses: "",
        isActive: true,
      });
    }
  }, [coupon, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const url = coupon ? `/api/admin/coupons/${coupon.id}` : "/api/admin/coupons";
      const method = coupon ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.coupon || data.success) {
        toast.success(coupon ? "Coupon updated" : "Coupon created");
        onSuccess();
      } else {
        toast.error(data.error || "Something went wrong");
      }
    } catch (error) {
      toast.error("Failed to save coupon");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-end bg-slate-900/40 backdrop-blur-sm lg:pr-4">
      <div 
        className="fixed inset-0" 
        onClick={onClose}
      />
      <div className="relative h-full w-full max-w-md animate-in slide-in-from-right bg-white shadow-2xl lg:h-[calc(100vh-2rem)] lg:rounded-[32px] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-50 px-6 py-6">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">
              {coupon ? "Edit Coupon" : "Add New Coupon"}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {coupon ? "Update coupon details below" : "Create a new discount offer"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 transition-colors hover:bg-rose-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <form id="coupon-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Coupon For */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Coupon For <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "PROFILE_UNLOCK", label: "Profile Unlock" },
                  { value: "CHAT_UNLOCK", label: "Chat Unlock" },
                  { value: "BOTH", label: "Both" },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, couponFor: option.value })}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-xs font-medium transition-all text-center",
                      formData.couponFor === option.value
                        ? "border-rose-500 bg-rose-50 text-rose-600 ring-1 ring-rose-500"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Coupon Code */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Coupon Code <span className="text-rose-500">*</span>
              </label>
              <input
                required
                type="text"
                placeholder="e.g. NEWUSER50"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50"
              />
            </div>

            {/* Discount Type */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Discount Type <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: "PERCENTAGE" })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                    formData.discountType === "PERCENTAGE"
                      ? "border-rose-500 bg-rose-50 text-rose-600 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  )}
                >
                  <Percent className="h-4 w-4" />
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, discountType: "FIXED" })}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
                    formData.discountType === "FIXED"
                      ? "border-rose-500 bg-rose-50 text-rose-600 shadow-sm"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  )}
                >
                  <IndianRupee className="h-4 w-4" />
                  Fixed Amount (₹)
                </button>
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Discount Value <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type="number"
                  placeholder="Enter value"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 pl-10 text-sm font-medium focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  {formData.discountType === "PERCENTAGE" ? <Percent className="h-4 w-4" /> : <IndianRupee className="h-4 w-4" />}
                </div>
              </div>
              <p className="text-[11px] text-gray-500 italic">
                {formData.discountType === "PERCENTAGE" 
                  ? "Enter discount percentage value (e.g. 10 for 10% discount)." 
                  : "Enter discount amount in rupees (e.g. 50 for ₹50 discount)."}
              </p>
            </div>

            {/* Expiry Date */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split("T")[0]}
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 pl-10 text-sm font-medium focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50"
                />
                <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            {/* Member Limit */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Member Limit
              </label>
              <input
                type="number"
                placeholder="e.g. 100 (Leave empty for unlimited)"
                value={formData.maxUses}
                onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-sm font-medium focus:border-rose-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-rose-50"
              />
              <p className="text-[11px] text-gray-500 italic">
                Maximum number of users who can use this coupon.
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">
                Status <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-6">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === true}
                    onChange={() => setFormData({ ...formData, isActive: true })}
                    className="h-4 w-4 accent-rose-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name="isActive"
                    checked={formData.isActive === false}
                    onChange={() => setFormData({ ...formData, isActive: false })}
                    className="h-4 w-4 accent-rose-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Inactive</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="border-t border-rose-50 p-6 flex items-center gap-3 bg-gray-50/30">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-[16px] border border-gray-200 bg-white py-3.5 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-50 active:scale-[0.98]"
          >
            Cancel
          </button>
          <button
            form="coupon-form"
            type="submit"
            disabled={isLoading}
            className="flex-[1.5] rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(244,63,94,0.2)] transition-all hover:shadow-[0_16px_32px_rgba(244,63,94,0.25)] active:scale-[0.98] disabled:opacity-70 disabled:grayscale"
          >
            {isLoading ? "Saving..." : coupon ? "Update Coupon" : "Create Coupon"}
          </button>
        </div>
      </div>
    </div>
  );
}
