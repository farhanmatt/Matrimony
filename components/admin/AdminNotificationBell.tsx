"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, CreditCard, HeartHandshake, UserCheck, Users } from "lucide-react";

const ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY = "vivah-admin-notifications-seen-at";
const ADMIN_NOTIFICATIONS_SEEN_EVENT = "vivah-admin-notifications-seen-updated";

export type AdminNotificationKind = "user" | "profile" | "match" | "payment";

export interface AdminNotificationItem {
  id: string;
  kind: AdminNotificationKind;
  title: string;
  detail: string;
  createdAt: string;
  createdAtLabel: string;
}

interface AdminNotificationBellProps {
  notifications: AdminNotificationItem[];
}

function getNotificationStyle(kind: AdminNotificationKind) {
  switch (kind) {
    case "profile":
      return {
        icon: UserCheck,
        iconClassName: "text-rose-600",
        iconBgClassName: "bg-rose-50",
      };
    case "match":
      return {
        icon: HeartHandshake,
        iconClassName: "text-violet-600",
        iconBgClassName: "bg-violet-50",
      };
    case "payment":
      return {
        icon: CreditCard,
        iconClassName: "text-amber-600",
        iconBgClassName: "bg-amber-50",
      };
    case "user":
    default:
      return {
        icon: Users,
        iconClassName: "text-emerald-600",
        iconBgClassName: "bg-emerald-50",
      };
  }
}

function readAdminNotificationsSeenAt() {
  if (typeof window === "undefined") {
    return null as string | null;
  }

  try {
    return window.localStorage.getItem(ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}

function writeAdminNotificationsSeenAt(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(ADMIN_NOTIFICATIONS_SEEN_STORAGE_KEY, value);
    window.dispatchEvent(
      new CustomEvent(ADMIN_NOTIFICATIONS_SEEN_EVENT, {
        detail: { seenAt: value },
      })
    );
  } catch {
    // Ignore storage failures and keep the bell usable.
  }
}

function getLatestNotificationCreatedAt(notifications: AdminNotificationItem[]) {
  return notifications.reduce<string | null>((latestValue, item) => {
    if (!latestValue) {
      return item.createdAt;
    }

    return new Date(item.createdAt).getTime() > new Date(latestValue).getTime()
      ? item.createdAt
      : latestValue;
  }, null);
}

export default function AdminNotificationBell({ notifications }: AdminNotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visibleItems = useMemo(() => notifications.slice(0, 6), [notifications]);

  useEffect(() => {
    setSeenAt(readAdminNotificationsSeenAt());
  }, []);

  useEffect(() => {
    const handleSeenUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ seenAt?: string | null }>;
      setSeenAt(customEvent.detail?.seenAt ?? null);
    };

    window.addEventListener(
      ADMIN_NOTIFICATIONS_SEEN_EVENT,
      handleSeenUpdated as EventListener
    );

    return () =>
      window.removeEventListener(
        ADMIN_NOTIFICATIONS_SEEN_EVENT,
        handleSeenUpdated as EventListener
      );
  }, []);

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

  useEffect(() => {
    if (!open) {
      return;
    }

    const latestCreatedAt = getLatestNotificationCreatedAt(notifications);
    if (!latestCreatedAt) {
      return;
    }

    if (!seenAt || new Date(seenAt).getTime() < new Date(latestCreatedAt).getTime()) {
      setSeenAt(latestCreatedAt);
      writeAdminNotificationsSeenAt(latestCreatedAt);
    }
  }, [notifications, open, seenAt]);

  const notificationCount = useMemo(() => {
    if (!seenAt) {
      return notifications.length;
    }

    const seenTimestamp = new Date(seenAt).getTime();
    return notifications.filter(
      (item) => new Date(item.createdAt).getTime() > seenTimestamp
    ).length;
  }, [notifications, seenAt]);

  return (
    <div ref={containerRef} className="relative self-start sm:self-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="group inline-flex items-center justify-center rounded-2xl border border-white/80 bg-white p-3.5 text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:text-rose-600 hover:shadow-md"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open notifications"
      >
        <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white">
              {notificationCount > 99 ? "99+" : notificationCount}
            </span>
          ) : (
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-white" />
          )}
        </div>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Admin notifications"
          className="absolute right-0 top-[calc(100%+12px)] z-50 w-[min(92vw,380px)] overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-2xl shadow-rose-100/60"
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
                  Recent platform activity and updates.
                </p>
              </div>
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-300">
                <Bell className="h-7 w-7" />
              </div>
              <p className="font-semibold text-gray-900">No notifications yet</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                When new registrations, profiles, matches, or payments happen, they will show here.
              </p>
            </div>
          ) : (
            <div className="max-h-[26rem] overflow-y-auto p-2 custom-scrollbar">
              {visibleItems.map((item) => {
                const style = getNotificationStyle(item.kind);
                const Icon = style.icon;

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-rose-50/70"
                  >
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBgClassName}`}>
                      <Icon className={`h-4.5 w-4.5 ${style.iconClassName}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                          <p className="mt-0.5 text-xs text-gray-500">{item.detail}</p>
                        </div>
                        <span className="shrink-0 text-[11px] text-gray-400">{item.createdAtLabel}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
