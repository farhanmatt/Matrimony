"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckSquare, ChevronDown, Columns3, Square } from "lucide-react";

const columnOptions = [
  { key: "user", label: "User" },
  { key: "amount", label: "Amount" },
  { key: "breakdown", label: "Breakdown" },
  { key: "status", label: "Status" },
  { key: "orderId", label: "Order ID" },
  { key: "date", label: "Date" },
] as const;

export type AdminPaymentColumnKey = (typeof columnOptions)[number]["key"];

interface AdminPaymentColumnSelectorProps {
  selectedColumns: AdminPaymentColumnKey[];
}

export default function AdminPaymentColumnSelector({
  selectedColumns,
}: AdminPaymentColumnSelectorProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateColumns = (nextColumns: AdminPaymentColumnKey[]) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("columns", nextColumns.length === 0 ? columnOptions.map((column) => column.key).join(",") : nextColumns.join(","));
    params.delete("column");
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  };

  const toggleColumn = (column: AdminPaymentColumnKey) => {
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
        className="inline-flex h-12 items-center gap-2 rounded-xl border border-rose-100 bg-white px-4 text-sm font-medium text-gray-700 shadow-[0_10px_24px_rgba(244,63,94,0.06)] transition-colors hover:border-rose-200 hover:bg-rose-50"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 top-14 z-20 w-56 overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-xl">
          {columnOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => toggleColumn(option.key)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-gray-700 transition-colors hover:bg-rose-50"
            >
              <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center text-rose-500">
                {selectedColumns.includes(option.key)
                  ? <CheckSquare className="h-4 w-4" />
                  : <Square className="h-4 w-4" />
                }
              </span>
              <span className="flex-1">{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
