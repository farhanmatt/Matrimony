"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Loader2, Save, Activity, Heart, Info, Coffee } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

import PdfUpload from "@/components/common/PdfUpload";

export default function HealthDetailsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    bloodPressure: "",
    diabetesStatus: "No",
    diabetesDetails: "",
    medicalReportUrl: "",
  });

  useEffect(() => {
    fetch("/api/profile/health")
      .then((res) => {
        if (res.status === 403) {
          router.push("/dashboard");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data && data.healthDetails) {
          const hd = data.healthDetails;
          setFormData({
            bloodPressure: hd.bloodPressure || "",
            diabetesStatus: hd.diabetesStatus || "No",
            diabetesDetails: hd.diabetesDetails || "",
            medicalReportUrl: hd.medicalReportUrl || "",
          });
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/profile/health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success("Health details saved successfully!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to save health details");
      }
    } catch (error) {
      toast.error("Failed to save health details");
    } finally {
      setSaving(false);
    }
  };

  const renderSkeleton = () => (
    <div className="mx-auto max-w-4xl pb-12 animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 bg-slate-100 dark:bg-slate-800 rounded-md mb-3" />
        <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-md" />
      </div>
      <div className="rounded-[24px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="h-6 w-32 bg-slate-100 dark:bg-slate-800 rounded-md" />
            <div className="space-y-4">
              <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-md" />
              <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
            <div className="space-y-4">
              <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-md" />
              <div className="h-12 w-full bg-slate-100 dark:bg-slate-800 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-slate-100 sm:text-3xl">
          Health Details
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
          Share your health information. This helps in finding a compatible match. This information will be visible to users who unlock your profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                <Heart className="h-4 w-4" />
              </span>
              Medical Information
            </h2>
          </div>
          <div className="grid gap-6 p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Blood Pressure (BP) <span className="text-rose-500">*</span></label>
              <select
                name="bloodPressure"
                value={formData.bloodPressure}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="">Select BP Status</option>
                <option value="Normal">Normal</option>
                <option value="Low BP">Low BP</option>
                <option value="High BP">High BP</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Diabetes (Sugar) <span className="text-rose-500">*</span></label>
              <select
                name="diabetesStatus"
                value={formData.diabetesStatus}
                onChange={handleChange}
                required
                className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>

            {formData.diabetesStatus === "Yes" && (
              <div className="sm:col-span-2 animate-in fade-in slide-in-from-top-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Diabetes Details (Optional)</label>
                <input
                  type="text"
                  name="diabetesDetails"
                  value={formData.diabetesDetails}
                  onChange={handleChange}
                  placeholder="e.g. Type 1, Type 2, etc."
                  className="w-full rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 px-4 py-2.5 text-sm outline-none transition-all focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
                />
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 px-6 py-4">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-slate-100">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400">
                <Info className="h-4 w-4" />
              </span>
              Medical Report Upload
            </h2>
          </div>
          <div className="p-6">
            <PdfUpload
              value={formData.medicalReportUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, medicalReportUrl: url }))}
              onRemove={() => setFormData((prev) => ({ ...prev, medicalReportUrl: "" }))}
              label="Upload your medical report (PDF only, up to 4MB)"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition-all hover:shadow-xl hover:shadow-rose-200 disabled:opacity-70 sm:w-auto"
          >
            {saving ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-5 w-5" /> Save Health Details</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
