"use client";

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [currentValue, setCurrentValue] = useState<PageSizeOption>(value as PageSizeOption);

  useEffect(() => {
    setCurrentValue(value as PageSizeOption);
  }, [value]);

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
    <div ref={menuRef} className="relative flex items-center text-slate-600">
      <button
        type="button"
        onClick={() => setOpen((next) => !next)}
        aria-label="Rows per page"
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 overflow-hidden rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50"
      >
        <span className="min-w-6 text-left font-medium">{currentValue}</span>
        <span className="select-none text-slate-600">per page</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </button>

      {open ? (
        <div className="absolute left-0 top-12 z-30 w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl">
          {PAGE_SIZE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => updatePageSize(option)}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
            >
              <span>{option} per page</span>
              {currentValue === option ? <Check className="h-4 w-4 text-rose-500" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
