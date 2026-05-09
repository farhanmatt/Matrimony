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
        "flex w-full max-w-[760px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
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
        className="border-l border-gray-200 px-4 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
        aria-label="Search"
      >
        <Search className="h-5 w-5" />
      </button>
    </div>
  );
}
