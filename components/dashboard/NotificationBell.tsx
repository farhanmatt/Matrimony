"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Heart, MapPin } from "lucide-react";
import { getInitials } from "@/lib/utils/helpers";

type ReceivedLike = {
  id: string;
  createdAt: string;
  fromProfile: {
    id: string;
    fullName: string;
    city: string | null;
    state: string | null;
    location: string | null;
    profession: string | null;
    profileImage: string | null;
    photos: { url: string; isPrimary: boolean }[];
  };
};

function formatLikeDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function NotificationBell({
  likes,
  compact = false,
}: {
  likes: ReceivedLike[];
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationCount = likes.length;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const likeItems = useMemo(
    () =>
      likes.map((like) => {
        const location =
          [like.fromProfile.city, like.fromProfile.state].filter(Boolean).join(", ") ||
          like.fromProfile.location ||
          "India";
        const imageUrl =
          like.fromProfile.profileImage ?? like.fromProfile.photos[0]?.url ?? null;

        return {
          ...like,
          imageUrl,
          location,
          createdLabel: formatLikeDate(like.createdAt),
        };
      }),
    [likes]
  );

  return (
    <div ref={containerRef} className="relative self-start sm:self-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group inline-flex items-center text-sm font-semibold text-gray-700 transition-all hover:text-rose-600 ${
          compact
            ? "relative h-10 w-10 justify-center rounded-full border border-transparent bg-transparent p-0 text-gray-500 hover:bg-rose-50"
            : "gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open notifications"
      >
        <div
          className={`relative flex items-center justify-center text-rose-500 ${
            compact
              ? "h-5 w-5 rounded-none bg-transparent group-hover:bg-transparent"
              : "h-11 w-11 rounded-2xl bg-rose-50 transition-colors group-hover:bg-rose-100"
          }`}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span
              className={`absolute inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white ${
                compact ? "-right-3 -top-2" : "-right-1 -top-1"
              }`}
            >
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : !compact ? (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          ) : null}
        </div>
        {!compact ? (
          <div className="text-left">
            <div>Notifications</div>
            <div className="text-xs font-medium text-gray-400 group-hover:text-rose-400">
              {notificationCount > 0
                ? `${notificationCount} people liked you`
                : "No new alerts"}
            </div>
          </div>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Profile likes notifications"
          className="absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,380px)] overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-2xl shadow-rose-100/60"
        >
          <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                <Heart className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-gray-900">
                  Likes on your profile
                </h3>
                <p className="text-xs text-gray-500">
                  See who has shown interest in you recently.
                </p>
              </div>
            </div>
          </div>

          {likeItems.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-300">
                <Heart className="h-7 w-7" />
              </div>
              <p className="font-semibold text-gray-900">No profile likes yet</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                When someone likes your profile, their details will show here.
              </p>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto p-2 custom-scrollbar">
              {likeItems.map((like) => (
                <div
                  key={like.id}
                  className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-rose-50/70"
                >
                  {like.imageUrl ? (
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-rose-100">
                      <Image
                        src={like.imageUrl}
                        alt={like.fromProfile.fullName}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white">
                      {getInitials(like.fromProfile.fullName)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {like.fromProfile.fullName}
                        </p>
                        <p className="mt-0.5 text-xs text-rose-500">
                          liked your profile
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {like.createdLabel}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {like.fromProfile.profession ? (
                        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                          {like.fromProfile.profession}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] text-rose-600">
                        <MapPin className="h-3 w-3" />
                        {like.location}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
