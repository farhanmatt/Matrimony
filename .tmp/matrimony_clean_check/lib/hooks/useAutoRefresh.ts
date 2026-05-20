"use client";

import { useEffect, useEffectEvent } from "react";

type UseAutoRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number | null;
  refreshOnFocus?: boolean;
  refreshOnReconnect?: boolean;
};

const DEFAULT_REFRESH_INTERVAL_MS = 15000;

function getAutoRefreshState() {
  return window as typeof window & {
    __dashboardAutoRefreshCount?: number;
  };
}

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
    const autoRefreshState = getAutoRefreshState();
    autoRefreshState.__dashboardAutoRefreshCount =
      (autoRefreshState.__dashboardAutoRefreshCount ?? 0) + 1;

    try {
      await onRefresh();
    } finally {
      autoRefreshState.__dashboardAutoRefreshCount = Math.max(
        0,
        (autoRefreshState.__dashboardAutoRefreshCount ?? 1) - 1
      );
    }
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

    const intervalId =
      typeof intervalMs === "number" && intervalMs > 0
        ? window.setInterval(refreshIfVisible, intervalMs)
        : null;

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
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (refreshOnFocus) {
        window.removeEventListener("focus", handleFocus);
      }

      if (refreshOnReconnect) {
        window.removeEventListener("online", handleOnline);
      }
    };
  }, [enabled, intervalMs, refreshOnFocus, refreshOnReconnect, runRefresh]);
}
