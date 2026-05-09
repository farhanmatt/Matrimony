"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Columns3 } from "lucide-react";

const columnOptions = [
  { key: "all", label: "All Columns" },
  { key: "user", label: "User" },
  { key: "profile", label: "Profile" },
  { key: "status", label: "Status" },
  { key: "joined", label: "Joined" },
] as const;

export type AdminUserColumnKey = (typeof columnOptions)[number]["key"];

interface AdminUserColumnSelectorProps {
  selectedColumn: AdminUserColumnKey;
}

export default function AdminUserColumnSelector({
  selectedColumn,
}: AdminUserColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateColumn = (column: AdminUserColumnKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("column", column);
    params.delete("page");
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
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-20 w-48 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {columnOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => updateColumn(option.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <span className="flex-1">{option.label}</span>
              {selectedColumn === option.key ? (
                <Check className="h-4 w-4 text-rose-500" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
