"use client";

import { useEffect, useState } from "react";
import { Plus, Ticket, Search, Filter } from "lucide-react";
import { toast } from "sonner";

import CouponList from "./CouponList";
import CouponFormModal from "./CouponFormModal";
import CouponUsageModal from "./CouponUsageModal";
import { CouponCode } from "@prisma/client";

export default function CouponManagementClient() {
  const [coupons, setCoupons] = useState<CouponCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<CouponCode | null>(null);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [usageCouponId, setUsageCouponId] = useState<string | null>(null);


  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      if (data.coupons) {
        setCoupons(data.coupons);
      } else {
        toast.error(data.error || "Failed to fetch coupons");
      }
    } catch (error) {
      toast.error("An error occurred while fetching coupons");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleAddCoupon = () => {
    setSelectedCoupon(null);
    setIsModalOpen(true);
  };

  const handleEditCoupon = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Coupon deleted successfully");
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to delete coupon");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the coupon");
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await res.json();
      if (data.coupon) {
        toast.success(`Coupon ${!currentStatus ? "activated" : "deactivated"} successfully`);
        fetchCoupons();
      } else {
        toast.error(data.error || "Failed to update status");
      }
    } catch (error) {
      toast.error("An error occurred while updating status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search coupon code..."
            className="w-full rounded-xl border border-rose-100 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-rose-300 focus:outline-none focus:ring-4 focus:ring-rose-50"
            onChange={(e) => {
               // Implement search logic if needed, simplify for now
            }}
          />
        </div>
        <button
          onClick={handleAddCoupon}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Add Coupon
        </button>
      </div>

      <div className="rounded-[24px] border border-rose-100 bg-white shadow-sm overflow-hidden">
        <CouponList
          coupons={coupons}
          isLoading={isLoading}
          onEdit={handleEditCoupon}
          onDelete={handleDeleteCoupon}
          onToggleStatus={handleToggleStatus}
          onViewUsage={(id) => {
            setUsageCouponId(id);
            setIsUsageModalOpen(true);
          }}
        />
      </div>

      <CouponFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchCoupons();
        }}
        coupon={selectedCoupon}
      />

      <CouponUsageModal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        couponId={usageCouponId}
      />
    </div>
  );
}
