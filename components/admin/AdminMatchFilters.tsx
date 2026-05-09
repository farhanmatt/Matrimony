"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, SlidersHorizontal, X } from "lucide-react";

const unlockStatusOptions = [
  { value: "", label: "All Matches" },
  { value: "unlocked", label: "Unlocked" },
  { value: "locked", label: "No Unlocks" },
] as const;

type DraftFilters = {
  unlockStatus: string;
  dateFrom: string;
  dateTo: string;
};

const emptyDrafts: DraftFilters = {
  unlockStatus: "",
  dateFrom: "",
  dateTo: "",
};

function readDrafts(searchParams: ReturnType<typeof useSearchParams>): DraftFilters {
  return {
    unlockStatus: searchParams.get("unlockStatus") ?? "",
    dateFrom: searchParams.get("dateFrom") ?? "",
    dateTo: searchParams.get("dateTo") ?? "",
  };
}

function updateParams(
  pathname: string,
  searchParams: ReturnType<typeof useSearchParams>,
  router: ReturnType<typeof useRouter>,
  drafts: DraftFilters,
) {
  const params = new URLSearchParams(searchParams.toString());

  (Object.entries(drafts) as Array<[keyof DraftFilters, string]>).forEach(([key, value]) => {
    const trimmed = value.trim();
    if (trimmed) {
      params.set(key, trimmed);
    } else {
      params.delete(key);
    }
  });

  params.delete("page");
  router.replace(`${pathname}?${params.toString()}`, { scroll: false });
}

interface AdminMatchFiltersProps {
  activeCount?: number;
}

export default function AdminMatchFilters({ activeCount = 0 }: AdminMatchFiltersProps) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftFilters>(emptyDrafts);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentActiveCount = useMemo(() => {
    const keys: (keyof DraftFilters)[] = ["unlockStatus", "dateFrom", "dateTo"];
    return keys.filter((key) => (searchParams.get(key) ?? "").trim().length > 0).length;
  }, [searchParams]);

  const openFilters = () => {
    setDrafts(readDrafts(searchParams));
    setOpen(true);
  };

  const closeFilters = () => setOpen(false);

  const applyFilters = () => {
    updateParams(pathname, searchParams, router, drafts);
    setOpen(false);
  };

  const clearFilters = () => {
    updateParams(pathname, searchParams, router, emptyDrafts);
    setDrafts(emptyDrafts);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeFilters();
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const totalActive = currentActiveCount || activeCount;

  return (
    <>
      <button
        type="button"
        onClick={openFilters}
        className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {totalActive > 0 ? (
          <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-100 px-1 text-[11px] font-semibold text-rose-600">
            {totalActive}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" onClick={closeFilters} />

          <div className="relative z-10 w-full max-w-3xl rounded-3xl border border-gray-100 bg-white p-6 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-rose-500">
                  Filter Matches
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-gray-900">
                  Narrow your match list
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Use match filters to focus on unlocked or recent matches.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFilters}
                className="rounded-full border border-gray-200 p-2 text-gray-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500"
                aria-label="Close filters"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Unlock Status
                </label>
                <select
                  value={drafts.unlockStatus}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, unlockStatus: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  {unlockStatusOptions.map((option) => (
                    <option key={option.value || option.label} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Date From
                </label>
                <input
                  type="date"
                  value={drafts.dateFrom}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, dateFrom: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Date To
                </label>
                <input
                  type="date"
                  value={drafts.dateTo}
                  onChange={(event) =>
                    setDrafts((current) => ({ ...current, dateTo: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
              >
                <RotateCcw className="h-4 w-4" />
                Clear Filters
              </button>

              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
