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
  listFooter?: ReactNode;
}

export default function AdminSelectableProfilesTable({
  columns,
  rows,
  listFooter,
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto px-4 pt-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
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
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-rose-100 bg-rose-50/95 backdrop-blur">
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="bg-rose-50/95 px-4 py-4 text-left text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-100 bg-white">
                {visibleRows.map((row, index) => {
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "group/row ui-enter-up cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-rose-50/80"
                      )}
                      style={{ animationDelay: `${180 + Math.min(index, 8) * 38}ms` }}
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
                          className="px-4 py-4 align-middle transition-colors duration-300"
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

        {listFooter ? (
          <div className="mt-4 border-t border-rose-100 bg-rose-50/30 px-4 py-3">
            {listFooter}
          </div>
        ) : null}
      </div>
    </div>
  );
}
