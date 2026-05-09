"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAfter, subDays } from "date-fns";
import {
  ArrowUpRight,
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
  otherProfile: {
    id: string;
  };
}

export default function LikedPage() {
  const [likes, setLikes] = useState<LikedProfile[]>([]);
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOption>("recent");

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
          throw new Error(likesData.error ?? "Failed to load liked profiles");
        }

        if (!matchesRes.ok) {
          throw new Error(matchesData.error ?? "Failed to load matches");
        }

        const nextMatches = matchesData.data ?? [];
        const matchedProfileIds = new Set(
          nextMatches.map((match: MatchSummary) => match.otherProfile.id)
        );
        const pendingLikes = (likesData.data ?? []).filter(
          (like: LikedProfile) => !matchedProfileIds.has(like.toProfile.id)
        );

        setLikes(pendingLikes);
        setMatches(nextMatches);
      } catch (error) {
        if (showError) {
          toast.error(
            error instanceof Error ? error.message : "Unable to load liked profiles"
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

  const handleUnlike = (profileId: string) => {
    setLikes((currentLikes) =>
      currentLikes.filter((like) => like.toProfile.id !== profileId)
    );
  };

  if (loading) return <PageLoader />;

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

  const recentLikesCount = likes.filter((like) =>
    isAfter(new Date(like.createdAt), subDays(new Date(), 7))
  ).length;

  const uniqueLocationsCount = new Set(
    likes
      .map((like) => {
        const parts = [like.toProfile.city, like.toProfile.state].filter(Boolean);
        return parts.join(", ") || like.toProfile.location || "";
      })
      .filter(Boolean)
  ).size;

  const highlightStats = [
    {
      label: "Liked Profiles",
      value: likes.length,
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
      label: "Matches Found",
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
              Liked Profiles
            </h1>
          </div>
          <p className="text-[13px] text-slate-600">
            Profiles you&apos;ve shown interest in that are still waiting for a mutual match.
          </p>
        </div>

        {likes.length > 0 ? (
          <div className="xl:min-w-[238px]">
            <label className="sr-only" htmlFor="liked-sort-order">
              Sort liked profiles
            </label>
            <select
              id="liked-sort-order"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOption)}
              className="h-10 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-rose-200 focus:border-rose-300"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  Sort By: {option.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {likes.length === 0 ? (
        <div className="flex min-h-[58vh] flex-col items-center justify-center px-4 text-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-rose-50 text-rose-300">
            <Heart className="h-14 w-14" />
          </div>
          <h2 className="mt-8 font-display text-[1.6rem] font-bold text-slate-900 sm:text-[1.75rem]">
            {matches.length > 0 ? "No pending liked profiles" : "No liked profiles yet"}
          </h2>
          <p className="mt-3 max-w-xl text-base text-slate-500 sm:text-[1.05rem]">
            {matches.length > 0
              ? "Profiles that liked you back have been moved to My Matches."
              : "Browse profiles and like the ones that interest you!"}
          </p>
          <Link
            href={matches.length > 0 ? "/dashboard/matches" : "/dashboard/browse"}
            className="mt-8 inline-flex items-center justify-center rounded-[18px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-[0_18px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
          >
            {matches.length > 0 ? "View My Matches" : "Browse Profiles"}
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

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {sortedLikes.map((like) => (
              <LikedProfilePreviewCard
                key={like.id}
                likedAt={like.createdAt}
                profile={like.toProfile}
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
    </div>
  );
}
