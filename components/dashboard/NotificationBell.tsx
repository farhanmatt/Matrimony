"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Heart, MapPin, MessageCircle } from "lucide-react";
import { getInitials } from "@/lib/utils/helpers";
import type { DashboardNotificationItem } from "@/lib/utils/notifications";

const NOTIFICATIONS_SEEN_STORAGE_KEY = "vivah-dashboard-notifications-seen-at";
const NOTIFICATIONS_SEEN_EVENT = "vivah-dashboard-notifications-seen-updated";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getNotificationAccent(kind: DashboardNotificationItem["kind"]) {
  return kind === "message"
    ? {
        badgeClass: "bg-sky-50 text-sky-600",
        icon: MessageCircle,
        label: "Message",
      }
    : {
        badgeClass: "bg-rose-50 text-rose-600",
        icon: Heart,
        label: "Interest",
      };
}

function getNotificationsSeenStorageKey(profileId?: string | null) {
  const normalizedProfileId = profileId?.trim();
  return normalizedProfileId
    ? `${NOTIFICATIONS_SEEN_STORAGE_KEY}:${normalizedProfileId}`
    : NOTIFICATIONS_SEEN_STORAGE_KEY;
}

function readNotificationsSeenAt(profileId?: string | null) {
  if (typeof window === "undefined") {
    return null as string | null;
  }

  try {
    return (
      window.localStorage.getItem(getNotificationsSeenStorageKey(profileId)) ?? null
    );
  } catch {
    return null;
  }
}

function writeNotificationsSeenAt(value: string, profileId?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getNotificationsSeenStorageKey(profileId), value);
    window.dispatchEvent(
      new CustomEvent(NOTIFICATIONS_SEEN_EVENT, {
        detail: { profileId: profileId?.trim() ?? null, seenAt: value },
      })
    );
  } catch {
    // Ignore storage failures and keep the bell usable.
  }
}

function getLatestNotificationCreatedAt(
  notifications: DashboardNotificationItem[]
) {
  return notifications.reduce<string | null>((latestValue, item) => {
    if (!latestValue) {
      return item.createdAt;
    }

    return new Date(item.createdAt).getTime() > new Date(latestValue).getTime()
      ? item.createdAt
      : latestValue;
  }, null);
}

export default function NotificationBell({
  initialNotifications = [],
  initialProfileId = null,
  compact = false,
}: {
  initialNotifications?: DashboardNotificationItem[];
  initialProfileId?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [profileId, setProfileId] = useState<string | null>(initialProfileId);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setProfileId(initialProfileId);
  }, [initialProfileId]);

  useEffect(() => {
    setSeenAt(readNotificationsSeenAt(profileId));
  }, [profileId]);

  useEffect(() => {
    const handleSeenUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{
        profileId?: string | null;
        seenAt?: string | null;
      }>;
      const nextProfileId = customEvent.detail?.profileId ?? null;

      if ((profileId ?? null) !== nextProfileId) {
        return;
      }

      setSeenAt(customEvent.detail?.seenAt ?? null);
    };

    window.addEventListener(
      NOTIFICATIONS_SEEN_EVENT,
      handleSeenUpdated as EventListener
    );

    return () =>
      window.removeEventListener(
        NOTIFICATIONS_SEEN_EVENT,
        handleSeenUpdated as EventListener
      );
  }, [profileId]);

  const markNotificationsSeen = useCallback(
    (items: DashboardNotificationItem[]) => {
      const latestCreatedAt = getLatestNotificationCreatedAt(items);
      if (!latestCreatedAt) {
        return;
      }

      setSeenAt((currentSeenAt) => {
        if (
          currentSeenAt &&
          new Date(currentSeenAt).getTime() >= new Date(latestCreatedAt).getTime()
        ) {
          return currentSeenAt;
        }

        writeNotificationsSeenAt(latestCreatedAt, profileId);
        return latestCreatedAt;
      });
    },
    [profileId]
  );

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
        headers: {
          "x-skip-loading": "1",
        },
      });

      if (!response.ok) {
        return;
      }

      const result = await response.json();
      const nextItems = Array.isArray(result.data?.items) ? result.data.items : [];
      const nextProfileId =
        typeof result.data?.profileId === "string" ? result.data.profileId : null;

      startTransition(() => {
        setProfileId(nextProfileId);
        setNotifications(nextItems);
      });
    } catch {
      // Keep the latest known state when notification refresh fails.
    }
  }, []);

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    const handleNotification = () => {
      void refreshNotifications();
    };

    eventSource.addEventListener("notification", handleNotification);
    eventSource.addEventListener("ready", handleNotification);

    return () => {
      eventSource.removeEventListener("notification", handleNotification);
      eventSource.removeEventListener("ready", handleNotification);
      eventSource.close();
    };
  }, [refreshNotifications]);

  useEffect(() => {
    if (!open) return;

    void refreshNotifications();

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
  }, [open, refreshNotifications]);

  useEffect(() => {
    if (!open) {
      return;
    }

    markNotificationsSeen(notifications);
  }, [markNotificationsSeen, notifications, open]);

  const notificationCount = useMemo(() => {
    if (!seenAt) {
      return notifications.length;
    }

    const seenTimestamp = new Date(seenAt).getTime();
    return notifications.filter(
      (item) => new Date(item.createdAt).getTime() > seenTimestamp
    ).length;
  }, [notifications, seenAt]);

  const visibleNotifications = useMemo(
    () =>
      notifications.map((item) => ({
        ...item,
        createdLabel: formatNotificationDate(item.createdAt),
      })),
    [notifications]
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
              {notificationCount > 0 ? `${notificationCount} new alerts` : "No new alerts"}
            </div>
          </div>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Your notifications"
          className="absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,400px)] overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-2xl shadow-rose-100/60"
        >
          <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                <Bell className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-gray-900">
                  Notifications
                </h3>
                <p className="text-xs text-gray-500">
                  Unread chat messages and profile activity for your account.
                </p>
              </div>
            </div>
          </div>

          {visibleNotifications.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-300">
                <Bell className="h-7 w-7" />
              </div>
              <p className="font-semibold text-gray-900">No new notifications</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                When someone likes your profile or sends you a message, it will show here.
              </p>
            </div>
          ) : (
            <div className="max-h-[28rem] overflow-y-auto p-2 custom-scrollbar">
              {visibleNotifications.map((item) => {
                const accent = getNotificationAccent(item.kind);
                const AccentIcon = accent.icon;

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-rose-50/70"
                  >
                    {item.actorImageUrl ? (
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-rose-100">
                        <Image
                          src={item.actorImageUrl}
                          alt={item.actorName}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white">
                        {getInitials(item.actorName)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-900">
                            {item.title}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-gray-500">
                            {item.subtitle}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-gray-400">
                          {item.createdLabel}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${accent.badgeClass}`}
                        >
                          <AccentIcon className="h-3 w-3" />
                          {accent.label}
                        </span>
                        {item.actorProfession ? (
                          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] text-gray-600">
                            {item.actorProfession}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600">
                          <MapPin className="h-3 w-3" />
                          {item.actorLocation}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
