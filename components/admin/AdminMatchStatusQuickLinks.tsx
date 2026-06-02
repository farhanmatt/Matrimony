"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Lock, Settings, Unlock } from "lucide-react";
import { Trash2 } from "lucide-react";

interface AdminMatchStatusQuickLinksProps {
  items: Array<{
    label: string;
    href: string;
    active: boolean;
    icon: "locked" | "unlocked";
  }>;
  deletedMatchesHref?: string;
}

export default function AdminMatchStatusQuickLinks({
  items,
  deletedMatchesHref,
}: AdminMatchStatusQuickLinksProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const menuItems = items.length + (deletedMatchesHref ? 1 : 0);
      const menuHeight = Math.max(1, menuItems) * 52;
      const menuWidth = 224;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(Math.max(12, rect.right - menuWidth), window.innerWidth - menuWidth - 12);

      setMenuPosition({
        top: Math.max(12, top),
        left,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [deletedMatchesHref, items.length, open]);

  return (
    <div ref={containerRef} className="relative shrink-0 whitespace-nowrap">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ui-link-shift inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Match status shortcuts"
      >
        <Settings className="h-4 w-4 shrink-0" />
      </button>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
        <div
          ref={panelRef}
          className="ui-modal-pop fixed z-[9999] w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
          style={{
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
        >
          {items.map((option) => {
            const icon =
              option.icon === "locked" ? (
                <Lock className="h-4 w-4 text-amber-500" />
              ) : (
                <Unlock className="h-4 w-4 text-emerald-500" />
              );

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
                  <span className="shrink-0">{icon}</span>
                  <span className="truncate">{option.label}</span>
                </span>
                {option.active ? <span className="text-xs font-semibold text-rose-600">Active</span> : null}
              </Link>
            );
          })}

          {deletedMatchesHref ? (
            <Link
              href={deletedMatchesHref}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 border-t border-gray-100 px-4 py-3 text-left text-sm text-rose-700 transition-colors hover:bg-rose-50"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
              Deleted matches
            </Link>
          ) : null}
        </div>,
        document.body,
      )
        : null}
    </div>
  );
}
