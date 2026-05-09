"use client";

import Image from "next/image";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  GraduationCap,
  Heart,
  MapPin,
  UserCircle2,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { calculateAge } from "@/lib/utils/helpers";

interface LikedProfilePreviewCardProps {
  likedAt: string;
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
  onUnlike?: (profileId: string) => void;
}

export default function LikedProfilePreviewCard({
  likedAt,
  profile,
  onUnlike,
}: LikedProfilePreviewCardProps) {
  const [removing, setRemoving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

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

  const primaryPhoto =
    profile.profileImage ??
    profile.photos.find((photo) => photo.isPrimary)?.url ??
    profile.photos[0]?.url ??
    null;
  const age = calculateAge(profile.dateOfBirth);
  const likedLabel = formatDistanceToNowStrict(new Date(likedAt), {
    addSuffix: true,
  });
  const location =
    [profile.city, profile.state].filter(Boolean).join(", ") ||
    profile.location ||
    "India";
  const educationLabel =
    profile.course || profile.education || "Education details not added";

  const handleUnlike = async () => {
    if (removing) return;

    setConfirmOpen(false);
    setRemoving(true);
    try {
      const res = await fetch("/api/likes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toProfileId: profile.id }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Failed to remove liked profile");
        return;
      }

      toast.success("Profile removed from liked profiles.");
      onUnlike?.(profile.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRemoving(false);
    }
  };

  const handleUnlikeClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (removing) return;
    setConfirmOpen(true);
  };

  return (
    <>
      <article className="group mx-auto w-full max-w-[288px] overflow-hidden rounded-[12px] border border-rose-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(15,23,42,0.11)]">
        <div className="relative h-[188px] overflow-hidden bg-[linear-gradient(135deg,#fff2f5_0%,#ffe4ec_100%)]">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt={`${profile.fullName} liked profile`}
              fill
              className="object-cover object-center blur-[7px]"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
              quality={100}
              unoptimized
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg shadow-rose-100">
                <UserCircle2 className="h-10 w-10 text-rose-400" />
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 rounded-full bg-slate-900/45 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            {likedLabel}
          </div>

          <button
            type="button"
            onClick={handleUnlikeClick}
            disabled={removing}
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-rose-500 shadow-md transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-70"
            aria-label="Remove liked profile"
          >
            <Heart className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="p-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-[0.95rem] font-bold text-slate-900">
                <span className="truncate">
                  {profile.fullName}, {age}
                </span>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {profile.profession || "Professional"}
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2 text-[12px] text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{educationLabel}</span>
            </div>
          </div>
        </div>
      </article>

      {confirmOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] border border-rose-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`unlike-confirm-title-${profile.id}`}
          >
            <h3
              id={`unlike-confirm-title-${profile.id}`}
              className="font-display text-xl font-bold text-slate-900"
            >
              Remove liked profile?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Do you want to remove {profile.fullName} from your liked profiles?
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
                className="inline-flex flex-1 items-center justify-center rounded-[16px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void handleUnlike()}
                disabled={removing}
                className="inline-flex flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)] transition-all hover:shadow-[0_18px_36px_rgba(244,63,94,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {removing ? "Removing..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
