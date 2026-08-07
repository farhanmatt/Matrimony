"use client";

import Image from "next/image";
import Link from "next/link";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  BadgeCheck,
  Briefcase,
  GraduationCap,
  Heart,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import HealthDetailsModal from "./HealthDetailsModal";
import {
  calculateAge,
  cmToFeetInches,
  cn,
  MARITAL_STATUS_LABELS,
} from "@/lib/utils/helpers";

interface BrowseProfileCardProps {
  profile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date | string;
    height: number | null;
    maritalStatus: string;
    education: string | null;
    course?: string | null;
    profession: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    religion: string | null;
    previewImageUrl: string | null;
    healthRequestStatus?: "PENDING" | "ACCEPTED" | "REJECTED" | null;
  };
  badge?: "New" | "Premium";
  profileHref: string;
  onLike?: (profileId: string) => void;
  isHealthDetailsEnabled?: boolean;
}

export default function BrowseProfileCard({
  profile,
  badge = "New",
  profileHref: _profileHref,
  onLike,
  isHealthDetailsEnabled = true,
}: BrowseProfileCardProps) {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [healthStatus, setHealthStatus] = useState(profile.healthRequestStatus);
  const [healthLoading, setHealthLoading] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);

  useEffect(() => {
    setLiked(false);
    setConfirmOpen(false);
    setHealthStatus(profile.healthRequestStatus);
  }, [profile.id, profile.healthRequestStatus]);

  useEffect(() => {
    if (!confirmOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirmOpen]);

  const primaryPhoto = profile.previewImageUrl ?? null;
  const age = calculateAge(profile.dateOfBirth);
  const location =
    [profile.city, profile.state].filter(Boolean).join(", ") ||
    profile.location ||
    "India";
  const educationLabel =
    profile.course || profile.education || "Education not added";
  const confirmLike = async () => {
    if (loading || liked) return;

    setConfirmOpen(false);
    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: profile.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to save interest");
        return;
      }

      setLiked(true);
      if (data.matched) {
        toast.success("It's a Match!", {
          description: `You and ${profile.fullName} liked each other.`,
        });
      } else {
        toast.success("Interest sent successfully.", {
          description: `${profile.fullName} has been added to your interests.`,
        });
      }
      onLike?.(profile.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleLikeClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    event.preventDefault();
    if (loading || liked) return;
    setConfirmOpen(true);
  };

  const handleHealthReqClick = async (e: ReactMouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (healthStatus === "ACCEPTED") {
      setIsHealthModalOpen(true);
      return;
    }
    if (healthStatus === "PENDING" || healthLoading) return;

    setHealthLoading(true);
    try {
      const res = await fetch("/api/health-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setHealthStatus("PENDING");
      toast.success("Health request sent!");
    } catch (err) {
      toast.error("Failed to send health request");
    } finally {
      setHealthLoading(false);
    }
  };

  const getHealthBtnLabel = () => {
    if (healthStatus === "ACCEPTED") return "View Health";
    if (healthStatus === "PENDING") return "Request Sent";
    return "Health Req";
  };

  const handleCardClick = () => {
    if (badge === "New") {
      fetch("/api/profile/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewedProfileId: profile.id }),
      }).catch(console.error);
    }
  };

  return (
    <>
      <Link 
        href={_profileHref}
        onClick={handleCardClick}
        className="ui-card-lift group flex h-full flex-col overflow-hidden rounded-[16px] border border-rose-100 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="relative h-[224px] overflow-hidden bg-[linear-gradient(135deg,#fff2f6_0%,#ffe7ee_55%,#ffeef4_100%)] dark:!bg-slate-800 dark:!bg-none">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt="Protected matrimony profile preview"
              fill
              className="ui-media-zoom scale-[1.04] object-cover object-center"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
              quality={75}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95)_0%,_rgba(255,239,244,0.9)_52%,_rgba(255,231,238,0.82)_100%)] dark:!bg-slate-800 dark:!bg-none">
              <div className="flex h-[122px] w-[122px] items-center justify-center rounded-full bg-white/95 shadow-[0_22px_46px_rgba(244,114,182,0.18)] dark:bg-slate-700/90 dark:shadow-none">
                <Image
                  src="/female-avatar.svg"
                  alt="Default profile avatar"
                  width={76}
                  height={76}
                  className="h-[76px] w-[76px] object-contain opacity-95"
                />
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(15,23,42,0.08)_100%)]" />

          <span
            className={cn(
              "absolute left-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.12)]",
              badge === "Premium"
                ? "bg-[linear-gradient(135deg,#7c3aed_0%,#ec4899_100%)]"
                : "bg-[linear-gradient(135deg,#22c55e_0%,#14b8a6_100%)]"
            )}
          >
            {badge}
          </span>

          <button
            type="button"
            onClick={handleLikeClick}
            disabled={loading || liked}
            className={cn(
              "ui-link-shift absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/80 bg-white/95 shadow-[0_12px_28px_rgba(15,23,42,0.12)] backdrop-blur transition-all dark:border-slate-700 dark:bg-slate-800 dark:shadow-none",
              liked
                ? "border-rose-500 bg-rose-500 text-white dark:border-rose-500 dark:bg-rose-500"
                : "text-slate-400 hover:border-rose-200 hover:text-rose-500 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-rose-400",
              "disabled:cursor-not-allowed disabled:opacity-80"
            )}
            aria-label={liked ? "Liked" : "Like profile"}
          >
            <Heart className={cn("h-4 w-4", liked ? "fill-current" : "")} />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-3.5 pb-2.5 pt-2.5">
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 truncate font-display text-[1rem] font-bold leading-none text-slate-900 sm:text-[1.1rem] dark:text-slate-100">
              {profile.fullName}, {age}
            </h3>
            <span className="ui-icon-lift mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-900/30 dark:text-emerald-400">
              <BadgeCheck className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="mt-2 space-y-1 text-[12px] text-slate-600 sm:text-[13px] dark:text-slate-300">
            <div className="flex min-w-0 items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-rose-400 dark:text-rose-500" />
              <span className="truncate">{profile.profession || "Professional"}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex min-w-0 items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-rose-400" />
              <span className="truncate">{educationLabel}</span>
            </div>
          </div>

          <div className="mt-auto flex flex-wrap gap-2 pt-2.5">
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600 sm:text-[11px] dark:bg-rose-900/30 dark:text-rose-400">
              {MARITAL_STATUS_LABELS[profile.maritalStatus]}
            </span>
            {profile.religion ? (
              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 sm:text-[11px] dark:bg-slate-800 dark:text-slate-300">
                {profile.religion}
              </span>
            ) : null}
            {profile.height ? (
              <span className="rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600 sm:text-[11px] dark:bg-slate-800 dark:text-slate-300">
                {cmToFeetInches(profile.height)}
              </span>
            ) : null}
          </div>

          {isHealthDetailsEnabled && (
            <div className="mt-2.5 border-t border-rose-50 pt-2.5 dark:border-slate-800">
              <button
                onClick={handleHealthReqClick}
                disabled={healthLoading || healthStatus === "PENDING"}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-[13px] font-semibold transition-all",
                  healthStatus === "ACCEPTED"
                    ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                    : healthStatus === "PENDING"
                    ? "cursor-not-allowed bg-slate-50 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                )}
              >
                <Activity className="h-4 w-4" />
                {healthLoading ? "Sending..." : getHealthBtnLabel()}
              </button>
            </div>
          )}
        </div>
      </Link>

      {confirmOpen && typeof document !== "undefined"
        ? createPortal(
            <div
              className="ui-overlay-fade fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
              onClick={() => setConfirmOpen(false)}
            >
              <div
                className="ui-modal-pop w-full max-w-sm rounded-[24px] border border-rose-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-700/50 dark:bg-slate-900"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`like-confirm-title-${profile.id}`}
              >
                <h3
                  id={`like-confirm-title-${profile.id}`}
                  className="font-display text-xl font-bold text-slate-900 dark:text-slate-100"
                >
                  Like this profile?
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Do you want to add {profile.fullName} to your interests?
                </p>

                <div className="mt-5 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    disabled={loading}
                    className="ui-link-shift inline-flex flex-1 items-center justify-center rounded-[16px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmLike()}
                    disabled={loading}
                    className="ui-link-shift inline-flex flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)] transition-all hover:shadow-[0_18px_36px_rgba(244,63,94,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Sending..." : "Yes"}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )
        : null}

      <HealthDetailsModal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        profileId={profile.id}
        profileName={profile.fullName}
      />
    </>
  );
}

