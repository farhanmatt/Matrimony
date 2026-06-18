"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, DollarSign, Info } from "lucide-react";

export default function AdminSettingsPage() {
  const [baseAmount, setBaseAmount] = useState(500);
  const [profileAmount, setProfileAmount] = useState(500);
  const [perProfileChatAmount, setPerProfileChatAmount] = useState(0);
  const [isChatPaymentEnabled, setIsChatPaymentEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "chat">("profile");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setBaseAmount(data.settings.baseAmount);
          setProfileAmount(data.settings.profileAmount);
          setPerProfileChatAmount(data.settings.perProfileChatAmount ?? 0);
          setIsChatPaymentEnabled(data.settings.isChatPaymentEnabled ?? true);
        }
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        baseAmount, 
        profileAmount, 
        perProfileChatAmount, 
        isChatPaymentEnabled 
      }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("Pricing settings updated successfully!");
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
    <div className="max-w-xl pb-12">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
        Pricing Settings
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Configure the profile unlock and chat pricing. Changes take effect immediately.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Tabs Header */}
        <div className="flex border-b border-gray-100 px-6 sm:px-8 pt-4">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "profile" 
                ? "border-rose-500 text-rose-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            Profile Unlock Price
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "chat" 
                ? "border-rose-500 text-rose-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200"
            }`}
          >
            Chat Price
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-sm">01</span>
                Profile Unlock Pricing
              </h2>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-sm text-blue-700">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <strong>Pricing Formula:</strong> Total = Base Amount + Profile Amount.
                  The user sees this breakdown before making a payment.
                </div>
              </div>

              <div className="grid gap-6">
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
              </div>

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

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-10 rounded-xl font-bold shadow-lg shadow-rose-200"
                >
                  {saving ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-5 h-5" /> Save Profile Pricing</>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "chat" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="w-8 h-8 rounded-lg bg-pink-50 text-pink-500 flex items-center justify-center text-sm">02</span>
                  Chat Payment Settings
                </h2>
                
                <button
                  onClick={() => setIsChatPaymentEnabled(!isChatPaymentEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                    isChatPaymentEnabled ? "bg-rose-500" : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isChatPaymentEnabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="grid gap-6">
                <div className={!isChatPaymentEnabled ? "opacity-50 pointer-events-none" : ""}>
                  <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="chat-amount">
                    Chat Unlock Fee (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
                    <input
                      id="chat-amount"
                      type="number"
                      min={0}
                      value={perProfileChatAmount}
                      disabled={!isChatPaymentEnabled}
                      onChange={(e) => setPerProfileChatAmount(Number(e.target.value))}
                      className="w-full border border-gray-200 rounded-xl pl-8 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
                    />
                  </div>
                  <p className="text-gray-400 text-xs mt-1.5">
                    The one-time payment required to unlock chat with a specific profile.
                  </p>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${
                isChatPaymentEnabled 
                  ? "bg-green-50 border-green-100 text-green-700" 
                  : "bg-gray-50 border-gray-200 text-gray-500"
              }`}>
                <p className="text-sm font-medium">
                  Chat Payment is currently <strong>{isChatPaymentEnabled ? "ENABLED" : "DISABLED"}</strong>
                </p>
                <p className="text-xs mt-0.5">
                  {isChatPaymentEnabled 
                    ? `Users must pay ₹${perProfileChatAmount} to unlock chat access with a new profile.`
                    : "Users can chat for free after a mutual interest is established (or as per system rules)."}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-10 rounded-xl font-bold shadow-lg shadow-rose-200"
                >
                  {saving ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-5 h-5" /> Save Chat Pricing</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
