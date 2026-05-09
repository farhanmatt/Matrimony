"use client";

import Image from "next/image";
import { useState } from "react";
import {
  Briefcase,
  GraduationCap,
  Heart,
  MapPin,
  UserCircle2,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import {
  calculateAge,
  cmToFeetInches,
  MARITAL_STATUS_LABELS,
} from "@/lib/utils/helpers";

interface ReceivedLikePreviewCardProps {
  badge?: "New" | "Premium";
  item: {
    id: string;
    createdAt: string;
    isLikedBack: boolean;
    isMatched: boolean;
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
      profileImage?: string | null;
      photos: { url: string; isPrimary: boolean }[];
    };
  };
  onLikeBackSuccess?: (profileId: string, matched: boolean) => void;
}

export default function ReceivedLikePreviewCard({
  badge,
  item,
  onLikeBackSuccess,
}: ReceivedLikePreviewCardProps) {
  const [likedBack, setLikedBack] = useState(item.isLikedBack);
  const [loading, setLoading] = useState(false);

  const primaryPhoto =
    item.profile.profileImage ??
    item.profile.photos.find((photo) => photo.isPrimary)?.url ??
    item.profile.photos[0]?.url ??
    null;
  const age = calculateAge(item.profile.dateOfBirth);
  const location =
    [item.profile.city, item.profile.state].filter(Boolean).join(", ") ||
    item.profile.location ||
    "India";
  const educationLabel =
    item.profile.course || item.profile.education || "Education not added";
  const likedLabel = formatDistanceToNowStrict(new Date(item.createdAt), {
    addSuffix: true,
  });

  const handleLikeBack = async () => {
    if (loading || likedBack) return;

    setLoading(true);
    try {
      const response = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: item.profile.id }),
      });
      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error ?? "Failed to like profile");
        return;
      }

      setLikedBack(true);
      toast.success(
        data.matched
          ? "It's a Match! You both liked each other!"
          : "Profile liked!"
      );
      onLikeBackSuccess?.(item.profile.id, Boolean(data.matched));
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article
      className="overflow-hidden rounded-[16px] border border-rose-100 bg-white shadow-[0_14px_42px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(15,23,42,0.1)]"
    >
      <div className="relative h-[118px] overflow-hidden bg-[linear-gradient(135deg,#fff4f7_0%,#ffe6ee_100%)]">
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt={`${item.profile.fullName} received like`}
            fill
            className="object-cover"
            style={{ objectPosition: "center 12%" }}
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
            quality={100}
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/95 shadow-lg shadow-rose-100">
              <UserCircle2 className="h-10 w-10 text-rose-400" />
            </div>
          </div>
        )}

        {badge ? (
          <div
            className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm ${
              badge === "Premium"
                ? "bg-[linear-gradient(135deg,#7c3aed_0%,#ec4899_100%)]"
                : "bg-[linear-gradient(135deg,#22c55e_0%,#14b8a6_100%)]"
            }`}
          >
            {badge}
          </div>
        ) : (
          <div className="absolute left-3 top-3 rounded-full bg-slate-900/45 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            {likedLabel}
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            void handleLikeBack();
          }}
          disabled={loading || likedBack}
          className={`absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-all ${
            likedBack
              ? "bg-rose-500 text-white"
              : "bg-white text-gray-400 hover:bg-rose-50 hover:text-rose-500"
          } disabled:cursor-not-allowed disabled:opacity-80`}
          aria-label={likedBack ? "Liked back" : "Like profile back"}
        >
          <Heart className={`h-5 w-5 ${likedBack ? "fill-current" : ""}`} />
        </button>
      </div>

      <div className="px-3 py-2.5">
        <div className="mb-1.5 min-w-0">
          <h3 className="truncate font-display text-[1.05rem] font-bold text-slate-900">
            {item.profile.fullName}, {age}
          </h3>
        </div>

        <div className="space-y-1 text-[13px] text-slate-600">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="truncate">
              {item.profile.profession || "Professional"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="truncate">{educationLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-rose-400" />
            <span className="truncate">{location}</span>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-medium text-rose-600">
            {MARITAL_STATUS_LABELS[item.profile.maritalStatus]}
          </span>
          {item.profile.religion ? (
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              {item.profile.religion}
            </span>
          ) : null}
          {item.profile.height ? (
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              {cmToFeetInches(item.profile.height)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
