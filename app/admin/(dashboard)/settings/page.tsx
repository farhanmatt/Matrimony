"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, DollarSign, Info } from "lucide-react";

export default function AdminSettingsPage() {
  const [baseAmount, setBaseAmount] = useState(500);
  const [profileAmount, setProfileAmount] = useState(500);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setBaseAmount(data.settings.baseAmount);
          setProfileAmount(data.settings.profileAmount);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseAmount, profileAmount }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Pricing updated successfully!");
    } else {
      toast.error(data.error ?? "Failed to update");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  const total = baseAmount + profileAmount;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
        Pricing Settings
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Configure the profile unlock pricing. Changes take effect immediately.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <strong>Pricing Formula:</strong> Total = Base Amount + Profile Amount.
            The user sees this breakdown before making a payment.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="base-amount">
            Base Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              id="base-amount"
              type="number"
              min={0}
              value={baseAmount}
              onChange={(e) => setBaseAmount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <p className="text-gray-400 text-xs mt-1.5">
            Fixed base fee applied to every unlock
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="profile-amount">
            Profile Amount (₹)
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              id="profile-amount"
              type="number"
              min={0}
              value={profileAmount}
              onChange={(e) => setProfileAmount(Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
            />
          </div>
          <p className="text-gray-400 text-xs mt-1.5">
            Per-profile unlock fee
          </p>
        </div>

        {/* Live preview */}
        <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
          <p className="text-xs font-semibold text-rose-600 mb-2 uppercase tracking-wide">
            Live Preview — What User Sees
          </p>
          <div className="space-y-1 text-sm text-gray-700">
            <div className="flex justify-between">
              <span>Base Amount</span>
              <span>₹{baseAmount}</span>
            </div>
            <div className="flex justify-between">
              <span>Profile Amount</span>
              <span>₹{profileAmount}</span>
            </div>
            <div className="flex justify-between font-bold text-rose-600 border-t border-rose-200 pt-1 mt-1 text-base">
              <span>Total</span>
              <span>₹{total}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 py-3 px-8 rounded-xl"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-5 h-5" /> Save Pricing</>
          )}
        </button>
      </div>
    </div>
  );
}
