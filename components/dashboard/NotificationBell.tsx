"use client";

import Image from "next/image";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, Heart, Loader2, MapPin, MessageCircle, X } from "lucide-react";
import { toast } from "sonner";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import { getInitials } from "@/lib/utils/helpers";
import {
  DASHBOARD_REALTIME_EVENT_NAME,
  type DashboardRealtimeEvent,
} from "@/lib/types/dashboard-realtime";
import type { DashboardNotificationItem } from "@/lib/utils/notifications";
import {
  readShortlistedProfileIds,
  setShortlistedProfileId,
  SHORTLIST_UPDATED_EVENT,
} from "@/lib/utils/shortlist";

const NOTIFICATIONS_SEEN_STORAGE_KEY = "vivah-dashboard-notifications-seen-at";
const NOTIFICATIONS_SEEN_EVENT = "vivah-dashboard-notifications-seen-updated";
const PENDING_MESSAGE_NOTIFICATIONS_STORAGE_KEY =
  "vivah-dashboard-pending-message-notifications";
const SECURE_NOTIFICATION_IMAGE_ROUTE_PREFIX = "/api/notifications/profile-image/";
const NOTIFICATION_PANEL_EXIT_MS = 240;
const NOTIFICATION_REFRESH_INTERVAL_MS = 30_000;

type PendingMessageNotification = DashboardNotificationItem & {
  kind: "message";
};

function getPendingMessageNotificationsStorageKey(userId?: string | null) {
  const normalizedUserId = userId?.trim();
  return normalizedUserId
    ? `${PENDING_MESSAGE_NOTIFICATIONS_STORAGE_KEY}:${normalizedUserId}`
    : PENDING_MESSAGE_NOTIFICATIONS_STORAGE_KEY;
}

function normalizePendingMessageNotification(
  item: DashboardNotificationItem
): PendingMessageNotification | null {
  if (item.kind !== "message") {
    return null;
  }

  const actorProfileId = item.actorProfileId?.trim();
  if (!actorProfileId) {
    return null;
  }

  return {
    ...item,
    kind: "message",
    actorProfileId,
    actorImageUrl:
      typeof item.actorImageUrl === "string" &&
      item.actorImageUrl.startsWith(SECURE_NOTIFICATION_IMAGE_ROUTE_PREFIX)
        ? item.actorImageUrl
        : null,
  };
}

function readPendingMessageNotifications(userId?: string | null) {
  if (typeof window === "undefined") {
    return [] as PendingMessageNotification[];
  }

  try {
    const normalizedUserId = userId?.trim();
    if (!normalizedUserId) {
      return [] as PendingMessageNotification[];
    }

    const storedValue = window.localStorage.getItem(
      getPendingMessageNotificationsStorageKey(normalizedUserId)
    );

    if (!storedValue) {
      return [] as PendingMessageNotification[];
    }

    const parsedValue = JSON.parse(storedValue);
    if (!Array.isArray(parsedValue)) {
      return [] as PendingMessageNotification[];
    }

    return parsedValue.reduce<PendingMessageNotification[]>((items, value) => {
      const normalizedItem = normalizePendingMessageNotification(
        value as DashboardNotificationItem
      );

      if (normalizedItem) {
        items.push(normalizedItem);
      }

      return items;
    }, []);
  } catch {
    return [] as PendingMessageNotification[];
  }
}

function writePendingMessageNotifications(
  items: PendingMessageNotification[],
  userId?: string | null
) {
  if (typeof window === "undefined") {
    return;
  }

  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return;
  }

  try {
    const dedupedItems = Array.from(
      new Map(items.map((item) => [item.actorProfileId, item])).values()
    );
    window.localStorage.setItem(
      getPendingMessageNotificationsStorageKey(normalizedUserId),
      JSON.stringify(dedupedItems)
    );
  } catch {
    // Ignore storage failures and keep the notification bell usable.
  }
}

