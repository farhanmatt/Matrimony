"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Activity } from "lucide-react";

export default function AdminHealthSettingsPage() {
  const [isHealthDetailsEnabled, setIsHealthDetailsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setIsHealthDetailsEnabled(data.settings.isHealthDetailsEnabled ?? true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          isHealthDetailsEnabled 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Health settings updated successfully!");
      } else {
        toast.error(data.error ?? "Failed to update health settings");
      }
    } catch (err) {
      toast.error("Failed to update health settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl pb-12">
      <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
        Health Settings
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        Configure the Health Details feature across the platform.
      </p>

      <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-6 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center text-sm">
                  <Activity className="w-4 h-4" />
                </span>
                Health Record Module
              </h2>
              
              <button
                onClick={() => setIsHealthDetailsEnabled(!isHealthDetailsEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  isHealthDetailsEnabled ? "bg-rose-500" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isHealthDetailsEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className={`p-4 rounded-xl border ${
              isHealthDetailsEnabled 
                ? "bg-green-50 border-green-100 text-green-700" 
                : "bg-gray-50 border-gray-200 text-gray-500"
            }`}>
              <p className="text-sm font-medium">
                Health Records are currently <strong>{isHealthDetailsEnabled ? "ENABLED" : "DISABLED"}</strong>
              </p>
              <p className="text-xs mt-0.5">
                {isHealthDetailsEnabled 
                  ? "Users can view, edit, and share their health details on their unlocked profiles."
                  : "The health feature is hidden from the user navigation and all unlocked profiles."}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto btn-primary flex items-center justify-center gap-2 py-3 px-10 rounded-[24px] font-bold shadow-lg shadow-rose-200"
              >
                {saving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="w-5 h-5" /> Save Changes</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
