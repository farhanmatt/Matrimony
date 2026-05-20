"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, ChevronDown, Columns3, Square } from "lucide-react";

const columnOptions = [
  { key: "match", label: "User A" },
  { key: "details", label: "User B" },
  { key: "status", label: "Status" },
  { key: "date", label: "Match Date" },
  { key: "action", label: "Action" },
] as const;

export type AdminMatchColumnKey = (typeof columnOptions)[number]["key"];

interface AdminMatchColumnSelectorProps {
  selectedColumns: AdminMatchColumnKey[];
}

export default function AdminMatchColumnSelector({
  selectedColumns,
}: AdminMatchColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateColumns = (nextColumns: AdminMatchColumnKey[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("columns", nextColumns.length === 0 ? columnOptions.map((column) => column.key).join(",") : nextColumns.join(","));
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  const toggleColumn = (column: AdminMatchColumnKey) => {
    const nextColumns = selectedColumns.includes(column)
      ? selectedColumns.filter((value) => value !== column)
      : [...selectedColumns, column];

    updateColumns(nextColumns.length === 0 ? columnOptions.map((option) => option.key) : nextColumns);
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
        <div className="absolute right-0 top-14 z-20 w-56 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
          {columnOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleColumn(option.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-rose-500">
                {selectedColumns.includes(option.key) ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </span>
              <span className="flex-1">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
