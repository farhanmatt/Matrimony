"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Ban, Settings, Trash2 } from "lucide-react";

interface AdminProfileStatusQuickLinksProps {
  items: Array<{
    label: string;
    href: string;
    active: boolean;
    icon?: "blocked" | "deleted";
  }>;
}

export default function AdminProfileStatusQuickLinks({
  items,
}: AdminProfileStatusQuickLinksProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

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
    <div ref={menuRef} className="relative shrink-0 whitespace-nowrap">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Profile status shortcuts"
      >
        <Settings className="h-4 w-4 shrink-0" />
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {items.map((option) => {
            const Icon: ReactNode =
              option.icon === "blocked" ? (
                <Ban className="h-4 w-4 text-amber-500" />
              ) : option.icon === "deleted" ? (
                <Trash2 className="h-4 w-4 text-rose-500" />
              ) : null;

            return (
              <Link
                key={option.href}
                href={option.href}
                onClick={() => setOpen(false)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                  option.active ? "bg-rose-50/70 text-gray-900" : "text-gray-700"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  {Icon ? <span className="shrink-0">{Icon}</span> : null}
                  <span className="truncate">{option.label}</span>
                </span>
                {option.active ? <span className="text-xs font-semibold text-rose-600">Active</span> : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
