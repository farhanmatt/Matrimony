"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Briefcase,
  GraduationCap,
  Heart,
  MapPin,
  UserCircle2,
} from "lucide-react";
import {
  calculateAge,
  cmToFeetInches,
  MARITAL_STATUS_LABELS,
} from "@/lib/utils/helpers";

interface ProfileCardProps {
  profile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date | string;
    height: number | null;
    maritalStatus: string;
    education: string | null;
    profession: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    religion: string | null;
    profileImage?: string | null;
    photos: { url: string; isPrimary: boolean }[];
  };
  isLiked?: boolean;
  onLike?: (profileId: string) => void;
  allowUnlike?: boolean;
  onUnlike?: (profileId: string) => void;
  blurPhotoPreview?: boolean;
  compact?: boolean;
  profileHref?: string;
}

export default function ProfileCard({
  profile,
  isLiked = false,
  onLike,
  allowUnlike = false,
  onUnlike,
  blurPhotoPreview = false,
  compact = false,
  profileHref,
}: ProfileCardProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLiked(isLiked);
  }, [isLiked]);

  const primaryPhoto =
    profile.photos?.find((p) => p.isPrimary)?.url ??
    profile.photos?.[0]?.url ??
    profile.profileImage ??
    null;
  const age = calculateAge(profile.dateOfBirth);
  const location = profile.city || profile.state || profile.location || "India";
  const cardClickable = Boolean(profileHref);

  const openProfile = () => {
    if (profileHref) {
      router.push(profileHref);
    }
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!profileHref) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProfile();
    }
  };

  const handleLike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to like profile");
        return;
      }
      setLiked(true);
      toast.success(data.matched ? "It's a Match! You both liked each other!" : "Profile liked!");
      onLike?.(profile.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlike = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/likes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: profile.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to remove interest");
        return;
      }
      setLiked(false);
      toast.success("Profile removed from your interests.");
      onUnlike?.(profile.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`ui-card-lift group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${
        compact ? "w-full max-w-[320px] mx-auto" : ""
      } ${cardClickable ? "cursor-pointer" : ""}`}
      onClick={openProfile}
      onKeyDown={handleCardKeyDown}
      role={cardClickable ? "link" : undefined}
      tabIndex={cardClickable ? 0 : undefined}
      aria-label={cardClickable ? `Open ${profile.fullName} profile` : undefined}
    >
      <div className={`relative overflow-hidden bg-gradient-to-br from-rose-50 to-pink-100 ${compact ? "h-40" : "h-48"}`}>
        {primaryPhoto ? (
          <Image
            src={primaryPhoto}
            alt={`${profile.fullName} matrimony profile`}
            fill
            className={`ui-media-zoom object-cover transition-all duration-300 ${
              blurPhotoPreview ? "blur-[5px] scale-105" : ""
            }`}
            style={{ objectPosition: "center 12%" }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            quality={100}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="ui-icon-lift flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-gray-100">
              <UserCircle2 className="h-12 w-12 text-rose-400" />
            </div>
          </div>
        )}

        {primaryPhoto && blurPhotoPreview ? (
          <div className="pointer-events-none absolute inset-0 z-10">
            <div className="absolute inset-0 bg-white/5" />
            <div className="watermark opacity-90" aria-hidden="true" />
          </div>
        ) : null}

        <button
          onClick={(event) => {
            event.stopPropagation();
            if (liked && allowUnlike) {
              void handleUnlike();
              return;
            }
            void handleLike();
          }}
          disabled={loading || (liked && !allowUnlike)}
          className={`ui-icon-lift absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all ${
            liked
              ? "bg-rose-500 text-white"
              : "bg-white/90 text-gray-400 hover:bg-rose-50 hover:text-rose-500"
          }`}
          aria-label={liked && allowUnlike ? "Unlike profile" : liked ? "Liked" : "Like profile"}
        >
          <Heart className={`w-5 h-5 ${liked ? "fill-white" : ""}`} />
        </button>
      </div>

      <div className={`flex flex-1 flex-col ${compact ? "p-3" : "p-3.5"}`}>
        <div className={`flex items-start justify-between gap-3 ${compact ? "mb-0.5" : "mb-0.5"}`}>
          <h3 className={`min-w-0 flex-1 font-display font-bold text-gray-900 truncate ${compact ? "text-base" : "text-[17px]"}`}>
            {profile.fullName}
          </h3>
          <span className="shrink-0 rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
            {age} yrs
          </span>
        </div>

        <div className={`${compact ? "space-y-1 mb-3" : "space-y-1.5 mb-4"} min-w-0`}>
          {profile.profession && (
            <div className={`flex min-w-0 items-center gap-2 text-gray-600 ${compact ? "text-xs" : "text-[15px]"}`}>
              <Briefcase className="ui-icon-lift h-4 w-4 shrink-0 text-rose-400" />
              <span className="min-w-0 flex-1 truncate">{profile.profession}</span>
            </div>
          )}
          {profile.education && (
            <div className={`flex min-w-0 items-center gap-2 text-gray-600 ${compact ? "text-xs" : "text-[15px]"}`}>
              <GraduationCap className="ui-icon-lift h-4 w-4 shrink-0 text-rose-400" />
              <span className="min-w-0 flex-1 truncate">{profile.education}</span>
            </div>
          )}
          <div className={`flex min-w-0 items-center gap-2 text-gray-600 ${compact ? "text-xs" : "text-[15px]"}`}>
            <MapPin className="ui-icon-lift h-4 w-4 shrink-0 text-rose-400" />
            <span className="min-w-0 flex-1 truncate">{location}</span>
          </div>
        </div>

        <div className={`mt-auto flex flex-nowrap items-center gap-2 overflow-hidden ${compact ? "mb-2" : "mb-2.5"}`}>
          <span className={`shrink-0 bg-rose-50 text-rose-600 rounded-full font-medium whitespace-nowrap ${compact ? "text-[11px] px-2.5 py-0.5" : "text-xs px-2.5 py-1"}`}>
            {MARITAL_STATUS_LABELS[profile.maritalStatus]}
          </span>
          {profile.religion && (
            <span className={`shrink-0 bg-gray-50 text-gray-600 rounded-full whitespace-nowrap ${compact ? "text-[11px] px-2.5 py-0.5" : "text-xs px-2.5 py-1"}`}>
              {profile.religion}
            </span>
          )}
          {profile.height && (
            <span className={`shrink-0 bg-gray-50 text-gray-600 rounded-full whitespace-nowrap ${compact ? "text-[11px] px-2.5 py-0.5" : "text-xs px-2.5 py-1"}`}>
              {cmToFeetInches(profile.height)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
