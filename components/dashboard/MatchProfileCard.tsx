"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Copy,
  EllipsisVertical,
  Eye,
  ExternalLink,
  GraduationCap,
  Heart,
  Lock,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { calculateAge, cmToFeetInches, cn, formatCurrency } from "@/lib/utils/helpers";

type MatchProfile = {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date | string;
  height: number | null;
  maritalStatus: string;
  profession: string | null;
  city: string | null;
  state: string | null;
  religion: string | null;
  education: string | null;
  course: string | null;
  phone: string | null;
  profileImage?: string | null;
  photos: { url: string; isPrimary: boolean }[];
};

interface MatchProfileCardProps {
  matchId: string;
  profile: MatchProfile;
  isUnlocked: boolean;
  baseAmount: number;
  profileAmount: number;
  perProfileChatAmount: number;
  onUnlock: (matchId: string) => void;
}

export default function MatchProfileCard({
  matchId,
  profile,
  isUnlocked,
  baseAmount,
  profileAmount,
  perProfileChatAmount,
  onUnlock,
}: MatchProfileCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showQuickInfo, setShowQuickInfo] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const profileHref = `/dashboard/profile/${profile.id}?source=unlocked`;
  const firstName = profile.fullName.split(" ")[0] || profile.fullName;
  const age = calculateAge(profile.dateOfBirth);
  const location =
    [profile.city, profile.state].filter(Boolean).join(", ") || "Location not added";
  const educationLabel =
    profile.course || profile.education || "Education details not added";
  const primaryPhoto =
    profile.profileImage ??
    profile.photos?.find((photo) => photo.isPrimary)?.url ??
    profile.photos?.[0]?.url ??
    null;
  const totalAmount = baseAmount + profileAmount;

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [isMenuOpen]);

  const copyProfileLink = async () => {
    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      await navigator.clipboard.writeText(`${origin}${profileHref}`);
      toast.success("Profile link copied.");
      setIsMenuOpen(false);
    } catch {
      toast.error("Could not copy profile link.");
    }
  };

  const copyPhoneNumber = async () => {
    if (!profile.phone) {
      toast.error("Phone number is not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(profile.phone);
      toast.success("Phone number copied.");
      setIsMenuOpen(false);
    } catch {
      toast.error("Could not copy phone number.");
    }
  };

  return (
    <article className="relative flex flex-col mx-auto w-full max-w-[288px] h-[440px] md:h-[460px] lg:max-w-none lg:h-full overflow-hidden rounded-[12px] border border-rose-100/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_24px_70px_rgba(15,23,42,0.07)]">
      <div className="relative flex-1 lg:flex-none lg:h-[224px] overflow-visible border-b border-rose-100/70 dark:border-slate-800">
        <div className="absolute inset-0 overflow-hidden rounded-t-[12px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95)_0%,_rgba(255,240,245,0.92)_42%,_rgba(255,232,239,0.88)_100%)] dark:!bg-none dark:bg-slate-800">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt={`${profile.fullName} match profile`}
              fill
              className={cn(
                "ui-media-zoom object-cover object-top",
                !isUnlocked ? "scale-[1.05]" : "scale-[1.04]"
              )}
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
              quality={75}
              unoptimized
            />
          ) : null}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.38)_100%)] dark:!bg-none dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.18)_0%,rgba(15,23,42,0.68)_100%)]" />
        </div>

        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[10px] border border-rose-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800 px-3 py-1 text-[13px] font-semibold text-rose-500 dark:text-rose-400 shadow-sm">
          <Heart className="h-4 w-4 fill-current" />
          Matched
        </div>

        <div ref={menuRef} className="absolute right-4 top-4 z-30">
          <button
            type="button"
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] bg-white/90 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shadow-sm transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
            aria-label="Open match actions"
          >
            <EllipsisVertical className="h-4.5 w-4.5" />
          </button>

          {isMenuOpen ? (
            <div className="absolute right-0 top-12 z-40 w-48 overflow-hidden rounded-[10px] border border-rose-100 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
              {isUnlocked ? (
                <>
                  <Link
                    href={profileHref}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => void copyProfileLink()}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Copy className="h-4 w-4" />
                    Copy profile link
                  </button>
                  <button
                    type="button"
                    onClick={() => void copyPhoneNumber()}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Phone className="h-4 w-4" />
                    Copy phone
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    onUnlock(matchId);
                    setIsMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 transition-colors hover:bg-rose-50 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <Eye className="h-4 w-4" />
                  Unlock profile
                </button>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex h-full lg:h-[224px] items-center justify-center">
          <div
            className={cn(
              "flex h-16 w-16 items-center justify-center rounded-[12px] shadow-[0_22px_46px_rgba(244,114,182,0.18)]",
              isUnlocked ? "bg-white/90 dark:bg-slate-800 text-rose-500 dark:text-rose-400" : "bg-rose-100/90 dark:bg-rose-900/90 text-white dark:text-rose-200"
            )}
          >
            {isUnlocked && primaryPhoto ? (
              <Image
                src={primaryPhoto}
                alt={`${profile.fullName} thumbnail`}
                width={64}
                height={64}
                className="h-16 w-16 rounded-[12px] object-cover"
                unoptimized
              />
            ) : (
              <Lock className="h-8 w-8" />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3.5 pb-2.5 pt-2.5">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[0.94rem] font-bold text-slate-900 dark:text-slate-100">
              {firstName}
            </h3>
            <BadgeCheck className="h-4.5 w-4.5 text-rose-500" />
            {!isUnlocked ? (
              <span className="text-sm tracking-[0.3em] text-slate-300">....</span>
            ) : null}
          </div>

          <p className="text-[14px] text-slate-500 dark:text-slate-400">
            {age} years
            {profile.religion ? ` - ${profile.religion}` : ""}
          </p>

          <div className="space-y-0.5 text-[14px] text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-slate-400" />
              <span>{profile.profession || "Professional"}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Lock className="h-4 w-4 text-slate-400" />
              <span>
                {isUnlocked && profile.phone
                  ? "Contact details available"
                  : "Contact details hidden"}
              </span>
            </div>
          </div>
        </div>

        {isUnlocked ? (
          <Link
            href={profileHref}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_16px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
          >
            <Eye className="h-4.5 w-4.5" />
            Open Full Profile
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => onUnlock(matchId)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-2.5 text-[13px] font-semibold text-white shadow-[0_16px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
          >
            <Eye className="h-4.5 w-4.5" />
            Unlock Full Profile - {formatCurrency(totalAmount)}
          </button>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
          <button
            type="button"
            onClick={() => setShowQuickInfo((current) => !current)}
            className="inline-flex w-full items-center justify-center gap-2 px-3 py-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400 transition-colors hover:text-rose-600 dark:hover:text-rose-400"
          >
            View Quick Info
            {showQuickInfo ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>

          {showQuickInfo ? (
            <div className="grid gap-3 rounded-[10px] bg-slate-50/80 dark:bg-slate-800 px-4 py-3 text-[13px] text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{location}</span>
              </div>
              <div className="flex items-start gap-2">
                <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{educationLabel}</span>
              </div>
              {profile.height ? (
                <div className="flex items-start gap-2">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>Height: {cmToFeetInches(profile.height)}</span>
                </div>
              ) : null}
              {isUnlocked ? (
                <div className="flex items-start gap-2">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <span>{profile.phone || "Phone not added"}</span>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-rose-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-rose-500 dark:text-rose-400">
                  Unlock this match to see full photos, contact details, and full
                  profile information.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

