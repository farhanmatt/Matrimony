"use client";

import { useEffect, useRef } from "react";

type UseAutoRefreshOptions = {
  enabled?: boolean;
  intervalMs?: number | null;
  refreshOnFocus?: boolean;
  refreshOnReconnect?: boolean;
};

const DEFAULT_REFRESH_INTERVAL_MS = 15000;
const BURST_REFRESH_GUARD_MS = 1000;

export function useAutoRefresh(
  onRefresh: () => void | Promise<void>,
  {
    enabled = true,
    intervalMs = DEFAULT_REFRESH_INTERVAL_MS,
    refreshOnFocus = true,
    refreshOnReconnect = true,
  }: UseAutoRefreshOptions = {}
) {
  const onRefreshRef = useRef(onRefresh);
  const lastRefreshAtRef = useRef(0);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let refreshInFlight = false;

    const refreshIfVisible = () => {
      const now = Date.now();

      if (
        refreshInFlight ||
        now - lastRefreshAtRef.current < BURST_REFRESH_GUARD_MS ||
        document.visibilityState !== "visible" ||
        !window.navigator.onLine
      ) {
        return;
      }

      refreshInFlight = true;
      lastRefreshAtRef.current = now;

      void Promise.resolve(onRefreshRef.current())
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
  }, [enabled, intervalMs, refreshOnFocus, refreshOnReconnect]);
}
