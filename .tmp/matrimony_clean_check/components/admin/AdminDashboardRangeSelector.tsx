"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";
import {
  DASHBOARD_RANGE_OPTIONS,
  type DashboardRangeKey,
} from "@/lib/constants/admin-dashboard";

interface AdminDashboardRangeSelectorProps {
  currentRange: DashboardRangeKey;
  className?: string;
}

export default function AdminDashboardRangeSelector({
  currentRange,
  className,
}: AdminDashboardRangeSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedOption =
    DASHBOARD_RANGE_OPTIONS.find((option) => option.key === currentRange) ?? DASHBOARD_RANGE_OPTIONS[0];

  const updateRange = (range: DashboardRangeKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className={`relative ${className ?? ""}`.trim()}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {selectedOption.label}
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-20 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {DASHBOARD_RANGE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateRange(option.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <span className="flex-1">{option.label}</span>
              {selectedOption.key === option.key ? (
                <Check className="h-4 w-4 text-rose-500" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
