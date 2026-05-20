"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

interface AdminSearchInputProps {
  placeholder: string;
  queryKey?: string;
  className?: string;
  debounceMs?: number;
}

export default function AdminSearchInput({
  placeholder,
  queryKey = "search",
  className,
  debounceMs = 150,
}: AdminSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentValue = searchParams.get(queryKey) ?? "";
  const [value, setValue] = useState(currentValue);

  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  const commitSearch = useCallback(
    (nextValue: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = nextValue.trim();

      if (trimmed) {
        params.set(queryKey, trimmed);
      } else {
        params.delete(queryKey);
      }

      params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, queryKey, router, searchParams],
  );

  useEffect(() => {
    if (value === currentValue) return;

    const timeout = window.setTimeout(() => {
      commitSearch(value);
    }, debounceMs);

    return () => window.clearTimeout(timeout);
  }, [commitSearch, currentValue, debounceMs, value]);

  return (
    <div
      className={
        className ??
        "flex w-full max-w-[760px] overflow-hidden rounded-xl border border-rose-100 bg-white shadow-[0_10px_24px_rgba(244,63,94,0.06)]"
      }
    >
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commitSearch(value);
          }
        }}
        placeholder={placeholder}
        className="min-w-0 flex-1 border-0 px-4 py-3 text-sm focus:outline-none focus:ring-0"
      />
      <button
        type="button"
        onClick={() => commitSearch(value)}
        className="border-l border-rose-100 px-4 text-gray-500 transition-colors hover:bg-rose-50 hover:text-rose-600"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}
