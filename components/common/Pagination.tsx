import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function getPaginationItems(currentPage: number, pageCount: number) {
  if (pageCount <= 1) return [];

  if (pageCount <= 6) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, "end-ellipsis", pageCount];
  }

  if (currentPage >= pageCount - 2) {
    return [1, "start-ellipsis", pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "end-ellipsis",
    pageCount,
  ];
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  useEffect(() => {
    const maxPage = Math.max(1, totalPages);
    if (currentPage > maxPage) {
      onPageChange(maxPage);
    }
  }, [currentPage, totalPages, onPageChange]);
  if (totalPages <= 1) return null;

  const hasPreviousPage = currentPage > 1;
  const hasNextPage = currentPage < totalPages;
  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <div
      className="ui-enter-up flex flex-wrap items-center justify-center gap-3 py-2"
      style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={!hasPreviousPage}
        className="ui-link-shift inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all hover:border-rose-300 dark:hover:border-slate-600 hover:text-rose-600 dark:hover:text-rose-400 disabled:cursor-not-allowed disabled:border-slate-100 disabled:dark:border-slate-800 disabled:text-slate-300 disabled:dark:text-slate-600"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {paginationItems.map((item, index) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={`ui-link-shift inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-[14px] border px-3 text-sm font-semibold transition-all ${
              item === currentPage
                ? "border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 shadow-[0_12px_24px_rgba(244,63,94,0.12)]"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-rose-300 dark:hover:border-slate-600 hover:text-rose-600 dark:hover:text-rose-400"
            }`}
          >
            {item}
          </button>
        ) : (
          <span
            key={`${item}-${index}`}
            className="inline-flex h-11 min-w-[2.25rem] items-center justify-center text-sm font-semibold text-slate-400 dark:text-slate-500"
          >
            ...
          </span>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={!hasNextPage}
        className="ui-link-shift inline-flex h-11 w-11 items-center justify-center rounded-[14px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 transition-all hover:border-rose-300 dark:hover:border-slate-600 hover:text-rose-600 dark:hover:text-rose-400 disabled:cursor-not-allowed disabled:border-slate-100 disabled:dark:border-slate-800 disabled:text-slate-300 disabled:dark:text-slate-600"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
