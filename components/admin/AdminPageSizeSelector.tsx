"use client";

import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];

interface AdminPageSizeSelectorProps {
  value: number;
}

export default function AdminPageSizeSelector({
  value,
}: AdminPageSizeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const storageKey = `admin-page-size:${pathname}`;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<PageSizeOption>(value as PageSizeOption);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    setCurrentValue(value as PageSizeOption);
  }, [value]);

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
      const menuHeight = 132;
      const menuWidth = Math.max(rect.width, 176);
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + 16 && spaceAbove > menuHeight;
      const top = openUpward ? rect.top - menuHeight - 8 : rect.bottom + 8;
      const left = Math.min(
        Math.max(12, rect.left),
        window.innerWidth - menuWidth - 12
      );

      setMenuPosition({
        top: Math.max(12, top),
        left,
        width: menuWidth,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const limitParam = searchParams.get("limit");
    const storedValue = window.localStorage.getItem(storageKey);

    if (limitParam) {
      window.localStorage.setItem(storageKey, limitParam);
      return;
    }

    if (storedValue) {
      const parsedStored = Number(storedValue);
      if (PAGE_SIZE_OPTIONS.includes(parsedStored as PageSizeOption) && parsedStored !== value) {
        const nextValue = parsedStored as PageSizeOption;
        setCurrentValue(nextValue);

        const params = new URLSearchParams(searchParams.toString());
        params.set("limit", String(nextValue));
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        return;
      }
    }

    window.localStorage.setItem(storageKey, String(value));
  }, [pathname, router, searchParams, storageKey, value]);

  const updatePageSize = (pageSize: PageSizeOption) => {
    setCurrentValue(pageSize);
    window.localStorage.setItem(storageKey, String(pageSize));

    const params = new URLSearchParams(searchParams.toString());
    params.set("limit", String(pageSize));
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative flex items-center text-slate-600">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((next) => !next)}
        aria-label="Rows per page"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 overflow-hidden rounded-xl border border-rose-100 bg-white px-4 text-sm text-slate-700 shadow-[0_10px_24px_rgba(244,63,94,0.06)] transition-colors hover:border-rose-200 hover:bg-rose-50"
      >
        <span className="min-w-6 text-left font-medium">{currentValue}</span>
        <span className="select-none text-slate-600">per page</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open && menuPosition && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[9999] overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl"
              style={{
                top: `${menuPosition.top}px`,
                left: `${menuPosition.left}px`,
                width: `${menuPosition.width}px`,
              }}
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => updatePageSize(option)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-rose-50"
                >
                  <span>{option} per page</span>
                  {currentValue === option ? (
                    <Check className="h-4 w-4 text-rose-500" />
                  ) : null}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
