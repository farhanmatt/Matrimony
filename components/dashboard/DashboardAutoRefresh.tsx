"use client";

import { useEffect } from "react";

const PRESENCE_HEARTBEAT_INTERVAL_MS = 10_000;

export default function DashboardAutoRefresh() {
  useEffect(() => {
    let intervalId: number | null = null;

    const sendHeartbeat = async () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      try {
        await fetch("/api/presence", {
          method: "POST",
          cache: "no-store",
          headers: {
            "x-skip-loading": "1",
          },
        });
      } catch {
        // Presence should fail quietly and recover on the next heartbeat.
      }
    };

    const clearHeartbeatInterval = () => {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const ensureHeartbeatInterval = () => {
      clearHeartbeatInterval();
      intervalId = window.setInterval(() => {
        void sendHeartbeat();
      }, PRESENCE_HEARTBEAT_INTERVAL_MS);
    };

    const handleVisibleState = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
        ensureHeartbeatInterval();
        return;
      }

      clearHeartbeatInterval();
    };

    const handleFocus = () => {
      void sendHeartbeat();
    };

    handleVisibleState();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleFocus);
    document.addEventListener("visibilitychange", handleVisibleState);

    return () => {
      clearHeartbeatInterval();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibleState);
    };
  }, []);

  return null;
}
