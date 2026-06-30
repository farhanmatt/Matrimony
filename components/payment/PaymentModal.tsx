"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Lock, CreditCard, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";
import { toast } from "sonner";

interface PaymentModalProps {
  matchId?: string;
  targetProfileId?: string;
  profileName?: string;
  baseAmount: number;
  profileAmount: number;
  perProfileChatAmount: number;
  type?: "PROFILE" | "CHAT";
  onClose: () => void;
  onSuccess: (
    matchId: string,
    options?: { redirectToUnlocked?: boolean }
  ) => void;
}

type UnlockStatus = "idle" | "processing" | "success" | "error";

export default function PaymentModal({
  matchId,
  targetProfileId,
  profileName,
  baseAmount,
  profileAmount,
  perProfileChatAmount,
  type = "PROFILE",
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [status, setStatus] = useState<UnlockStatus>("idle");
  const [actualMatchId, setActualMatchId] = useState(matchId || "");
  const total = type === "CHAT" ? perProfileChatAmount : baseAmount + profileAmount;
  const hasFinishedSuccessRef = useRef(false);
  const [mounted, setMounted] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number; finalAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (matchId) {
      setActualMatchId(matchId);
    }
  }, [matchId]);

  const finishSuccess = useCallback(
    (options?: { redirectToUnlocked?: boolean }) => {
      if (hasFinishedSuccessRef.current) {
        return;
      }

      hasFinishedSuccessRef.current = true;
      onSuccess(actualMatchId, options);
    },
    [actualMatchId, onSuccess]
  );

  useEffect(() => {
    if (status !== "success") {
      hasFinishedSuccessRef.current = false;
      return;
    }

    const timeout = window.setTimeout(
      () => {
        finishSuccess({ redirectToUnlocked: type === "PROFILE" });
      },
      type === "CHAT" ? 0 : 1000
    );

    return () => window.clearTimeout(timeout);
  }, [finishSuccess, status, type]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");

    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, totalAmount: total, unlockType: type }),
      });
      const data = await res.json();

      if (!res.ok || !data.valid) {
        setCouponError(data.error || "Invalid coupon code");
        setAppliedCoupon(null);
      } else {
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
        });
        toast.success(data.message);
      }
    } catch (err) {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handlePay = async () => {
    if (status === "processing") {
      return;
    }

    console.log("PAY BUTTON CLICKED", { matchId, targetProfileId, type });
    setStatus("processing");

    try {
      console.log("FETCHING /api/unlock...");
      const unlockRes = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, targetProfileId, type, couponCode: appliedCoupon?.code }),
      });
      const unlockData = await unlockRes.json();

      if (!unlockRes.ok) {
        toast.error(unlockData.error ?? `Failed to unlock ${type.toLowerCase()}`);
        setStatus("error");
        return;
      }

      const resolvedMatchId = unlockData.data?.matchId ?? matchId ?? "";
      setActualMatchId(resolvedMatchId);
      setStatus("success");
      toast.success(
        unlockData.alreadyUnlocked
          ? `${type === "CHAT" ? "Chat" : "Profile"} already unlocked.`
          : `${type === "CHAT" ? "Chat" : "Profile"} unlocked successfully.`
      );
    } catch {
      setStatus("error");
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleModalClose = () => {
    if (status === "processing") {
      return;
    }

    if (status === "success") {
      finishSuccess({ redirectToUnlocked: type === "PROFILE" });
      return;
    }

    onClose();
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleModalClose}
      />

      <div className="relative flex w-full max-w-[420px] flex-col overflow-hidden border border-white/20 bg-white shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-2xl">
        {/* Header Section */}
        <div className="relative shrink-0 bg-gradient-to-br from-rose-600 via-rose-500 to-pink-500 px-4 py-4 text-center text-white">
          <div className="absolute top-3 right-3 z-10">
             <button
              onClick={handleModalClose}
              className="group flex h-9 w-9 items-center justify-center rounded-full bg-black/10 transition-all hover:bg-black/20"
            >
              <X className="h-5 w-5 transition-transform group-hover:scale-110" />
            </button>
          </div>
          
          {/* Decorative background circles */}
          <div className="absolute -left-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl opacity-60" />
          <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-pink-400/20 blur-2xl opacity-40" />

          <div className="relative flex flex-col items-center gap-2">
            <div className="ui-soft-float flex h-10 w-10 items-center justify-center rounded-[16px] bg-white/20 shadow-inner backdrop-blur-md">
               <Lock className="h-5 w-5 text-white drop-shadow-sm" />
            </div>
            <div className="space-y-0.5">
              <h2 className="font-display text-xl font-bold tracking-tight">
                {type === "CHAT" ? "Unlock Chat" : "Unlock Profile"}
              </h2>
              <p className="mx-auto max-w-[280px] text-[13px] font-medium text-rose-100/90 leading-relaxed">
                {type === "CHAT" 
                  ? `Get instant messaging access to ${profileName?.split(" ")[0] || "this profile"}.`
                  : "Get full access to contact details and complete profile details."}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {status === "success" ? (
            <div className="py-6 text-center">
              <div className="ui-icon-lift mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle className="h-10 w-10 text-emerald-500" />
              </div>
              <h3 className="mb-3 font-display text-[1.6rem] font-bold text-slate-900">
                {type === "CHAT" ? "Success! Chat Unlocked" : "Success! Profile Unlocked"}
              </h3>
              <p className="px-2 text-[15px] leading-relaxed text-slate-500">
                Payment successful. {type === "CHAT" 
                  ? "Accessing conversation now." 
                  : `Full details for ${profileName || "this profile"} are now visible.`}
              </p>

              <div className="mt-10 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 rounded-full bg-rose-50 px-5 py-2.5 text-sm font-bold text-rose-600">
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  {type === "PROFILE" ? "Redirecting..." : "Opening Chat..."}
                </div>
              </div>
            </div>
          ) : status === "error" ? (
            <div className="py-6 text-center">
              <div className="ui-icon-lift mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50">
                <AlertCircle className="h-10 w-10 text-rose-500" />
              </div>
              <h3 className="mb-2 font-display text-[1.6rem] font-bold text-slate-900 leading-tight">
                Oops! Unlock Failed
              </h3>
              <p className="mb-10 px-4 text-[15px] leading-relaxed text-slate-500">
                We couldn&apos;t process your transaction. Please check your network or try a different payment method.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition-all hover:bg-slate-800 hover:shadow-xl active:scale-[0.98]"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Payment Summary Box */}
              <div className="mb-4 overflow-hidden rounded-[20px] border border-rose-100 bg-rose-50/20 p-3.5 shadow-inner">
                <div className="space-y-3">
                  {type === "PROFILE" ? (
                    <>
                      <div className="flex justify-between text-[15px] text-slate-500 font-medium">
                        <span>Base Amount</span>
                        <span className="text-slate-900">{formatCurrency(baseAmount)}</span>
                      </div>
                      <div className="flex justify-between text-[15px] text-slate-500 font-medium pb-4 border-b border-rose-100/50">
                        <span>Profile Unlock Fee</span>
                        <span className="text-slate-900">{formatCurrency(profileAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-[15px] text-slate-500 font-medium pb-4 border-b border-rose-100/50">
                      <span>Chat Unlock Fee</span>
                      <span className="text-slate-900">{formatCurrency(perProfileChatAmount)}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-base font-bold text-slate-900 uppercase tracking-wider">Total Due</span>
                    <div className="text-right flex flex-col items-end">
                      {appliedCoupon && (
                        <span className="text-sm font-semibold text-slate-400 line-through mb-0.5">
                          {formatCurrency(total)}
                        </span>
                      )}
                      <span className="block text-2xl font-display font-black text-rose-600 leading-none">
                        {formatCurrency(appliedCoupon ? appliedCoupon.finalAmount : total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Coupon Section */}
              <div className="mb-4 overflow-hidden rounded-[20px] border border-rose-100 bg-white p-3 shadow-sm">
                {!appliedCoupon ? (
                  <div className="flex flex-col gap-2">
                    <label htmlFor="couponCode" className="text-[13px] font-bold uppercase tracking-wider text-slate-500">
                      Have a Coupon Code?
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="couponCode"
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError("");
                        }}
                        placeholder="Enter code"
                        className="flex-1 rounded-xl border border-rose-100 bg-slate-50 px-4 py-2 text-sm font-semibold uppercase text-slate-700 outline-none transition-colors focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                        className="flex min-w-[80px] items-center justify-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-xs font-medium text-rose-500">{couponError}</p>}
                  </div>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                    <div>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm font-bold uppercase tracking-wide">
                          {appliedCoupon.code} APPLIED
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs font-medium text-emerald-600">
                        You save {formatCurrency(appliedCoupon.discountAmount)}!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-xs font-bold text-slate-400 underline transition-colors hover:text-slate-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Perks List */}
              <div className="mb-5 space-y-1.5 px-1">
                {(type === "CHAT" 
                  ? [
                      "Direct messaging for this profile",
                      "Lifetime chat access preserved",
                      "Instant connection established",
                      "Priority support assistance"
                    ]
                  : [
                      "Verified phone & personal details",
                      "Full education & career insights",
                      "HD photos without watermarks",
                      "Direct profile PDF download",
                    ]
                ).map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-[13px] text-slate-600">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100/50">
                      <CheckCircle className="h-3 w-3 text-emerald-500" />
                    </div>
                    <span className="font-medium">{item}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handlePay}
                disabled={status === "processing"}
                className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 py-3 text-[14px] font-bold text-white shadow-[0_16px_32px_-8px_rgba(244,63,94,0.4)] transition-all hover:shadow-[0_20px_40px_-6px_rgba(244,63,94,0.5)] hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-70"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 transition-transform group-hover:scale-110" />
                    <span>Pay {formatCurrency(appliedCoupon ? appliedCoupon.finalAmount : total)} & Unlock Now</span>
                  </>
                )}
              </button>
              
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Secure 256-bit SSL encrypted payment
              </p>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
