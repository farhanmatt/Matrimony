"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  Check,
  CheckCircle2,
  EllipsisVertical,
  GraduationCap,
  MapPin,
  MessageCircle,
  UserCircle2,
  X,
} from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { calculateAge } from "@/lib/utils/helpers";
import {
  readShortlistedProfileIds,
  setShortlistedProfileId,
} from "@/lib/utils/shortlist";
import PaymentModal from "@/components/payment/PaymentModal";

interface LikedProfilePreviewCardProps {
  likedAt: string;
  shortlistUserId?: string | null;
  showChatAction?: boolean;
  isUnlocked?: boolean;
  matchId?: string;
  pricing?: {
    baseAmount: number;
    profileAmount: number;
    perProfileChatAmount: number;
    isChatPaymentEnabled?: boolean;
  };
  allowUnlike?: boolean;
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
  };
  onUnlike?: (profileId: string) => void;
  onUnlockSuccess?: () => void;
  isChatFeatureEnabled?: boolean;
}

export default function LikedProfilePreviewCard({
  likedAt,
  shortlistUserId,
  showChatAction = false,
  isUnlocked = false,
  isChatFeatureEnabled = true,
  matchId,
  pricing,
  allowUnlike = true,
  profile,
  onUnlike,
  onUnlockSuccess,
}: LikedProfilePreviewCardProps) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [removing, setRemoving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [shortlisted, setShortlisted] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFreeUnlockModal, setShowFreeUnlockModal] = useState(false);
  const [unlockingFree, setUnlockingFree] = useState(false);

  useEffect(() => {
    setShortlisted(readShortlistedProfileIds(shortlistUserId).includes(profile.id));
  }, [profile.id, shortlistUserId]);

  useEffect(() => {
    if (!menuOpen && !confirmOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [confirmOpen, menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  const primaryPhoto = profile.previewImageUrl ?? null;
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

    setMenuOpen(false);
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
        toast.error(data.error ?? "Failed to remove interest");
        return;
      }

      if (shortlisted) {
        setShortlistedProfileId(profile.id, false, shortlistUserId);
        setShortlisted(false);
      }

      toast.success("Profile removed from your interests.");
      onUnlike?.(profile.id);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRemoving(false);
    }
  };

  const handleUnlikeClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (removing || !allowUnlike) return;
    setMenuOpen(false);
    setConfirmOpen(true);
  };


  const handleMenuToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (removing) return;
    setMenuOpen((current) => !current);
  };

  const handleShortlistToggle = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    try {
      const nextShortlisted = !shortlisted;
      setShortlistedProfileId(profile.id, nextShortlisted, shortlistUserId);
      setShortlisted(nextShortlisted);
      setMenuOpen(false);
      toast.success(
        nextShortlisted
          ? "Profile added to shortlisted profiles."
          : "Profile removed from shortlisted profiles."
      );
    } catch {
      toast.error("Unable to update shortlisted profiles.");
    }
  };

  const handleChatClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!isUnlocked) {
      if (pricing?.isChatPaymentEnabled === false) {
        // Chat payment is disabled by admin, show verification confirmation instead of payment
        setShowFreeUnlockModal(true);
        return;
      }
      if (!pricing) {
        toast.error("Unlock information not available for this chat.");
        return;
      }
      setShowPaymentModal(true);
      return;
    }
    router.push(`/dashboard/chat/${profile.id}`);
  };

  const handleFreeUnlockConfirm = async () => {
    setUnlockingFree(true);
    try {
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProfileId: profile.id, type: "CHAT" }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        toast.error(data.error ?? "Failed to unlock chat.");
        return;
      }
      
      onUnlockSuccess?.();
      setShowFreeUnlockModal(false);
      router.push(`/dashboard/chat/${profile.id}`);
    } catch (e) {
      toast.error("Something went wrong.");
    } finally {
      setUnlockingFree(false);
    }
  };

  return (
    <>
      <article className="ui-card-lift group mx-auto w-full max-w-[288px] lg:max-w-none flex h-[440px] md:h-[460px] lg:h-full flex-col overflow-hidden rounded-[12px] border border-rose-100 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1 lg:flex-none lg:h-[224px] overflow-hidden bg-[linear-gradient(135deg,#fff2f5_0%,#ffe4ec_100%)] dark:!bg-slate-800 dark:!bg-none">
          {primaryPhoto ? (
            <Image
              src={primaryPhoto}
              alt="Protected matrimony profile preview"
              fill
              className="ui-media-zoom scale-[1.04] object-cover object-top"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, (max-width: 1536px) 25vw, 20vw"
              quality={75}
              unoptimized
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg shadow-rose-100 dark:bg-slate-800 dark:shadow-none">
                <UserCircle2 className="h-10 w-10 text-rose-400" />
              </div>
            </div>
          )}

          <div className="absolute left-3 top-3 rounded-full bg-slate-900/45 px-3 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            {likedLabel}
          </div>

          <div ref={menuRef} className="absolute right-3 top-3 z-20">
            <button
              type="button"
              onClick={handleMenuToggle}
              disabled={removing}
              className="ui-link-shift inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-600 shadow-md transition-transform hover:scale-105 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              aria-label="Open interest actions"
            >
              <EllipsisVertical className="h-4.5 w-4.5" />
            </button>

            {menuOpen ? (
              <div className="ui-enter-up absolute right-0 top-11 w-48 overflow-hidden rounded-[18px] border border-rose-100 bg-white py-2 shadow-[0_20px_44px_rgba(15,23,42,0.16)] dark:border-slate-700 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={handleShortlistToggle}
                    className="ui-link-shift flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                  >
                    <Bookmark
                      className={`h-4 w-4 ${
                        shortlisted ? "fill-current text-rose-500" : "text-slate-500"
                      }`}
                    />
                    <span className="flex-1">
                      {shortlisted ? "Shortlisted" : "Shortlist"}
                    </span>
                    {shortlisted ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                  </button>
                {allowUnlike ? (
                  <button
                    type="button"
                    onClick={handleUnlikeClick}
                    disabled={removing}
                    className="ui-link-shift flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-rose-400"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                    <span className="flex-1">Remove interest</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col px-3.5 pb-2.5 pt-2.5 lg:flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex items-center gap-2 text-[0.95rem] font-bold text-slate-900 dark:text-slate-100">
                <span className="truncate">
                  {profile.fullName}, {age}
                </span>
                <CheckCircle2 className="ui-icon-lift h-4 w-4 shrink-0 text-emerald-500" />
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {profile.profession || "Professional"}
              </p>
            </div>
          </div>

          <div className="mt-3.5 space-y-2 text-[12px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{location}</span>
            </div>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="truncate">{educationLabel}</span>
            </div>
          </div>

          {showChatAction && isChatFeatureEnabled ? (
            <div className="mt-auto pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleChatClick}
                className={`ui-link-shift inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                  isUnlocked 
                    ? "border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:bg-rose-100 dark:border-slate-700 dark:bg-slate-800 dark:text-rose-400 dark:hover:bg-slate-700" 
                    : "border-slate-200 bg-slate-50 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-rose-400"
                }`}
                aria-label={`Chat with ${profile.fullName}`}
              >
                <MessageCircle className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : null}
        </div>
      </article>

      {allowUnlike && confirmOpen ? (
        <div
          className="ui-overlay-fade fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            className="ui-modal-pop w-full max-w-sm rounded-[24px] border border-rose-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`unlike-confirm-title-${profile.id}`}
          >
            <h3
              id={`unlike-confirm-title-${profile.id}`}
              className="font-display text-xl font-bold text-slate-900 dark:text-slate-100"
            >
              Remove interest?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Do you want to remove {profile.fullName} from your interests?
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={removing}
                className="ui-link-shift inline-flex flex-1 items-center justify-center rounded-[16px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void handleUnlike()}
                disabled={removing}
                className="ui-link-shift inline-flex flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30_rgba(244,63,94,0.24)] transition-all hover:shadow-[0_18px_36px_rgba(244,63,94,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {removing ? "Removing..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showPaymentModal && pricing && (
        <PaymentModal
          matchId={matchId}
          targetProfileId={profile.id}
          profileName={profile.fullName}
          baseAmount={pricing.baseAmount}
          profileAmount={pricing.profileAmount}
          perProfileChatAmount={pricing.perProfileChatAmount}
          type="CHAT"
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            // Force immediate navigation
            window.location.href = `/dashboard/chat/${profile.id}`;
          }}
        />
      )}

      {showFreeUnlockModal && (
        <div
          className="ui-overlay-fade fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 px-4 py-6 backdrop-blur-sm"
          onClick={() => setShowFreeUnlockModal(false)}
        >
          <div
            className="ui-modal-pop w-full max-w-sm rounded-[24px] border border-rose-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-900"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
              Chat Unlock Verification
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Are you sure you want to start a conversation with {profile.fullName}?
            </p>

            <div className="mt-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFreeUnlockModal(false)}
                disabled={unlockingFree}
                className="ui-link-shift inline-flex flex-1 items-center justify-center rounded-[16px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleFreeUnlockConfirm()}
                disabled={unlockingFree}
                className="ui-link-shift inline-flex flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30_rgba(244,63,94,0.24)] transition-all hover:shadow-[0_18px_36px_rgba(244,63,94,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {unlockingFree ? "Unlocking..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

