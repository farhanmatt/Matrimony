"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from "react";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Briefcase,
  Copy,
  EllipsisVertical,
  ExternalLink,
  GraduationCap,
  MapPin,
  MessageCircle,
  Ruler,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  calculateAge,
  cmToFeetInches,
  formatDate,
  MARITAL_STATUS_LABELS,
} from "@/lib/utils/helpers";

export interface UnlockedProfileCardData {
  id: string;
  fullName: string;
  gender: string;
  dateOfBirth: Date | string;
  updatedAt: Date | string;
  height: number | null;
  maritalStatus: string;
  education: string | null;
  course?: string | null;
  profession: string | null;
  city: string | null;
  state: string | null;
  religion: string | null;
  caste?: string | null;
  phone?: string | null;
  bio?: string | null;
  photos: { url: string; isPrimary: boolean }[];
}

interface UnlockedProfileCardProps {
  profile: UnlockedProfileCardData;
  unlockedAt: Date | string;
}

function normalizePhoneNumber(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (!digits) {
    return null;
  }

  if (digits.length === 10) {
    return `91${digits}`;
  }

  return digits;
}

export default function UnlockedProfileCard({
  profile,
  unlockedAt,
}: UnlockedProfileCardProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const primaryPhoto =
    profile.photos.find((photo) => photo.isPrimary)?.url ??
    profile.photos[0]?.url ??
    null;
  const age = calculateAge(profile.dateOfBirth);
  const profileHref = `/dashboard/profile/${profile.id}?source=unlocked`;
  const location =
    [profile.city, profile.state].filter(Boolean).join(", ") || "Location not added";
  const educationLabel =
    profile.course || profile.education || "Education details not added";
  const religionLabel =
    [profile.religion, profile.caste].filter(Boolean).join(", ") || "Cultural details available";
  const statusFacts = [
    profile.height ? cmToFeetInches(profile.height) : null,
    MARITAL_STATUS_LABELS[profile.maritalStatus],
  ].filter((value): value is string => Boolean(value));
  const normalizedPhone = normalizePhoneNumber(profile.phone);
  const whatsappHref = normalizedPhone ? `https://wa.me/${normalizedPhone}` : null;

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

  const openProfile = () => {
    router.push(profileHref);
  };

  const handleCardKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openProfile();
    }
  };

  const stopCardNavigation = (event: ReactMouseEvent<HTMLElement>) => {
    event.stopPropagation();
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
    <article
      className="group relative overflow-hidden rounded-[22px] border border-emerald-100/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.1)] cursor-pointer"
      onClick={openProfile}
      onKeyDown={handleCardKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`Open ${profile.fullName} full profile`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(236,253,245,0.6)_0%,rgba(255,255,255,0)_36%)]" />

      <div className="relative px-4 pb-4 pt-4">
        <div className="relative h-[170px] overflow-hidden rounded-[18px] bg-[linear-gradient(135deg,#e8faf0_0%,#f5fff9_100%)]">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt={`${profile.fullName} matrimony profile`}
              fill
              className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
              quality={75}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/90 shadow-lg shadow-emerald-100">
                <span className="text-3xl font-display font-bold text-emerald-600">
                  {profile.fullName[0]}
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.04)_100%)]" />

          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/96 px-3 py-1.5 text-xs font-semibold text-emerald-600 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Unlocked
          </div>

          <div ref={menuRef} className="absolute right-4 top-4 z-20">
            <button
              type="button"
              onClick={(event) => {
                stopCardNavigation(event);
                setIsMenuOpen((current) => !current);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/32 text-white backdrop-blur-sm transition-colors hover:bg-black/45"
              aria-label="Open unlocked profile actions"
            >
              <EllipsisVertical className="h-[18px] w-[18px]" />
            </button>

            {isMenuOpen ? (
              <div className="absolute right-0 top-12 w-48 overflow-hidden rounded-[18px] border border-emerald-100 bg-white py-2 shadow-[0_20px_44px_rgba(15,23,42,0.16)]">
                <Link
                  href={profileHref}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open full profile
                </Link>
                <button
                  type="button"
                  onClick={(event) => {
                    stopCardNavigation(event);
                    void copyPhoneNumber();
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <Copy className="h-4 w-4" />
                  Copy phone number
                </button>
                {whatsappHref ? (
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                    onClick={stopCardNavigation}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Open WhatsApp
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="px-1 pb-1 pt-5">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-[1.52rem] font-bold tracking-tight text-slate-900">
              {profile.fullName.split(" ")[0]}, {age}
            </h3>
            <BadgeCheck className="h-[18px] w-[18px] text-emerald-500" />
          </div>

          <div className="mt-4 space-y-2.5 text-[14px] text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{profile.profession || "Professional"}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{educationLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
              <span className="truncate">{religionLabel}</span>
            </div>
            {statusFacts.length > 0 ? (
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate">{statusFacts.join(" | ")}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-4 rounded-[14px] bg-[linear-gradient(90deg,rgba(236,253,245,0.95)_0%,rgba(240,253,244,0.72)_100%)] px-4 py-2.5 text-center text-[13px] font-semibold text-emerald-700">
            Unlocked on {formatDate(unlockedAt)}
          </div>
        </div>
      </div>
    </article>
  );
}
