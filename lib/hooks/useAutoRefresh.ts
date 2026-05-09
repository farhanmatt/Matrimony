"use client";

import { useEffect, useEffectEvent } from "react";

type UseAutoRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number;
  refreshOnFocus?: boolean;
  refreshOnReconnect?: boolean;
};

const DEFAULT_REFRESH_INTERVAL_MS = 15000;

export function useAutoRefresh(
  onRefresh: () => void | Promise<void>,
  {
    enabled = true,
    intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
    refreshOnFocus = true,
    refreshOnReconnect = true,
  }: UseAutoRefreshOptions = {}
) {
  const runRefresh = useEffectEvent(async () => {
    await onRefresh();
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let refreshInFlight = false;

    const refreshIfVisible = () => {
      if (
        refreshInFlight ||
        document.visibilityState !== "visible" ||
        !window.navigator.onLine
      ) {
        return;
      }

      refreshInFlight = true;
      void runRefresh()
        .catch((error) => {
          console.error("Auto refresh failed:", error);
        })
        .finally(() => {
          refreshInFlight = false;
        });
    };

    const intervalId = window.setInterval(refreshIfVisible, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refreshIfVisible();
      }
    };

    const handleFocus = () => {
      refreshIfVisible();
    };

    const handleOnline = () => {
      refreshIfVisible();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    if (refreshOnFocus) {
      window.addEventListener("focus", handleFocus);
    }

    if (refreshOnReconnect) {
      window.addEventListener("online", handleOnline);
    }

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (refreshOnFocus) {
        window.removeEventListener("focus", handleFocus);
      }

      if (refreshOnReconnect) {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [enabled, intervalMs, refreshOnFocus, refreshOnReconnect]);
}
