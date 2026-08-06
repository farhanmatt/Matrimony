"use client";

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isAfter, subDays } from "date-fns";
import {
  CheckCircle2,
  Heart,
  HeartHandshake,
  Inbox,
  TrendingUp,
  Search,
  X,
} from "lucide-react";
import ReceivedLikePreviewCard from "@/components/profile/ReceivedLikePreviewCard";
import Pagination from "@/components/common/Pagination";

type FilterKey = "all" | "new";
type SortKey = "recent" | "oldest" | "name" | "age";

interface ReceivedLikeProfile {
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
  previewImageUrl: string | null;
}

interface ReceivedLikeItem {
  id: string;
  createdAt: string;
  isLikedBack: boolean;
  isMatched: boolean;
  profile: ReceivedLikeProfile;
}

const filterOptions: Array<{ key: FilterKey; label: string }> = [
  { key: "all", label: "All Likes" },
  { key: "new", label: "New" },
];

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: "recent", label: "Recently Received" },
  { key: "oldest", label: "Oldest First" },
  { key: "name", label: "Name A-Z" },
  { key: "age", label: "Youngest First" },
];

export default function ReceivedLikesBoard({
  initialLikes,
  movedToMatchesCount = 0,
}: {
  initialLikes: ReceivedLikeItem[];
  movedToMatchesCount?: number;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [convertedCount, setConvertedCount] = useState(movedToMatchesCount);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [sortOrder, setSortOrder] = useState<SortKey>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setLikes(initialLikes);
    setConvertedCount(movedToMatchesCount);
  }, [initialLikes, movedToMatchesCount]);
  const recentCutoff = subDays(new Date(), 7);

  const counts = useMemo(() => {
    const newLikes = likes.filter((like) =>
      isAfter(new Date(like.createdAt), recentCutoff)
    ).length;

    return {
      all: likes.length,
      new: newLikes,
    };
  }, [likes, recentCutoff]);

  const rawFilteredLikes = useMemo(() => {
    const nextLikes = likes.filter((like) => {
      if (activeFilter === "new") {
        return isAfter(new Date(like.createdAt), recentCutoff);
      }

      return true;
    });

    nextLikes.sort((first, second) => {
      if (sortOrder === "oldest") {
        return (
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
        );
      }

      if (sortOrder === "name") {
        return first.profile.fullName.localeCompare(second.profile.fullName);
      }

      if (sortOrder === "age") {
        return (
          new Date(second.profile.dateOfBirth).getTime() -
          new Date(first.profile.dateOfBirth).getTime()
        );
      }

      return (
        new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
      );
    });

    return nextLikes;
  }, [activeFilter, likes, recentCutoff, sortOrder]);

  const filteredLikes = useMemo(() => {
    if (!searchQuery.trim()) {
      return rawFilteredLikes;
    }
    const query = searchQuery.toLowerCase().trim();
    return rawFilteredLikes.filter(
      (like) =>
        like.profile.fullName.toLowerCase().includes(query) ||
        like.profile.id.toLowerCase().includes(query)
    );
  }, [rawFilteredLikes, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, sortOrder, searchQuery]);

  const handleLikeBackSuccess = (profileId: string, matched: boolean) => {
    if (matched) {
      setConvertedCount((current) => current + 1);
    }

    setLikes((currentLikes) =>
      matched
        ? currentLikes.filter((item) => item.profile.id !== profileId)
        : currentLikes.map((item) =>
            item.profile.id === profileId
              ? {
                  ...item,
                  isLikedBack: true,
                  isMatched: matched || item.isMatched,
                }
              : item
          )
    );
  };

  const overviewRows = [
    {
      label: "Total Received Likes",
      value: counts.all,
      icon: Heart,
      iconClass: "text-rose-500",
    },
    {
      label: "New Likes",
      value: counts.new,
      icon: Inbox,
      iconClass: "text-fuchsia-500",
    },
    {
      label: "Moved to Matches",
      value: convertedCount,
      icon: HeartHandshake,
      iconClass: "text-emerald-500",
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_250px]">
        <div className="space-y-6">
          <div
            className="ui-enter-up space-y-3"
            style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
          >
            <div className="flex items-center gap-3">
              <div className="ui-soft-float flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 shadow-sm">
                <Heart className="h-4.5 w-4.5" />
              </div>
              <h1 className="font-display text-[1.6rem] font-bold tracking-tight text-slate-900 dark:text-slate-100">
                Received Likes
              </h1>
            </div>
            <p className="text-[14px] text-slate-600 dark:text-slate-400">
              Profiles who have shown interest in you.
            </p>
          </div>

          <div
            className="ui-enter-right flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
            style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
          >
            <div className="flex flex-wrap gap-3">
              {filterOptions.map((option) => {
                const count = option.key === "all" ? counts.all : counts.new;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setActiveFilter(option.key)}
                    className={`ui-link-shift rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                      activeFilter === option.key
                        ? "bg-rose-50 text-rose-600 shadow-sm"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {option.label} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ui-card-lift-soft h-10 w-full rounded-[14px] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-9 text-[13px] font-medium text-slate-700 dark:text-slate-100 outline-none transition-colors placeholder:text-slate-400 focus:border-rose-300"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>

              <div className="w-full sm:max-w-[200px]">
                <label className="sr-only" htmlFor="received-likes-sort">
                  Sort received likes
                </label>
                <select
                  id="received-likes-sort"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value as SortKey)}
                  className="ui-card-lift-soft h-10 w-full rounded-[14px] border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 text-[13px] font-medium text-slate-700 dark:text-slate-300 outline-none transition-colors hover:border-rose-200 focus:border-rose-300"
                >
                  {sortOptions.map((option) => (
                    <option key={option.key} value={option.key}>
                      Sort By: {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredLikes.length === 0 ? (
            <div
              className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm"
              style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
            >
              <div className="ui-soft-float mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-400">
                <Heart className="h-8 w-8" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                {counts.all === 0 && convertedCount > 0
                  ? "No pending received likes"
                  : "No profiles in this view"}
              </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  {counts.all === 0 && convertedCount > 0
                  ? "Profiles you liked back have been moved to Mutual Interest."
                  : "Try another filter to see more received likes."}
                </p>
              {counts.all === 0 && convertedCount > 0 ? (
                <Link
                  href="/dashboard/matches"
                  className="ui-link-shift mt-6 inline-flex items-center justify-center rounded-[14px] bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  View Mutual Interests
                </Link>
              ) : null}
            </div>
          ) : rawFilteredLikes.length > 0 && filteredLikes.length === 0 ? (
            <div
              className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm"
              style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
            >
              <div className="ui-soft-float mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400">
                <Search className="h-8 w-8" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold text-slate-900 dark:text-slate-100">
                No profiles found
              </h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                We couldn't find any profiles matching "{searchQuery}".
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="ui-link-shift mt-6 inline-flex items-center justify-center rounded-[14px] border border-rose-200 dark:border-rose-500/50 px-5 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredLikes.slice((currentPage - 1) * 8, currentPage * 8).map((item, index) => {
                  const badge = isAfter(new Date(item.createdAt), recentCutoff)
                    ? "New"
                    : undefined;

                  return (
                    <div
                      key={item.id}
                      className="ui-enter-scale"
                      style={{
                        animationDelay: `${140 + (index % 8) * 55}ms`,
                        animationFillMode: "forwards",
                      }}
                    >
                      <ReceivedLikePreviewCard
                        item={item}
                        badge={badge}
                        onLikeBackSuccess={handleLikeBackSuccess}
                      />
                    </div>
                  );
                })}
              </section>
              <Pagination 
                currentPage={currentPage}
                totalPages={Math.ceil(filteredLikes.length / 8)}
                onPageChange={setCurrentPage}
              />
            </>
          )}

          <section
            className="ui-enter-up ui-card-lift-soft mr-auto flex w-full max-w-[980px] flex-col gap-4 rounded-[24px] border border-rose-100 dark:border-slate-800 bg-[linear-gradient(135deg,rgba(255,247,249,0.98)_0%,rgba(255,235,241,0.9)_100%)] dark:bg-[linear-gradient(135deg,rgba(15,23,42,0.98)_0%,rgba(15,23,42,0.9)_100%)] dark:bg-slate-900 px-5 py-4 shadow-sm md:flex-row md:items-center md:justify-between"
            style={{ animationDelay: "220ms", animationFillMode: "forwards" }}
          >
            <div className="flex items-start gap-3">
              <div className="ui-icon-lift flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-rose-500 shadow-sm">
                <Inbox className="h-4.5 w-4.5" />
              </div>
              <div>
                <h3 className="font-display text-[1.15rem] font-bold text-slate-900 dark:text-slate-100 md:text-[1.2rem]">
                  Respond to likes and start a conversation!
                </h3>
                <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-400">
                  Don&apos;t miss the opportunity to connect with someone special.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/matches"
              className="ui-link-shift inline-flex items-center justify-center rounded-[14px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5"
            >
              View Mutual Interests
            </Link>
          </section>
        </div>

        <aside className="space-y-5">
          <section
            className="ui-enter-right ui-card-lift-soft rounded-[12px] border border-rose-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="ui-icon-lift flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Heart className="h-4 w-4" />
              </div>
              <h2 className="font-display text-[1.35rem] font-bold text-slate-900 dark:text-slate-100">
                Likes Overview
              </h2>
            </div>

            <div className="space-y-3.5">
              {overviewRows.map((row) => {
                const Icon = row.icon;

                return (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 rounded-[14px] text-[13px] transition-transform duration-300 hover:translate-x-1"
                  >
                    <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
                      <Icon className={`h-4 w-4 ${row.iconClass}`} />
                      <span>{row.label}</span>
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{row.value}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            className="ui-enter-right ui-card-lift-soft rounded-[12px] border border-rose-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm"
            style={{ animationDelay: "260ms", animationFillMode: "forwards" }}
          >
            <div className="mb-4 flex items-center gap-2.5">
              <div className="ui-icon-lift flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
              <h2 className="whitespace-nowrap font-display text-[1.08rem] font-bold text-slate-900 dark:text-slate-100">
                Improve Your Chances
              </h2>
            </div>

            <div className="space-y-3 text-[13px] text-slate-600 dark:text-slate-400">
              {[
                "Complete your profile",
                "Add more photos",
                "Verify your profile",
                "Be active and respond",
              ].map((tip) => (
                <div
                  key={tip}
                  className="flex items-center gap-2 rounded-[12px] transition-transform duration-300 hover:translate-x-1"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{tip}</span>
                </div>
              ))}
            </div>

            <Link
              href="/dashboard/profile/edit"
              className="ui-link-shift mt-5 inline-flex w-full items-center justify-center rounded-[12px] border border-rose-200 px-4 py-3 text-[13px] font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              View Profile Tips
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}

