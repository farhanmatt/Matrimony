"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/helpers";
import Link from "next/link";

interface UnlockPaymentPageProps {
  matchId: string;
  profileName: string;
  baseAmount: number;
  profileAmount: number;
  perProfileChatAmount: number;
  returnTo: string;
}

export default function UnlockPaymentPage({
  matchId,
  profileName,
  baseAmount,
  profileAmount,
  perProfileChatAmount,
  returnTo,
}: UnlockPaymentPageProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const subtotal = baseAmount + profileAmount + perProfileChatAmount;
  const totalAmount = subtotal - (appliedCoupon?.discountAmount || 0);

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
        setStatus("error");
        toast.error(unlockData.error ?? "Failed to unlock profile");
        return;
      }

      setStatus("success");
      toast.success(
        unlockData.alreadyUnlocked
          ? "Profile already unlocked."
          : "Profile unlocked successfully."
      );
      window.setTimeout(() => {
        router.replace(returnTo);
      }, 900);
    } catch {
      setStatus("error");
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6">
        <Link
          href={returnTo}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to profile
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-6 text-white sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em]">
                <Lock className="h-3.5 w-3.5" />
                Secure Unlock
              </div>
              <h1 className="font-display text-3xl font-bold sm:text-4xl">
                Unlock {profileName}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-rose-50 sm:text-base">
                Confirm this one-time unlock to reveal the hidden details for this matched profile.
              </p>
            </div>
            <div className="hidden rounded-3xl bg-white/15 px-4 py-3 text-right sm:block">
              <p className="text-xs uppercase tracking-[0.2em] text-rose-50/80">Total</p>
              <p className="mt-1 text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            {status === "success" ? (
              <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 text-center">
                <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
                <h2 className="mt-4 text-2xl font-display font-bold text-gray-900">
                  Profile unlocked
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  We&apos;re taking you back to the profile now.
                </p>
              </div>
            ) : status === "error" ? (
              <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6">
                <h2 className="text-2xl font-display font-bold text-gray-900">
                  Unlock issue
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  Please try again. We could not complete the unlock right now.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStatus("idle");
                    void handlePay();
                  }}
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Try again
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                  <h2 className="text-lg font-semibold text-gray-900">Price breakdown</h2>
                  <div className="mt-4 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>Base amount</span>
                      <span className="font-semibold">{formatCurrency(baseAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Profile unlock amount</span>
                      <span className="font-semibold">{formatCurrency(profileAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Per profile chat amount</span>
                      <span className="font-semibold">{formatCurrency(perProfileChatAmount)}</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex items-center justify-between font-medium text-green-600">
                        <span>Discount ({appliedCoupon.code})</span>
                        <span>-{formatCurrency(appliedCoupon.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-rose-600">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                    <h3 className="font-semibold">What you unlock</h3>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm text-gray-700">
                    {[
                      "Hidden profile details",
                      "Date of birth visibility",
                      "Better context before you connect",
                      "Instant access in Unlocked Profiles",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>

          {status !== "success" ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Coupon Code</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Have a coupon code? Apply it below.
                </p>
                <div className="mt-4 flex gap-2">
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
                  <p className="mt-2 text-xs text-green-600 font-medium">
                    {appliedCoupon.message}
                  </p>
                )}
              </div>

              <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900">Confirm unlock</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Click the button below to unlock this matched profile right away.
                </p>

                <button
                  type="button"
                  onClick={handlePay}
                  disabled={status === "processing"}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      Pay {formatCurrency(totalAmount)}
                    </>
                  )}
                </button>

                <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs text-gray-500">
                  <p className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    This unlock is applied instantly to your account.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
