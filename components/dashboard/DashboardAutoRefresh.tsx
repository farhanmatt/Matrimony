"use client";

import { useRouter, usePathname } from "next/navigation";
import { startTransition } from "react";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

const LIVE_REFRESH_PATHS = [
  "/dashboard",
  "/dashboard/browse",
  "/dashboard/liked",
  "/dashboard/received-likes",
  "/dashboard/matches",
  "/dashboard/unlocked",
] as const;

function shouldAutoRefresh(pathname: string) {
  return LIVE_REFRESH_PATHS.some((path) => pathname === path);
}

export default function DashboardAutoRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const enabled = shouldAutoRefresh(pathname);

  useAutoRefresh(
    () => {
      startTransition(() => {
        router.refresh();
      });
    },
    { enabled }
  );

  return null;
}
