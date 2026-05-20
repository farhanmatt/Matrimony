"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, ChevronDown, Square } from "lucide-react";

const columnOptions = [
  { key: "profile", label: "Profile" },
  { key: "basicInfo", label: "Basic Info" },
  { key: "community", label: "Community" },
  { key: "location", label: "Location" },
  { key: "career", label: "Career" },
  { key: "contact", label: "Contact" },
  { key: "plan", label: "Plan" },
  { key: "status", label: "Status" },
  { key: "joined", label: "Joined" },
  { key: "actions", label: "Actions" },
] as const;

export type AdminProfileColumnKey = (typeof columnOptions)[number]["key"];

interface AdminColumnSelectorProps {
  selectedColumns: AdminProfileColumnKey[];
}

const STORAGE_KEY = "admin_profiles_columns";
const DEFAULT_SELECTED_COLUMNS: AdminProfileColumnKey[] = [
  "profile",
  "basicInfo",
  "community",
  "location",
  "career",
  "contact",
  "status",
  "actions",
];

function writeSelection(selected: AdminProfileColumnKey[]) {
  const value = selected.join(",");
  document.cookie = `${STORAGE_KEY}=${encodeURIComponent(value)}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(STORAGE_KEY, value);
}

export default function AdminColumnSelector({
  selectedColumns,
}: AdminColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeColumns, setActiveColumns] = useState(selectedColumns);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateColumns = (columns: AdminProfileColumnKey[]) => {
    setActiveColumns(columns);
    writeSelection(columns);

    const params = new URLSearchParams(searchParams.toString());
    params.set("columns", columns.join(","));
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-medium text-gray-700 shadow-[0_10px_24px_rgba(244,63,94,0.06)] transition-colors hover:border-rose-200 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Columns
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-20 w-72 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
          {columnOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                const nextSelected = activeColumns.includes(option.key)
                  ? activeColumns.filter((item) => item !== option.key)
                  : [...activeColumns, option.key];

                const safeSelected = nextSelected.length > 0 ? nextSelected : DEFAULT_SELECTED_COLUMNS;
                updateColumns(safeSelected);
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-gray-50 ${
                activeColumns.includes(option.key)
                  ? "bg-gray-50 text-gray-900"
                  : "text-gray-700"
              }`}
            >
              {activeColumns.includes(option.key) ? (
                <CheckSquare className="h-4 w-4 shrink-0 text-gray-500" />
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
