"use client";

import { useEffect, useState } from "react";
import AdminNotificationBell, { type AdminNotificationItem } from "@/components/admin/AdminNotificationBell";

export default function AdminTopNotifications() {
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);

  useEffect(() => {
    let alive = true;

    const loadNotifications = async () => {
      try {
        const res = await fetch("/api/admin/notifications", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setNotifications(Array.isArray(data.notifications) ? data.notifications : []);
      } catch {
        if (alive) setNotifications([]);
      }
    };

    loadNotifications();
    const interval = window.setInterval(loadNotifications, 30000);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return <AdminNotificationBell notifications={notifications} />;
}
