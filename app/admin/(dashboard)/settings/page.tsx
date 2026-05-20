"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, Loader2, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type PricingSettingsResponse = {
  settings?: {
    baseAmount?: number;
    profileAmount?: number;
    perProfileChatAmount?: number;
  };
  error?: string;
};

async function safeReadJson(response: Response) {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as PricingSettingsResponse;
  } catch {
    return null;
  }
}

function toSafeAmount(value: number) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

function calculateChatPrice(basePrice: number, perShortlistedProfilePrice: number, perProfileChatPrice: number) {
  return toSafeAmount(basePrice) + toSafeAmount(perShortlistedProfilePrice) + toSafeAmount(perProfileChatPrice);
}

function PriceField({
  id,
  label,
  value,
  onChange,
  helperText,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  helperText: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-medium text-slate-400">
          ₹
        </span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={Number.isFinite(value) ? value : 0}
          onChange={(event) => {
            const nextValue = event.target.value.replace(/[^\d]/g, "");
            onChange(nextValue === "" ? 0 : Number(nextValue));
          }}
          className="w-full rounded-[18px] border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-300 focus:ring-2 focus:ring-rose-200"
        />
      </div>
      <p className="mt-1.5 text-xs text-slate-400">{helperText}</p>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [baseAmount, setBaseAmount] = useState(500);
  const [profileAmount, setProfileAmount] = useState(500);
  const [perProfileChatAmount, setPerProfileChatAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/settings", { cache: "no-store" })
      .then(async (response) => {
        const data = await safeReadJson(response);

        if (!active) return;

        if (response.ok && data?.settings) {
          if (typeof data.settings.baseAmount === "number") {
            setBaseAmount(data.settings.baseAmount);
          }
          if (typeof data.settings.profileAmount === "number") {
            setProfileAmount(data.settings.profileAmount);
          }
          if (typeof data.settings.perProfileChatAmount === "number") {
            setPerProfileChatAmount(data.settings.perProfileChatAmount);
          }
          return;
        }

        if (!response.ok) {
          toast.error(data?.error ?? "Failed to load pricing settings");
        }
      })
      .catch(() => {
        if (active) toast.error("Failed to load pricing settings");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ baseAmount, profileAmount, perProfileChatAmount }),
      });

      const data = await safeReadJson(res);

      if (res.ok) {
        toast.success("Chat pricing updated successfully!");
      } else {
        toast.error(data?.error ?? "Failed to update");
      }
    } catch {
      toast.error("Failed to update");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const chatPrice = calculateChatPrice(baseAmount, profileAmount, perProfileChatAmount);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm">
          <ShieldCheck className="h-4 w-4" />
          Profile unlock payment style pricing editor
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Chat Pricing Settings
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Configure the chat pricing. Changes take effect immediately and the
            preview below updates as you type.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-sm">
          <div className="border-b border-rose-100 bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
                <Info className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Pricing formula</h2>
                <p className="mt-1 text-sm text-rose-50">
                  Chat Price = Base Price + Per Shortlisted Profile Price + Per
                  Profile Chat Price
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div className="grid gap-6">
              <PriceField
                id="base-amount"
                label="Base Price (₹)"
                value={baseAmount}
                onChange={setBaseAmount}
                helperText="Fixed base fee applied to every chat request"
              />

              <PriceField
                id="profile-amount"
                label="Per Shortlisted Profile Price (₹)"
                value={profileAmount}
                onChange={setProfileAmount}
                helperText="Added for each shortlisted profile in the chat flow"
              />

              <PriceField
                id="per-profile-chat-amount"
                label="Per Profile Chat Price (₹)"
                value={perProfileChatAmount}
                onChange={setPerProfileChatAmount}
                helperText="Extra chat charge added for each profile chat"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3.5 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.22)] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {saving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Chat Pricing
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-sm">
            <div className="border-b border-rose-100 px-6 py-5">
              <h2 className="font-display text-xl font-bold text-slate-900">
                Live Preview
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                This is what users will see before they pay.
              </p>
            </div>

            <div className="p-6">
              <div className="rounded-[24px] border border-rose-100 bg-[linear-gradient(180deg,rgba(255,250,251,0.9)_0%,rgba(255,244,246,0.98)_100%)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Chat Price</span>
                  <span className="text-3xl font-bold tracking-tight text-rose-600">
                    ₹{chatPrice}
                  </span>
                </div>

                <div className="space-y-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Base Price</span>
                    <span className="font-semibold">₹{toSafeAmount(baseAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Per Shortlisted Profile Price</span>
                    <span className="font-semibold">₹{toSafeAmount(profileAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Per Profile Chat Price</span>
                    <span className="font-semibold">₹{toSafeAmount(perProfileChatAmount)}</span>
                  </div>

                  <div className="mt-2 border-t border-rose-200 pt-3">
                    <div className="flex items-center justify-between text-base">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="font-bold text-rose-600">₹{chatPrice}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-emerald-100 bg-emerald-50 px-6 py-5 text-emerald-800 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <h3 className="font-semibold">Working flow</h3>
                <p className="mt-1 text-sm leading-6 text-emerald-700">
                  This page saves pricing to the database and the same values are
                  used by the profile unlock payment flow and admin payment
                  records.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
