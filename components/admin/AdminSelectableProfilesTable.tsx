"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/helpers";

type TableColumn = {
  key: string;
  label: string;
  width: string;
};

type TableRow = {
  id: string;
  href: string;
  cells: ReactNode[];
};

interface AdminSelectableProfilesTableProps {
  columns: TableColumn[];
  rows: TableRow[];
}

export default function AdminSelectableProfilesTable({
  columns,
  rows,
}: AdminSelectableProfilesTableProps) {
  const router = useRouter();
  const [viewportWidth, setViewportWidth] = useState(0);
  const [visibleRows, setVisibleRows] = useState(rows);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleRows(rows);
  }, [rows]);

  useEffect(() => {
    const updateViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const scrollThreshold =
    viewportWidth >= 1280 ? 7 : viewportWidth >= 1024 ? 6 : viewportWidth >= 768 ? 4 : 3;
  const shouldScroll = columns.length > scrollThreshold;
  const tableMinWidth = shouldScroll
    ? Math.max(
        viewportWidth >= 1280 ? 1400 : viewportWidth >= 1024 ? 1280 : viewportWidth >= 768 ? 1120 : 960,
        160 + columns.length * (viewportWidth >= 1280 ? 160 : viewportWidth >= 1024 ? 150 : 140)
      )
    : undefined;

  const handleRowClick = (event: MouseEvent<HTMLTableRowElement>, href: string) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select, [role='button']")) {
      return;
    }

    router.push(href);
  };

  return (
    <div className="space-y-4">
      <div className="relative px-4 pt-4 sm:px-4">
        <div
          ref={scrollRef}
          className={
            shouldScroll
              ? "overflow-x-auto scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              : "overflow-x-hidden"
          }
        >
          <div style={tableMinWidth ? { minWidth: `${tableMinWidth}px` } : undefined}>
            <table className="w-full table-fixed text-sm">
              <colgroup>
                {columns.map((column) => (
                  <col key={column.key} style={{ width: column.width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-4 py-4 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleRows.map((row) => {
                  return (
                    <tr
                      key={row.id}
                      className={cn("cursor-pointer transition-colors hover:bg-slate-50/80")}
                      onClick={(event) => handleRowClick(event, row.href)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          router.push(row.href);
                        }
                      }}
                    >
                      {row.cells.map((cell, index) => (
                        <td
                          key={`${row.id}-${columns[index]?.key ?? index}`}
                          className="px-4 py-4 align-middle"
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
