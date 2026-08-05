"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, Droplet, FileText, HeartPulse } from "lucide-react";
import { getPdfCloudinaryUrl } from "@/lib/utils/image";
import { toast } from "sonner";

interface HealthDetails {
  bloodPressure?: string | null;
  diabetesStatus?: string | null;
  diabetesDetails?: string | null;
  medicalReportUrl?: string | null;
}

interface HealthDetailsModalProps {
  profileId: string;
  profileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function HealthDetailsModal({ profileId, profileName, isOpen, onClose }: HealthDetailsModalProps) {
  const [details, setDetails] = useState<HealthDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/profiles/${profileId}/health-details`);
        const json = await res.json();
        
        if (!res.ok) throw new Error(json.error || "Failed to load");
        
        setDetails(json.data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load health details");
        onClose();
      } finally {
        setLoading(false);
      }
    };

    void fetchDetails();
  }, [isOpen, profileId, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="ui-overlay-fade fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="ui-modal-pop w-full max-w-md overflow-hidden rounded-[24px] border border-rose-100 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
              <HeartPulse className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-xl font-bold text-slate-900">
                Health Details
              </h3>
              <p className="text-sm text-slate-600">{profileName}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
            </div>
          ) : details ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Activity className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Blood Pressure</p>
                  <p className="font-medium text-slate-900">{details.bloodPressure || "Not specified"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <Droplet className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Diabetes Status</p>
                  <p className="font-medium text-slate-900">{details.diabetesStatus || "Not specified"}</p>
                  {details.diabetesDetails && (
                    <p className="mt-1 text-sm text-slate-600">{details.diabetesDetails}</p>
                  )}
                </div>
              </div>

              {details.medicalReportUrl && (
                <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  <div className="flex flex-col items-start">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Medical Report</p>
                    <div className="mt-1.5">
                      <a
                        href={details.medicalReportUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="-ml-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-100"
                      >
                        <FileText className="h-4 w-4" />
                        View Document
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
              <p>No health details have been added by {profileName}.</p>
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
