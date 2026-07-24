"use client";

import { useState, useEffect } from "react";
import { Loader2, Mail, Save } from "lucide-react";
import { toast } from "sonner";

export default function GmailSetupForm() {
  const [officialEmail, setOfficialEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/settings");
        if (!response.ok) throw new Error("Failed to load settings");
        const data = await response.json();
        if (data.settings?.officialEmail) {
          setOfficialEmail(data.settings.officialEmail);
        }
      } catch (error) {
        toast.error("Could not load Gmail setup data.");
      } finally {
        setIsLoading(false);
      }
    }
    void loadSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officialEmail.trim()) {
      toast.error("Email address is required.");
      return;
    }
    
    // Basic regex for email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          officialEmail: officialEmail.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      toast.success("Gmail address saved successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-rose-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="officialEmail" className="text-sm font-semibold text-gray-700">
            Official Gmail Address <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              id="officialEmail"
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
              placeholder="support@fmlpmatrimony.com"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-rose-500 focus:bg-white focus:ring-4 focus:ring-rose-200"
              required
            />
          </div>
          <p className="text-[11px] text-gray-500 italic">
            This email will be displayed on the Landing Page, Help section, and across the platform.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-rose-50 pt-6">
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 rounded-[24px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition-all hover:shadow-lg active:scale-95 disabled:opacity-70 disabled:grayscale"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
