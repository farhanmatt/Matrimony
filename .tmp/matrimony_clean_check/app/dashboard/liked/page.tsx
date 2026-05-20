"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { isAfter, subDays } from "date-fns";
import {
  ArrowUpRight,
  Bookmark,
  Clock3,
  Heart,
  MapPin,
  Sparkles,
  Users2,
} from "lucide-react";
import { toast } from "sonner";
import { PageLoader } from "@/components/common/LoadingSpinner";
import LikedProfilePreviewCard from "@/components/profile/LikedProfilePreviewCard";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import {
  readShortlistedProfileIds,
  SHORTLIST_UPDATED_EVENT,
} from "@/lib/utils/shortlist";

const sortOptions = [
  { value: "recent", label: "Recently Liked" },
  { value: "oldest", label: "Oldest First" },
  { value: "name", label: "Name A-Z" },
] as const;

type SortOption = (typeof sortOptions)[number]["value"];

interface LikedProfile {
  id: string;
  createdAt: string;
  toProfile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    height: number | null;
    maritalStatus: string;
    education: string | null;
    course?: string | null;
    profession: string | null;
    location: string | null;
    city: string | null;
    state: string | null;
    religion: string | null;
    profileImage?: string | null;
    photos: { url: string; isPrimary: boolean }[];
  };
}

interface MatchSummary {
  id: string;
  isUnlocked?: boolean;
  otherProfile: {
    id: string;
  };
}