function arePendingMessageNotificationsEqual(
  first: PendingMessageNotification[],
  second: PendingMessageNotification[]
) {
  const serialize = (items: PendingMessageNotification[]) =>
    JSON.stringify(
      [...items]
        .sort((left, right) =>
          left.actorProfileId.localeCompare(right.actorProfileId)
        )
        .map((item) => ({
          id: item.id,
          createdAt: item.createdAt,
          href: item.href,
          actorProfileId: item.actorProfileId,
          actorName: item.actorName,
          actorProfession: item.actorProfession,
          actorLocation: item.actorLocation,
          actorImageUrl: item.actorImageUrl,
          title: item.title,
          subtitle: item.subtitle,
        }))
    );

  return serialize(first) === serialize(second);
}

function mergePendingMessageNotifications(
  currentPending: PendingMessageNotification[],
  serverNotifications: DashboardNotificationItem[],
  shortlistedProfileIds: string[]
) {
  const shortlistedProfileIdSet = new Set(shortlistedProfileIds);
  const pendingByActorProfileId = new Map(
    currentPending
      .filter((item) => !shortlistedProfileIdSet.has(item.actorProfileId))
      .map((item) => [item.actorProfileId, item] as const)
  );

  for (const item of serverNotifications) {
    const normalizedItem = normalizePendingMessageNotification(item);
    if (
      normalizedItem &&
      !shortlistedProfileIdSet.has(normalizedItem.actorProfileId)
    ) {
      pendingByActorProfileId.set(normalizedItem.actorProfileId, normalizedItem);
    }
  }

  return Array.from(pendingByActorProfileId.values());
}

