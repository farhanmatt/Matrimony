"use client";

import Link from "next/link";
import { isAfter, subDays } from "date-fns";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Unlock,
} from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/LoadingSpinner";
import UnlockedProfileCard, {
  type UnlockedProfileCardData,
} from "@/components/profile/UnlockedProfileCard";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";

interface UnlockItem {
  id: string;
  createdAt: string;
  payment: { amount: number; createdAt: string };
  match: {
    profileA: UnlockedProfileCardData;
    profileB: UnlockedProfileCardData;
  };
}

type FilterKey = "all" | "recent" | "contact";

const INITIAL_VISIBLE_COUNT = 8;
const LOAD_MORE_COUNT = 4;
const RECENT_UNLOCK_DAYS = 14;

export default function UnlockedPageClient({
  initialUnlocks,
  initialOwnProfileId,
}: {
  initialUnlocks: UnlockItem[];
  initialOwnProfileId: string | null;
}) {
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const [unlocks, setUnlocks] = useState<UnlockItem[]>(initialUnlocks);
  const [loading, setLoading] = useState(false);
  const [ownProfileId, setOwnProfileId] = useState<string | null>(initialOwnProfileId);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    setUnlocks(initialUnlocks);
    setOwnProfileId(initialOwnProfileId);
  }, [initialOwnProfileId, initialUnlocks]);

  const fetchData = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const unlockData = await fetch("/api/unlock", { cache: "no-store" }).then(
          (response) => response.json()
        );

        setUnlocks(unlockData.data ?? []);
      } catch (error) {
        console.error("Unlocked profiles refresh error:", error);
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  useAutoRefresh(() => fetchData({ showLoading: false }), {
    intervalMs: null,
  });

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [deferredSearchTerm, activeFilter]);

  useEffect(() => {
    if (!showFilterMenu) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!filterMenuRef.current?.contains(event.target as Node)) {
        setShowFilterMenu(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, [showFilterMenu]);

  if (loading) {
    return <PageLoader />;
  }

  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
  const recentCutoff = subDays(new Date(), RECENT_UNLOCK_DAYS);
  const unlockCards = unlocks
    .map((unlock) => {
      const profile =
        unlock.match.profileA.id === ownProfileId
          ? unlock.match.profileB
          : unlock.match.profileA;

      return {
        unlock,
        profile,
      };
    })
    .filter(({ unlock, profile }) => {
      if (activeFilter === "recent" && !isAfter(new Date(unlock.createdAt), recentCutoff)) {
        return false;
      }

      if (activeFilter === "contact" && !profile.phone) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        profile.fullName,
        profile.profession,
        profile.education,
        profile.course,
        profile.religion,
        profile.caste,
        profile.city,
        profile.state,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });

  const visibleCards = unlockCards.slice(0, visibleCount);
  const canLoadMore = visibleCount < unlockCards.length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,rgba(236,253,245,0.98)_0%,rgba(220,252,231,0.9)_100%)] text-emerald-600 shadow-sm">
              <Unlock className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-[1.8rem] font-bold tracking-tight text-slate-900">
                Unlocked Profiles
              </h1>
              <p className="mt-1 text-[15px] text-slate-600">
                These profiles are now unlocked. You can view full details and connect.
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:max-w-[470px]">
          <label className="relative block flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search unlocked profiles..."
              className="h-12 w-full rounded-[18px] border border-emerald-100 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none shadow-sm transition-colors placeholder:text-slate-400 focus:border-emerald-300"
            />
          </label>

          <div ref={filterMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowFilterMenu((current) => !current)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-[16px] border border-emerald-100 bg-white text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
              aria-label="Filter unlocked profiles"
              title="Filter unlocked profiles"
            >
              <SlidersHorizontal className="h-[18px] w-[18px]" />
            </button>

            {showFilterMenu ? (
              <div className="absolute right-0 top-14 z-20 min-w-[210px] overflow-hidden rounded-[20px] border border-emerald-100 bg-white py-2 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                {[
                  { key: "all", label: "All Profiles" },
                  { key: "recent", label: "Recently Unlocked" },
                  { key: "contact", label: "Contact Available" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setActiveFilter(option.key as FilterKey);
                      setShowFilterMenu(false);
                    }}
                    className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      activeFilter === option.key
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                    }`}
                  >
                    <span>{option.label}</span>
                    {activeFilter === option.key ? (
                      <span className="text-xs font-semibold">Active</span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {unlocks.length === 0 ? (
        <EmptyState
          icon="heart"
          title="No unlocked profiles yet"
          description="Unlock your mutual matches to see their full details and contact information."
          action={{ label: "View Matches", href: "/dashboard/matches" }}
        />
      ) : unlockCards.length === 0 ? (
        <section className="rounded-[30px] border border-emerald-100 bg-white px-6 py-12 text-center shadow-sm">
          <h2 className="font-display text-[1.6rem] font-bold text-slate-900">
            No unlocked profiles found
          </h2>
          <p className="mt-2 text-[15px] text-slate-500">
            Try a different search or filter to see more unlocked profiles.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {visibleCards.map(({ unlock, profile }) => (
              <UnlockedProfileCard
                key={unlock.id}
                profile={profile}
                unlockedAt={unlock.createdAt}
              />
            ))}
          </section>

          {canLoadMore ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + LOAD_MORE_COUNT)}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] border border-emerald-100 bg-white px-8 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-emerald-200 hover:text-emerald-700"
              >
                Load More
                <ChevronDown className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : null}
        </>
      )}

      <section className="flex flex-col gap-5 rounded-[30px] border border-rose-100/80 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-[1.4rem] font-bold text-slate-900">
              Safe & Secure
            </h2>
            <p className="mt-1 text-[15px] text-slate-500">
              Your privacy is our priority. Contact details are visible only after you
              choose to connect.
            </p>
          </div>
        </div>

        <Link
          href="/privacy"
          className="inline-flex items-center gap-2 text-sm font-semibold text-rose-500 transition-colors hover:text-rose-600"
        >
          Know more about safety
          <ChevronDown className="h-4 w-4 -rotate-90" />
        </Link>
      </section>
    </div>
  );
}