export default function LikedPage() {
  const [likes, setLikes] = useState<LikedProfile[]>([]);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOption>("recent");
  const [showShortlistedOnly, setShowShortlistedOnly] = useState(false);
  const [hasManualShortlistPreference, setHasManualShortlistPreference] =
    useState(false);
  const [shortlistedProfileIds, setShortlistedProfileIds] = useState<string[]>([]);
  const hasAutoOpenedShortlistRef = useRef(false);

  const fetchData = useCallback(
    async ({
      showError = true,
      showLoading = true,
    }: {
      showError?: boolean;
      showLoading?: boolean;
    } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const [likesRes, matchesRes] = await Promise.all([
          fetch("/api/likes", { cache: "no-store" }),
          fetch("/api/matches", { cache: "no-store" }),
        ]);

        const [likesData, matchesData] = await Promise.all([
          likesRes.json(),
          matchesRes.json(),
        ]);

        if (!likesRes.ok) {
          throw new Error(likesData.error ?? "Failed to load interests");
        }

        if (!matchesRes.ok) {
          throw new Error(matchesData.error ?? "Failed to load matches");
        }

        const nextMatches = matchesData.data ?? [];

        setLikes(likesData.data ?? []);
        setMatches(nextMatches);
      } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load interests"
          );
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    },
    []
  );

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useAutoRefresh(() => fetchData({ showError: false, showLoading: false }));

  useEffect(() => {
    setShortlistedProfileIds(readShortlistedProfileIds());

    const handleShortlistUpdated = (event: Event) => {
      const shortlistEvent = event as CustomEvent<{ profileIds?: string[] }>;
      setShortlistedProfileIds(
        shortlistEvent.detail?.profileIds ?? readShortlistedProfileIds()
      );
    };

    window.addEventListener(
      SHORTLIST_UPDATED_EVENT,
      handleShortlistUpdated as EventListener
    );

    return () =>
      window.removeEventListener(
        SHORTLIST_UPDATED_EVENT,
        handleShortlistUpdated as EventListener
      );
  }, []);

  const handleUnlike = (profileId: string) => {
    setLikes((currentLikes) =>
      currentLikes.filter((like) => like.toProfile.id !== profileId)
    );
  };

  const sortedLikes = [...likes].sort((first, second) => {
    if (sortOrder === "oldest") {
      return (
        new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      );
    }

    if (sortOrder === "name") {
      return first.toProfile.fullName.localeCompare(second.toProfile.fullName);
    }

    return (
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    );
  });

  const unlockedProfileIdSet = new Set(
    matches
      .filter((match) => match.isUnlocked)
      .map((match) => match.otherProfile.id)
  );
  const availableLikes = sortedLikes.filter(
    (like) => !unlockedProfileIdSet.has(like.toProfile.id)
  );
  const shortlistedProfileIdSet = new Set(shortlistedProfileIds);
  const shortlistedLikes = availableLikes.filter((like) =>
    shortlistedProfileIdSet.has(like.toProfile.id)
  );
  const activeLikes = availableLikes.filter(
    (like) => !shortlistedProfileIdSet.has(like.toProfile.id)
  );
  const shortlistedCount = shortlistedLikes.length;
  const shouldAutoShowShortlisted =
    !hasManualShortlistPreference &&
    activeLikes.length === 0 &&
    shortlistedCount > 0;
  const effectiveShowShortlistedOnly =
    showShortlistedOnly || shouldAutoShowShortlisted;
  const visibleLikes = effectiveShowShortlistedOnly
    ? shortlistedLikes
    : activeLikes;

  useEffect(() => {
    if (
      !showShortlistedOnly &&
      shouldAutoShowShortlisted &&
      !hasAutoOpenedShortlistRef.current
    ) {
      hasAutoOpenedShortlistRef.current = true;
      setShowShortlistedOnly(true);
      return;
    }

    if (activeLikes.length > 0 || shortlistedCount === 0) {
      hasAutoOpenedShortlistRef.current = false;
    }
  }, [activeLikes.length, shortlistedCount, shouldAutoShowShortlisted, showShortlistedOnly]);

  const handleShortlistViewToggle = () => {
    setHasManualShortlistPreference(true);
    setShowShortlistedOnly((current) => !current);
  };

  const handleShowAllInterests = () => {
    setHasManualShortlistPreference(true);
    setShowShortlistedOnly(false);
  };

  const handleShowShortlistedProfiles = () => {
    setHasManualShortlistPreference(true);
    setShowShortlistedOnly(true);
  };

  if (loading) return <PageLoader />;

  const recentLikesCount = activeLikes.filter((like) =>
    isAfter(new Date(like.createdAt), subDays(new Date(), 7))
  ).length;

  const uniqueLocationsCount = new Set(
    activeLikes
      .map((like) => {
        const parts = [like.toProfile.city, like.toProfile.state].filter(Boolean);
        return parts.join(", ") || like.toProfile.location || "";
      })
      .filter(Boolean)
  ).size;

  const highlightStats = [
    {
      label: "Interests",
      value: activeLikes.length,
      icon: Heart,
      iconClass: "bg-rose-100 text-rose-500",
    },
    {
      label: "Recently Liked",
      value: recentLikesCount,
      icon: Clock3,
      iconClass: "bg-fuchsia-100 text-fuchsia-500",
    },
    {
      label: "Cities Covered",
      value: uniqueLocationsCount,
      icon: MapPin,
      iconClass: "bg-indigo-100 text-indigo-500",
    },
    {
      label: "Mutual Interests",
      value: matches.length,
      icon: Users2,
      iconClass: "bg-emerald-100 text-emerald-500",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 shadow-sm">
              <Heart className="h-4.5 w-4.5" />
            </div>
            <h1 className="font-display text-[1.65rem] font-bold tracking-tight text-slate-900">
              Interests
            </h1>
          </div>
          <p className="text-[13px] text-slate-600">
            {effectiveShowShortlistedOnly
              ? "Showing the profiles you shortlisted from your interests."
              : "Profiles you've shown interest in. Shortlist your favorites to keep them handy."}
          </p>
        </div>

        {activeLikes.length > 0 || shortlistedCount > 0 ? (
          <div className="flex w-full items-center gap-3 xl:w-auto xl:flex-none">
            <div className="min-w-0 flex-1 xl:flex-none">
              <label className="sr-only" htmlFor="liked-sort-order">
                Sort interests
              </label>
              <select
                id="liked-sort-order"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOption)}
                className="h-10 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-rose-200 focus:border-rose-300 xl:w-[320px]"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort By: {option.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleShortlistViewToggle}
              aria-pressed={effectiveShowShortlistedOnly}
              aria-label={
                effectiveShowShortlistedOnly
                  ? "Show all interests"
                  : "Show shortlisted interests"
              }
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border shadow-sm transition-colors ${
                effectiveShowShortlistedOnly
                  ? "border-rose-200 bg-rose-50 text-rose-500"
                  : "border-gray-200 bg-white text-slate-500 hover:border-rose-200 hover:text-rose-500"
              }`}
            >
              <Bookmark
                className={`h-4.5 w-4.5 ${
                  effectiveShowShortlistedOnly || shortlistedCount > 0
                    ? "fill-current"
                    : ""
                }`}
              />
              {shortlistedCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
                  {shortlistedCount}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}
      </div>

      {availableLikes.length === 0 ? (
        <div className="flex min-h-[58vh] flex-col items-center justify-center px-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-rose-50 text-rose-300">
            <Heart className="h-14 w-14" />
          </div>
          <h2 className="mt-8 font-display text-[1.6rem] font-bold text-slate-900 sm:text-[1.75rem]">
            {matches.length > 0 ? "No active interests right now" : "No interests yet"}
          </h2>
          <p className="mt-3 max-w-xl text-base text-slate-500 sm:text-[1.05rem]">
            {matches.length > 0
              ? "Profiles that liked you back are available in Mutual Interest."
              : "Browse profiles and like the ones that interest you!"}
          </p>
          <Link
            href={matches.length > 0 ? "/dashboard/matches" : "/dashboard/browse"}
            className="mt-8 inline-flex items-center justify-center rounded-[18px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-[0_18px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
          >
            {matches.length > 0 ? "View Mutual Interests" : "Browse Profiles"}
          </Link>
        </div>
      ) : (
        <>
          <section className="mx-auto w-full max-w-[1420px] rounded-[12px] border border-rose-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,246,249,0.94)_100%)] p-3 shadow-[0_20px_55px_rgba(15,23,42,0.05)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {highlightStats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className="flex items-center gap-3 rounded-[18px] bg-white/70 px-3.5 py-2 backdrop-blur-sm"
                  >
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${stat.iconClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-[1.35rem] font-bold leading-none text-slate-900">
                        {stat.value}
                      </div>
                      <div className="mt-1 text-[13px] font-medium text-slate-500">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {effectiveShowShortlistedOnly && visibleLikes.length === 0 ? (
            <section className="rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Bookmark className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                No shortlisted profiles yet
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">
                Use the three-dot menu on any interest card and tap shortlist to
                save profiles here.
              </p>
              <button
                type="button"
                onClick={handleShowAllInterests}
                className="mt-7 inline-flex items-center justify-center rounded-[16px] border border-rose-200 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                Show All Interests
              </button>
            </section>
          ) : !effectiveShowShortlistedOnly && visibleLikes.length === 0 ? (
            <section className="rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Bookmark className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                All interests moved to shortlist
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">
                Your shortlisted profiles are waiting in the bookmark view.
              </p>
              <button
                type="button"
                onClick={handleShowShortlistedProfiles}
                className="mt-7 inline-flex items-center justify-center rounded-[16px] border border-rose-200 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                View Shortlisted Profiles
              </button>
            </section>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {visibleLikes.map((like) => (
                  <LikedProfilePreviewCard
                    key={like.id}
                    likedAt={like.createdAt}
                    profile={like.toProfile}
                    showChatAction={effectiveShowShortlistedOnly}
                    onUnlike={handleUnlike}
                  />
                ))}
              </section>

              <section className="pb-6 pt-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                  Can&apos;t find the right match?
                </h2>
                <p className="mt-2 text-[15px] text-slate-500">
                  Try browsing more profiles and like the ones that interest you.
                </p>
                <Link
                  href="/dashboard/browse"
                  className="mt-7 inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
                >
                  Browse Profiles
                  <ArrowUpRight className="h-4.5 w-4.5" />
                </Link>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

