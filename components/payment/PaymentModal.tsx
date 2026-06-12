"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Lock, CreditCard, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/helpers";
import { toast } from "sonner";

interface PaymentModalProps {
  matchId: string;
  profileName?: string;
  baseAmount: number;
  profileAmount: number;
  perProfileChatAmount: number;
  onClose: () => void;
  onSuccess: (
    matchId: string,
    options?: { redirectToUnlocked?: boolean }
  ) => void;
}

type UnlockStatus = "idle" | "processing" | "success" | "error";

export default function PaymentModal({
  matchId,
  profileName,
  baseAmount,
  profileAmount,
  perProfileChatAmount,
  onClose,
  onSuccess,
}: PaymentModalProps) {
  const [status, setStatus] = useState<UnlockStatus>("idle");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const subtotal = baseAmount + profileAmount + perProfileChatAmount;
  const total = subtotal - (appliedCoupon?.discountAmount || 0);

  const hasFinishedSuccessRef = useRef(false);

  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const res = await fetch("/api/coupon/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, totalAmount: subtotal }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: data.code,
          discountAmount: data.discountAmount,
          message: data.message,
        });
        toast.success(data.message);
      } else {
        toast.error(data.error || "Invalid coupon code");
      }
    } catch {
      toast.error("Failed to validate coupon");
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const finishSuccess = useCallback(
    (options?: { redirectToUnlocked?: boolean }) => {
      if (hasFinishedSuccessRef.current) {
        return;
      }

      hasFinishedSuccessRef.current = true;
      onSuccess(matchId, options);
    },
    [matchId, onSuccess]
  );

  useEffect(() => {
    if (status !== "success") {
      hasFinishedSuccessRef.current = false;
      return;
    }

    const timeout = window.setTimeout(() => {
      finishSuccess({ redirectToUnlocked: true });
    }, 1500);

    return () => window.clearTimeout(timeout);
  }, [finishSuccess, status]);

  const handlePay = async () => {
    if (status === "processing") {
      return;
    }

    setStatus("processing");

    try {
      const unlockRes = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          matchId,
          couponCode: appliedCoupon?.code 
        }),
      });
      const unlockData = await unlockRes.json();

      if (!unlockRes.ok) {
        toast.error(unlockData.error ?? "Failed to unlock profile");
        setStatus("error");
        return;
      }

      setStatus("success");
      toast.success(
        unlockData.alreadyUnlocked
          ? "Profile already unlocked."
          : "Profile unlocked successfully."
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
      finishSuccess({ redirectToUnlocked: true });
      return;
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleModalClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className="h-5 w-5" />
              <h2 className="font-display text-lg font-bold">Unlock Profile</h2>
            </div>
            <button
              onClick={handleModalClose}
              className="rounded-full p-1 transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-1 text-sm text-rose-100">
            Get full access to contact details and complete profile
          </p>
        </div>

        <div className="p-6">
          {status === "success" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-9 w-9 text-green-500" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-gray-900">
                Profile Unlocked
              </h3>
              <p className="text-sm text-gray-500">
                You unlocked {profileName ? `${profileName}'s` : "this"} profile.
                It has been moved to Unlocked Profiles. Opening it now...
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-center gap-2 text-sm font-medium text-rose-500">
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  Redirecting to Unlocked Profiles
                </div>
                <button
                  onClick={() => finishSuccess({ redirectToUnlocked: true })}
                  className="btn-primary w-full rounded-xl py-3 text-sm"
                >
                  Open Unlocked Profiles Now
                </button>
              </div>
            </div>
          ) : status === "error" ? (
            <div className="py-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-9 w-9 text-red-500" />
              </div>
              <h3 className="mb-2 font-display text-xl font-bold text-gray-900">
                Unlock Failed
              </h3>
              <p className="mb-6 text-sm text-gray-500">
                Something went wrong. Please try again.
              </p>
              <button
                onClick={() => setStatus("idle")}
                className="btn-primary px-8 py-2.5 text-sm"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-2.5 rounded-xl bg-gray-50 p-4">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Base Amount</span>
                  <span>{formatCurrency(baseAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Profile Unlock Amount</span>
                  <span>{formatCurrency(profileAmount)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Per Profile Chat Amount</span>
                  <span>{formatCurrency(perProfileChatAmount)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-sm font-medium text-green-600">
                    <span>Discount ({appliedCoupon.code})</span>
                    <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
                  </div>
                )}
                <div className="mt-2 flex justify-between border-t border-gray-200 pt-2 text-base font-bold text-gray-900">
                  <span>Total Amount</span>
                  <span className="text-rose-600">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="mb-6">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Coupon Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none transition-colors focus:border-rose-300"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isValidatingCoupon || !couponInput.trim()}
                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {isValidatingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                  </button>
                </div>
                {appliedCoupon && (
                  <p className="mt-1.5 text-xs text-green-600">{appliedCoupon.message}</p>
                )}
              </div>

              <ul className="mb-6 space-y-2 text-sm text-gray-700">
                {[
                  "Full profile details",
                  "Contact information (phone, email)",
                  "Remove blur and watermark",
                  "Download profile option",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>

              <button
                onClick={handlePay}
                disabled={status === "processing"}
                className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3 disabled:opacity-60"
              >
                {status === "processing" ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5" />
                    Pay {formatCurrency(total)}
                  </>
                )}
              </button>
              <p className="mt-3 text-center text-xs text-gray-400">
                This profile will be added to Unlocked Profiles immediately.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