function mergeVisibleNotifications(
  serverNotifications: DashboardNotificationItem[],
  pendingMessageNotifications: PendingMessageNotification[]
) {
  const messageNotificationsByActorProfileId = new Map(
    pendingMessageNotifications.map((item) => [item.actorProfileId, item] as const)
  );

  for (const item of serverNotifications) {
    const normalizedItem = normalizePendingMessageNotification(item);
    if (normalizedItem) {
      messageNotificationsByActorProfileId.set(
        normalizedItem.actorProfileId,
        normalizedItem
      );
    }
  }

  return [
    ...serverNotifications.filter((item) => item.kind !== "message"),
    ...Array.from(messageNotificationsByActorProfileId.values()),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getNotificationAccent(kind: DashboardNotificationItem["kind"]) {
  if (kind === "message") {
    return {
      badgeClass: "bg-sky-50 text-sky-600",
      icon: MessageCircle,
      label: "Message",
    };
  }

  if (kind === "message_rejected") {
    return {
      badgeClass: "bg-amber-50 text-amber-600",
      icon: X,
      label: "Rejected",
    };
  }

  return {
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
  shortlistUserId = null,
  compact = false,
}: {
  initialNotifications?: DashboardNotificationItem[];
  initialProfileId?: string | null;
  shortlistUserId?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [serverNotifications, setServerNotifications] = useState(initialNotifications);
  const [profileId, setProfileId] = useState<string | null>(initialProfileId);
  const [seenAt, setSeenAt] = useState<string | null>(null);
  const [pendingActorProfileIds, setPendingActorProfileIds] = useState<string[]>([]);
  const [shortlistedProfileIds, setShortlistedProfileIds] = useState<string[]>([]);
  const [pendingMessageNotifications, setPendingMessageNotifications] = useState<
    PendingMessageNotification[]
  >([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setServerNotifications(initialNotifications);
  }, [initialNotifications]);

  useEffect(() => {
    setProfileId(initialProfileId);
  }, [initialProfileId]);

  useEffect(() => {
    setSeenAt(readNotificationsSeenAt(profileId));
  }, [profileId]);

  useEffect(() => {
    setShortlistedProfileIds(readShortlistedProfileIds(shortlistUserId));
    setPendingMessageNotifications(readPendingMessageNotifications(shortlistUserId));

    const handleShortlistUpdated = (event: Event) => {
      const shortlistEvent = event as CustomEvent<{
        profileIds?: string[];
        userId?: string | null;
      }>;

      if ((shortlistEvent.detail?.userId ?? null) !== shortlistUserId) {
        return;
      }

      setShortlistedProfileIds(
        shortlistEvent.detail?.profileIds ??
          readShortlistedProfileIds(shortlistUserId)
      );
    };

    window.addEventListener(
      SHORTLIST_UPDATED_EVENT,
      handleShortlistUpdated as EventListener
    );

    return () =>
      window.removeEventListener(
        SHORTLIST_UPDATED_EVENT,
        handleShortlistUpdated as EventListener
      );
  }, [shortlistUserId]);

  useEffect(() => {
    if (!shortlistUserId) {
      return;
    }

    setPendingMessageNotifications((currentPendingNotifications) => {
      const nextPendingNotifications = mergePendingMessageNotifications(
        currentPendingNotifications,
        serverNotifications,
        shortlistedProfileIds
      );

      if (
        arePendingMessageNotificationsEqual(
          currentPendingNotifications,
          nextPendingNotifications
        )
      ) {
        return currentPendingNotifications;
      }

      writePendingMessageNotifications(nextPendingNotifications, shortlistUserId);
      return nextPendingNotifications;
    });
  }, [serverNotifications, shortlistUserId, shortlistedProfileIds]);

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
        setServerNotifications(nextItems);
      });
    } catch {
      // Keep the latest known state when notification refresh fails.
    }
  }, []);

  const dismissMessageNotifications = useCallback(
    async (actorProfileId: string, action: "accept" | "reject") => {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          "x-skip-loading": "1",
        },
        body: JSON.stringify({
          kind: "message",
          actorProfileId,
          action,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to update notification");
      }
    },
    []
  );

  const removeNotificationsForActor = useCallback((actorProfileId: string) => {
    setServerNotifications((currentNotifications) =>
      currentNotifications.filter(
        (notification) =>
          !(
            notification.kind === "message" &&
            notification.actorProfileId === actorProfileId
          )
      )
    );
    setPendingMessageNotifications((currentNotifications) => {
      const nextNotifications = currentNotifications.filter(
        (notification) => notification.actorProfileId !== actorProfileId
      );

      writePendingMessageNotifications(nextNotifications, shortlistUserId);
      return nextNotifications;
    });
  }, [shortlistUserId]);

  const handleAccept = useCallback(
    async (item: DashboardNotificationItem) => {
      if (item.kind !== "message") {
        return;
      }

      if (!shortlistUserId) {
        toast.error("Unable to update shortlist right now.");
        return;
      }

      const actorProfileId = item.actorProfileId;
      const alreadyShortlisted = shortlistedProfileIds.includes(actorProfileId);
      let shortlistUpdated = false;

      setPendingActorProfileIds((currentIds) =>
        currentIds.includes(actorProfileId)
          ? currentIds
          : [...currentIds, actorProfileId]
      );

      try {
        setShortlistedProfileId(
          actorProfileId,
          true,
          shortlistUserId,
          alreadyShortlisted
            ? undefined
            : {
                savedAt: item.createdAt,
                source: "message",
              }
        );
        shortlistUpdated = true;

        await dismissMessageNotifications(actorProfileId, "accept");
        removeNotificationsForActor(actorProfileId);
        toast.success(
          alreadyShortlisted
            ? "Message accepted and notification cleared."
            : "Profile added to shortlist."
        );
        void refreshNotifications();
      } catch (error) {
        toast.error(
          shortlistUpdated
            ? "Profile added to shortlist, but the notification could not be cleared."
            : error instanceof Error
              ? error.message
              : "Unable to update shortlist right now."
        );
      } finally {
        setPendingActorProfileIds((currentIds) =>
          currentIds.filter((id) => id !== actorProfileId)
        );
      }
    },
    [
      dismissMessageNotifications,
      refreshNotifications,
      removeNotificationsForActor,
      shortlistUserId,
      shortlistedProfileIds,
    ]
  );

  const handleReject = useCallback(
    async (item: DashboardNotificationItem) => {
      if (item.kind !== "message") {
        return;
      }

      const actorProfileId = item.actorProfileId;

      setPendingActorProfileIds((currentIds) =>
        currentIds.includes(actorProfileId)
          ? currentIds
          : [...currentIds, actorProfileId]
      );

      try {
        await dismissMessageNotifications(actorProfileId, "reject");
        removeNotificationsForActor(actorProfileId);
        toast.success("Notification removed.");
        void refreshNotifications();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to remove notification."
        );
      } finally {
        setPendingActorProfileIds((currentIds) =>
          currentIds.filter((id) => id !== actorProfileId)
        );
      }
    },
    [dismissMessageNotifications, refreshNotifications, removeNotificationsForActor]
  );

  useEffect(() => {
    void refreshNotifications();
  }, [refreshNotifications]);

  useAutoRefresh(refreshNotifications, {
    intervalMs: NOTIFICATION_REFRESH_INTERVAL_MS,
  });

  useEffect(() => {
    const handleRealtimeEvent = (event: Event) => {
      const realtimeEvent = event as CustomEvent<DashboardRealtimeEvent>;

      if (realtimeEvent.detail?.type !== "message_created") {
        return;
      }

      void refreshNotifications();
    };

    window.addEventListener(
      DASHBOARD_REALTIME_EVENT_NAME,
      handleRealtimeEvent as EventListener
    );

    return () =>
      window.removeEventListener(
        DASHBOARD_REALTIME_EVENT_NAME,
        handleRealtimeEvent as EventListener
      );
  }, [refreshNotifications]);

  const visibleNotifications = useMemo(
    () =>
      mergeVisibleNotifications(
        serverNotifications,
        pendingMessageNotifications
      ),
    [pendingMessageNotifications, serverNotifications]
  );

  const visibleNotificationsWithLabels = useMemo(
    () =>
      visibleNotifications.map((item) => ({
        ...item,
        createdLabel: formatNotificationDate(item.createdAt),
      })),
    [visibleNotifications]
  );
  const shortlistedProfileIdSet = useMemo(
    () => new Set(shortlistedProfileIds),
    [shortlistedProfileIds]
  );

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

    markNotificationsSeen(visibleNotifications);
  }, [markNotificationsSeen, open, visibleNotifications]);

  useEffect(() => {
    if (open) {
      setPanelVisible(true);
      return;
    }

    if (!panelVisible) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPanelVisible(false);
    }, NOTIFICATION_PANEL_EXIT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [open, panelVisible]);

  const notificationCount = useMemo(() => {
    if (!seenAt) {
      return visibleNotifications.length;
    }

    const seenTimestamp = new Date(seenAt).getTime();
    return visibleNotifications.filter(
      (item) => new Date(item.createdAt).getTime() > seenTimestamp
    ).length;
  }, [seenAt, visibleNotifications]);

  return (
    <div ref={containerRef} className="relative self-start sm:self-auto">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`group inline-flex items-center text-sm font-semibold text-gray-700 transition-all ui-link-shift hover:text-rose-600 ${
          compact
            ? "relative h-10 w-10 justify-center rounded-full border border-transparent bg-transparent p-0 text-gray-500 hover:bg-rose-50"
            : "gap-3 rounded-2xl border border-white/80 bg-white px-4 py-3 shadow-sm hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
        }`}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open notifications"
      >
        <div
          className={`relative flex items-center justify-center text-rose-500 ui-icon-lift ${
            compact
              ? "h-5 w-5 rounded-none bg-transparent group-hover:bg-transparent"
              : "h-11 w-11 rounded-2xl bg-rose-50 transition-colors group-hover:bg-rose-100"
          }`}
        >
          <Bell className="h-5 w-5 transition-transform duration-300 group-hover:scale-105" />
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

      {panelVisible ? (
        <div
          role="dialog"
          aria-label="Your notifications"
          aria-hidden={!open}
          className={`absolute right-0 top-[calc(100%+12px)] z-30 w-[min(92vw,400px)] origin-top-right overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-2xl shadow-rose-100/60 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            open
              ? "translate-y-0 scale-100 opacity-100"
              : "pointer-events-none -translate-y-2 scale-95 opacity-0"
          }`}
        >
          <div
            className={`border-b border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 px-5 py-4 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              open ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
            }`}
            style={{ transitionDelay: open ? "60ms" : "0ms" }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm ui-icon-lift">
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

          {visibleNotificationsWithLabels.length === 0 ? (
            <div
              className={`px-6 py-10 text-center transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: open ? "90ms" : "0ms" }}
            >
              <div className="ui-soft-float mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-300">
                <Bell className="h-7 w-7" />
              </div>
              <p className="font-semibold text-gray-900">No new notifications</p>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                When someone likes your profile or sends you a message, it will show here.
              </p>
            </div>
          ) : (
            <div
              className={`max-h-[28rem] overflow-y-auto p-2 custom-scrollbar transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
              style={{ transitionDelay: open ? "80ms" : "0ms" }}
            >
              {visibleNotificationsWithLabels.map((item, index) => {
                const accent = getNotificationAccent(item.kind);
                const AccentIcon = accent.icon;
                const isMessageNotification = item.kind === "message";
                const isShortlistedMessageNotification =
                  isMessageNotification &&
                  shortlistedProfileIdSet.has(item.actorProfileId);
                const isActionableMessageNotification =
                  isMessageNotification && !isShortlistedMessageNotification;
                const isPending = pendingActorProfileIds.includes(item.actorProfileId);

                const actorAvatar = item.actorImageUrl ? (
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-rose-100 ui-icon-lift">
                    <Image
                      src={item.actorImageUrl}
                      alt={item.actorName}
                      fill
                      className="object-cover ui-media-zoom"
                      sizes="48px"
                      unoptimized
                      draggable={false}
                      onContextMenu={(event) => event.preventDefault()}
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white ui-icon-lift">
                    {getInitials(item.actorName)}
                  </div>
                );

                const contentBlock = (
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
                );

                const transitionClassName = `transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  open ? "translate-x-0 opacity-100" : "translate-x-3 opacity-0"
                }`;
                const transitionStyle = {
                  transitionDelay: open ? `${110 + index * 35}ms` : "0ms",
                };

                if (!isActionableMessageNotification) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      tabIndex={open ? 0 : -1}
                      className={`group ui-card-lift-soft flex items-start gap-3 rounded-2xl px-3 py-3 hover:bg-rose-50/70 ${transitionClassName}`}
                      style={transitionStyle}
                    >
                      {actorAvatar}
                      {contentBlock}
                    </Link>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`ui-card-lift-soft rounded-2xl px-3 py-3 ${transitionClassName}`}
                    style={transitionStyle}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      tabIndex={open ? 0 : -1}
                      className="group flex items-start gap-3 rounded-2xl transition-colors hover:bg-rose-50/70"
                    >
                      {actorAvatar}
                      {contentBlock}
                    </Link>

                    <div className="mt-3 flex flex-wrap gap-2 pl-[3.75rem]">
                      <button
                        type="button"
                        onClick={() => void handleAccept(item)}
                        disabled={isPending}
                        className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-300"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleReject(item)}
                        disabled={isPending}
                        className="inline-flex min-w-[112px] items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-rose-100 disabled:text-rose-300"
                      >
                        {isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        Reject
                      </button>
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
