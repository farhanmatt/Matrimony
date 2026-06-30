import { X, Ticket, Users, Percent, CreditCard, Loader2, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/lib/utils/helpers";
import { format } from "date-fns";
import { toast } from "sonner";

interface CouponUsageModalProps {
  isOpen: boolean;
  onClose: () => void;
  couponId: string | null;
}

interface CouponUsageData {
  coupon: {
    code: string;
    discountType: string;
    discountValue: number;
    expiresAt: string;
    maxUses: number | null;
    currentUses: number;
  };
  stats: {
    totalUsersUsed: number;
    remainingUsage: number | null;
    totalTimesApplied: number;
    totalDiscountAmount: number;
    totalRevenueGenerated: number;
    netProfit: number;
  };
  usageHistory: {
    userId: string;
    userName: string;
    userEmail: string;
    usedAt: string;
    amount: number;
    discountAmount: number;
  }[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export default function CouponUsageModal({
  isOpen,
  onClose,
  couponId,
}: CouponUsageModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CouponUsageData | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen || !couponId) {
      setData(null);
      setPage(1);
      return;
    }

    const fetchUsage = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/coupons/${couponId}/usage?page=${page}&limit=${limit}`);
        const json = await res.json();
        if (json.success) {
          setData(json.data);
        } else {
          toast.error(json.error || "Failed to load usage data");
        }
      } catch (err) {
        toast.error("An error occurred while fetching data");
      } finally {
        setLoading(false);
      }
    };

    fetchUsage();
  }, [isOpen, couponId, page, limit]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-rose-100 bg-gradient-to-r from-rose-50/50 to-white px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-rose-100/80 text-rose-600 shadow-sm">
              <Ticket className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">
                {data?.coupon.code ? `Coupon: ${data.coupon.code}` : "Coupon Details"}
              </h2>
              <p className="text-sm font-medium text-slate-500 mt-0.5">
                Comprehensive analytics and usage history
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="group flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-5 w-5 transition-transform group-hover:scale-110" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading && !data ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Top Stats Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Stat Card 1 */}
                <div className="relative overflow-hidden rounded-[16px] border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-emerald-100/20 p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Usage Limit</p>
                  <p className="mt-0.5 font-display text-xl font-bold text-slate-900">
                    {data.stats.totalTimesApplied} / {data.coupon.maxUses ? data.coupon.maxUses : "∞"}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
                    {data.stats.remainingUsage !== null ? `${data.stats.remainingUsage} uses remaining` : "Unlimited uses"}
                  </p>
                </div>

                {/* Stat Card 2 */}
                <div className="relative overflow-hidden rounded-[16px] border border-blue-100 bg-gradient-to-br from-blue-50/50 to-blue-100/20 p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                    <Users className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Unique Users</p>
                  <p className="mt-0.5 font-display text-xl font-bold text-slate-900">
                    {data.stats.totalUsersUsed}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-blue-600">
                    Total members who applied this
                  </p>
                </div>

                {/* Stat Card 3 */}
                <div className="relative overflow-hidden rounded-[16px] border border-purple-100 bg-gradient-to-br from-purple-50/50 to-purple-100/20 p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                    <Percent className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Discount</p>
                  <p className="mt-0.5 font-display text-xl font-bold text-slate-900">
                    {formatCurrency(data.stats.totalDiscountAmount)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-purple-600">
                    Value given back to users
                  </p>
                </div>

                {/* Stat Card 4 */}
                <div className="relative overflow-hidden rounded-[16px] border border-amber-100 bg-gradient-to-br from-amber-50/50 to-amber-100/20 p-4">
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Revenue</p>
                  <p className="mt-0.5 font-display text-xl font-bold text-slate-900">
                    {formatCurrency(data.stats.netProfit)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-amber-600">
                    Generated from coupon users
                  </p>
                </div>
              </div>

              {/* Basic Details Horizontal Row */}
              <div className="rounded-[16px] border border-slate-100 bg-slate-50/50 p-4">
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-wider text-slate-900">Coupon Setup</h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Discount Value</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {data.coupon.discountType === "PERCENTAGE" 
                        ? `${data.coupon.discountValue}% OFF` 
                        : `${formatCurrency(data.coupon.discountValue)} OFF`}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Expiry Date</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {format(new Date(data.coupon.expiresAt), "dd MMM yyyy")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Avg Revenue / Use</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {data.stats.totalTimesApplied > 0 
                        ? formatCurrency(data.stats.totalRevenueGenerated / data.stats.totalTimesApplied)
                        : "₹0"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-slate-500">Avg Discount / Use</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {data.stats.totalTimesApplied > 0 
                        ? formatCurrency(data.stats.totalDiscountAmount / data.stats.totalTimesApplied)
                        : "₹0"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage History Table */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900">Usage History</h3>
                  <div className="text-xs font-medium text-slate-500">
                    Total Uses: <span className="text-slate-900 font-bold">{data.pagination.total}</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-[20px] border border-slate-200 bg-white">
                  {loading && data.usageHistory.length === 0 ? (
                    <div className="flex h-[200px] items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-rose-500" />
                    </div>
                  ) : data.usageHistory.length > 0 ? (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-[13px] font-semibold uppercase tracking-wider text-slate-500">
                            <tr>
                              <th className="px-6 py-4">User Details</th>
                              <th className="px-6 py-4">User ID</th>
                              <th className="px-6 py-4">Used At</th>
                              <th className="px-6 py-4 text-right">Discount Given</th>
                              <th className="px-6 py-4 text-right">Revenue</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {data.usageHistory.map((history, idx) => (
                              <tr key={`${history.userId}-${idx}`} className="transition-colors hover:bg-slate-50/80">
                                <td className="px-6 py-4">
                                  <p className="font-semibold text-slate-900">{history.userName}</p>
                                  <p className="text-[13px] text-slate-500">{history.userEmail}</p>
                                </td>
                                <td className="px-6 py-4 font-mono text-[13px] text-slate-500">
                                  {history.userId.slice(-8)}
                                </td>
                                <td className="px-6 py-4 text-slate-600">
                                  {format(new Date(history.usedAt), "dd MMM yyyy, hh:mm a")}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-rose-600">
                                  {formatCurrency(history.discountAmount)}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                  {formatCurrency(history.amount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 gap-3">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-[12px] font-medium text-slate-500">
                            <span>Rows per page:</span>
                            <select
                              value={limit}
                              onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                              }}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-slate-900 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-colors cursor-pointer"
                              disabled={loading}
                            >
                              <option value={10}>10</option>
                              <option value={25}>25</option>
                              <option value={50}>50</option>
                              <option value={100}>100</option>
                            </select>
                          </div>
                          <span className="text-[12px] font-medium text-slate-500">
                            Page <span className="font-bold text-slate-900">{data.pagination.page}</span> of{" "}
                            <span className="font-bold text-slate-900">{data.pagination.totalPages > 0 ? data.pagination.totalPages : 1}</span>
                          </span>
                        </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setPage((p) => Math.max(1, p - 1))}
                              disabled={data.pagination.page === 1 || loading}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            
                            {/* Page Numbers */}
                            <div className="hidden sm:flex items-center gap-1">
                              {Array.from({ length: Math.min(5, data.pagination.totalPages) }).map((_, i) => {
                                let pageNum = i + 1;
                                if (data.pagination.totalPages > 5) {
                                  if (data.pagination.page > 3) {
                                    pageNum = data.pagination.page - 2 + i;
                                    if (pageNum > data.pagination.totalPages) {
                                      pageNum = data.pagination.totalPages - 4 + i;
                                    }
                                  }
                                }
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors ${
                                      data.pagination.page === pageNum
                                        ? "border-rose-200 bg-rose-50 text-rose-600"
                                        : "border-transparent text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                              disabled={data.pagination.page === data.pagination.totalPages || loading}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                        <Users className="h-8 w-8 text-slate-300" />
                      </div>
                      <p className="mt-4 font-semibold text-slate-900">No usage history found</p>
                      <p className="mt-1 text-sm text-slate-500">This coupon hasn&apos;t been used by any members yet.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
