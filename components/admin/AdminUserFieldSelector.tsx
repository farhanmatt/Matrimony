"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, ChevronDown, SlidersHorizontal, Square } from "lucide-react";

const columnOptions = [
  { key: "user", label: "User" },
  { key: "details", label: "Details" },
  { key: "profile", label: "Profile" },
  { key: "status", label: "Status" },
  { key: "joined", label: "Joined" },
] as const;

export type AdminUserColumnKey = (typeof columnOptions)[number]["key"];

interface AdminUserFieldSelectorProps {
  selectedColumns: AdminUserColumnKey[];
}

const STORAGE_KEY = "admin_users_columns";

function writeSelection(selected: AdminUserColumnKey[]) {
  const value = selected.join(",");
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(STORAGE_KEY, value);
}

export default function AdminUserFieldSelector({
  selectedColumns,
}: AdminUserFieldSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeColumns, setActiveColumns] = useState(selectedColumns);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedSet = new Set(activeColumns);

  const toggleColumn = (column: AdminUserColumnKey) => {
    const params = new URLSearchParams(searchParams.toString());

    const nextColumns = activeColumns.includes(column)
      ? activeColumns.filter((value) => value !== column)
      : [...activeColumns, column];

    setActiveColumns(nextColumns);
    writeSelection(nextColumns);
    params.delete("page");
    params.set("columns", nextColumns.length === 0 ? columnOptions.map((option) => option.key).join(",") : nextColumns.join(","));
    params.delete("column");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  useEffect(() => {
    setActiveColumns(selectedColumns);
  }, [selectedColumns]);

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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="ui-link-shift inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-all duration-300 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md active:scale-[0.985]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Columns
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="ui-modal-pop absolute right-0 top-14 z-20 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {columnOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleColumn(option.key)}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                selectedSet.has(option.key)
                  ? "bg-rose-50/70 text-gray-900"
                  : "text-gray-700"
              }`}
              aria-pressed={selectedSet.has(option.key)}
            >
              {selectedSet.has(option.key) ? (
                <CheckSquare className="h-4 w-4 shrink-0 text-rose-500" />
              ) : (
                <Square className="h-4 w-4 shrink-0 text-gray-300" />
              )}
              <span className="flex-1">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
