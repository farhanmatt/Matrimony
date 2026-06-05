"use client";

import { useEffect } from "react";
import type { DashboardRealtimeEvent } from "@/lib/types/dashboard-realtime";
import { DASHBOARD_REALTIME_EVENT_NAME } from "@/lib/types/dashboard-realtime";

export default function DashboardRealtimeEvents() {
  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream");

    const handleNotification = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as DashboardRealtimeEvent;

        window.dispatchEvent(
          new CustomEvent(DASHBOARD_REALTIME_EVENT_NAME, {
            detail: payload,
          })
        );
      } catch {
        // Ignore malformed realtime events and keep the stream alive.
      }
    };

    eventSource.addEventListener(
      "notification",
      handleNotification as EventListener
    );

    return () => {
      eventSource.removeEventListener(
        "notification",
        handleNotification as EventListener
      );
      eventSource.close();
    };
  }, []);

  return null;
}
