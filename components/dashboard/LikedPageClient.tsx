"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
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
  readShortlistedProfileMetadata,
  SHORTLIST_UPDATED_EVENT,
  type ShortlistProfileMetadataMap,
  writeShortlistedProfileIds,
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
    previewImageUrl: string | null;
  };
}

type ShortlistProfilePreview = LikedProfile["toProfile"];

interface MatchSummary {
  id: string;
  isUnlocked?: boolean;
  otherProfile: {
    id: string;
  };
}

type VisibleLikedProfile = LikedProfile & {
  allowUnlike: boolean;
  shortlistSource: "interest" | "message";
};

function areStringArraysEqual(first: string[], second: string[]) {
  return (
    first.length === second.length &&
    first.every((value, index) => value === second[index])
  );
}

export default function LikedPageClient({
  initialLikes,
  initialMatches,
  viewMode = "interests",
}: {
  initialLikes: LikedProfile[];
  initialMatches: MatchSummary[];
  viewMode?: "interests" | "shortlist";
}) {
  const { data: session } = useSession();
  const shortlistUserId = session?.user?.id ?? null;
  const [likes, setLikes] = useState<LikedProfile[]>(initialLikes);
  const [matches, setMatches] = useState<MatchSummary[]>(initialMatches);
  const [loading, setLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOption>("recent");
  const [shortlistedProfileIds, setShortlistedProfileIds] = useState<string[]>([]);
  const [shortlistMetadata, setShortlistMetadata] =
    useState<ShortlistProfileMetadataMap>({});
  const [shortlistOnlyProfiles, setShortlistOnlyProfiles] = useState<
    ShortlistProfilePreview[]
  >([]);
  const [loadingShortlistOnlyProfiles, setLoadingShortlistOnlyProfiles] =
    useState(false);
  const isShortlistView = viewMode === "shortlist";

  useEffect(() => {
    setLikes(initialLikes);
    setMatches(initialMatches);
  }, [initialLikes, initialMatches]);

  const fetchData = useCallback(
    async ({
      showError = true,
      showLoading = false,
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
          fetch("/api/matches?summary=1", { cache: "no-store" }),
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

        setLikes(likesData.data ?? []);
        setMatches(matchesData.data ?? []);
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

  useAutoRefresh(() => fetchData({ showError: false, showLoading: false }), {
    intervalMs: null,
  });

  useEffect(() => {
    setShortlistedProfileIds(readShortlistedProfileIds(shortlistUserId));
    setShortlistMetadata(readShortlistedProfileMetadata(shortlistUserId));

    const handleShortlistUpdated = (event: Event) => {
      const shortlistEvent = event as CustomEvent<{
        profileIds?: string[];
        userId?: string;
        metadata?: ShortlistProfileMetadataMap;
      }>;

      if ((shortlistEvent.detail?.userId ?? null) !== shortlistUserId) {
        return;
      }

      setShortlistedProfileIds(
        shortlistEvent.detail?.profileIds ??
          readShortlistedProfileIds(shortlistUserId)
      );
      setShortlistMetadata(
        shortlistEvent.detail?.metadata ??
          readShortlistedProfileMetadata(shortlistUserId)
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
  }, [shortlistUserId]);

  useEffect(() => {
    if (!shortlistUserId || shortlistedProfileIds.length === 0) {
      return;
    }

    const likedProfileIdSet = new Set(likes.map((like) => like.toProfile.id));
    const matchedProfileIdSet = new Set(
      matches.map((match) => match.otherProfile.id)
    );

    const nextShortlistedProfileIds = shortlistedProfileIds.filter(
      (profileId) => {
        const shortlistSource = shortlistMetadata[profileId]?.source ?? "interest";
        return (
          shortlistSource === "message" ||
          likedProfileIdSet.has(profileId) ||
          matchedProfileIdSet.has(profileId)
        );
      }
    );

    if (areStringArraysEqual(nextShortlistedProfileIds, shortlistedProfileIds)) {
      return;
    }

    writeShortlistedProfileIds(nextShortlistedProfileIds, shortlistUserId);
  }, [likes, matches, shortlistMetadata, shortlistUserId, shortlistedProfileIds]);

  useEffect(() => {
    if (!isShortlistView || !shortlistUserId) {
      setLoadingShortlistOnlyProfiles(false);
      setShortlistOnlyProfiles([]);
      return;
    }

    const likedProfileIdSet = new Set(likes.map((like) => like.toProfile.id));
    const matchedProfileIdSet = new Set(
      matches.map((match) => match.otherProfile.id)
    );
    const messageShortlistIds = shortlistedProfileIds.filter((profileId) => {
      if (likedProfileIdSet.has(profileId) || matchedProfileIdSet.has(profileId)) {
        return false;
      }

      return shortlistMetadata[profileId]?.source === "message";
    });

    if (messageShortlistIds.length === 0) {
      setLoadingShortlistOnlyProfiles(false);
      setShortlistOnlyProfiles([]);
      return;
    }

    let active = true;

    const loadShortlistOnlyProfiles = async () => {
      if (active) {
        setLoadingShortlistOnlyProfiles(true);
      }

      try {
        const response = await fetch("/api/shortlist/profiles", {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            profileIds: messageShortlistIds,
          }),
        });
        const result = await response.json();

        if (!response.ok || !Array.isArray(result.data)) {
          throw new Error(result.error ?? "Failed to load shortlisted profiles");
        }

        if (!active) {
          return;
        }

        const nextProfiles = result.data as ShortlistProfilePreview[];
        setShortlistOnlyProfiles(nextProfiles);

        const returnedProfileIdSet = new Set(nextProfiles.map((profile) => profile.id));
        const nextShortlistedProfileIds = shortlistedProfileIds.filter(
          (profileId) =>
            shortlistMetadata[profileId]?.source !== "message" ||
            likedProfileIdSet.has(profileId) ||
            returnedProfileIdSet.has(profileId)
        );

        if (!areStringArraysEqual(nextShortlistedProfileIds, shortlistedProfileIds)) {
          writeShortlistedProfileIds(nextShortlistedProfileIds, shortlistUserId);
        }
      } catch {
        if (active) {
          setShortlistOnlyProfiles([]);
        }
      } finally {
        if (active) {
          setLoadingShortlistOnlyProfiles(false);
        }
      }
    };

    void loadShortlistOnlyProfiles();

    return () => {
      active = false;
    };
  }, [
    isShortlistView,
    likes,
    matches,
    shortlistMetadata,
    shortlistUserId,
    shortlistedProfileIds,
  ]);

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

  const matchedProfileIdSet = new Set(
    matches.map((match) => match.otherProfile.id)
  );
  const shortlistedProfileIdSet = new Set(shortlistedProfileIds);
  const shortlistOnlyItems: VisibleLikedProfile[] = shortlistOnlyProfiles.map(
    (profile) => ({
      id: `shortlist:${profile.id}`,
      createdAt:
        shortlistMetadata[profile.id]?.savedAt ?? new Date().toISOString(),
      toProfile: profile,
      allowUnlike: false,
      shortlistSource: "message",
    })
  );
  const likedFeedItems: VisibleLikedProfile[] = sortedLikes.map((like) => ({
    ...like,
    allowUnlike: true,
    shortlistSource: shortlistMetadata[like.toProfile.id]?.source ?? "interest",
  }));
  const availableLikes = likedFeedItems.filter(
    (like) => !matchedProfileIdSet.has(like.toProfile.id)
  );
  const shortlistFeedItems = [
    ...likedFeedItems.filter((like) =>
      shortlistedProfileIdSet.has(like.toProfile.id)
    ),
    ...shortlistOnlyItems,
  ].sort(
    (first, second) => {
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
    }
  );
  const shortlistedLikes = shortlistFeedItems.filter((like) =>
    shortlistedProfileIdSet.has(like.toProfile.id)
  );
  const activeLikes = availableLikes.filter(
    (like) => !shortlistedProfileIdSet.has(like.toProfile.id)
  );
  const hasSavedShortlist = shortlistedProfileIds.length > 0;
  const shortlistedCount = shortlistedLikes.length;
  const visibleLikes = isShortlistView ? shortlistedLikes : activeLikes;
  const showSavedShortlistEmptyState =
    isShortlistView &&
    hasSavedShortlist &&
    shortlistedCount === 0 &&
    shortlistFeedItems.length === 0 &&
    !loadingShortlistOnlyProfiles;

  if (loading) return <PageLoader />;

  const recentLikesCount = visibleLikes.filter((like) =>
    isAfter(new Date(like.createdAt), subDays(new Date(), 7))
  ).length;

  const uniqueLocationsCount = new Set(
    visibleLikes
      .map((like) => {
        const parts = [like.toProfile.city, like.toProfile.state].filter(Boolean);
        return parts.join(", ") || like.toProfile.location || "";
      })
      .filter(Boolean)
  ).size;
  const PageIcon = isShortlistView ? Bookmark : Heart;

  const highlightStats = [
    {
      label: isShortlistView ? "Shortlisted" : "Interests",
      value: visibleLikes.length,
      icon: isShortlistView ? Bookmark : Heart,
      iconClass: "bg-rose-100 text-rose-500",
    },
    {
      label: isShortlistView ? "Recently Saved" : "Recently Liked",
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
        <div
          className="ui-enter-up space-y-2"
          style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-3">
            <div className="ui-soft-float flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 shadow-sm">
              <PageIcon className="h-4.5 w-4.5" />
            </div>
            <h1 className="font-display text-[1.65rem] font-bold tracking-tight text-slate-900">
              {isShortlistView ? "Shortlist" : "Interests"}
            </h1>
          </div>
          <p className="text-[13px] text-slate-600">
            {isShortlistView
              ? "Showing the profiles you saved from interests and message notifications."
              : "Profiles you've shown interest in. Shortlist your favorites to keep them handy."}
          </p>
        </div>

        {availableLikes.length > 0 || hasSavedShortlist ? (
          <div
            className="ui-enter-right w-full xl:w-auto xl:flex-none"
            style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
          >
            <label className="sr-only" htmlFor="liked-sort-order">
              Sort interests
            </label>
            <select
              id="liked-sort-order"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as SortOption)}
              className="ui-card-lift-soft h-10 w-full rounded-[14px] border border-gray-200 bg-white px-4 text-xs font-medium text-slate-700 outline-none transition-colors hover:border-rose-200 focus:border-rose-300 xl:w-[320px]"
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

      {!isShortlistView && availableLikes.length === 0 && !showSavedShortlistEmptyState ? (
        <div
          className="ui-enter-scale flex min-h-[58vh] flex-col items-center justify-center px-4 text-center"
          style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
        >
          <div className="ui-soft-float flex h-28 w-28 items-center justify-center rounded-full bg-rose-50 text-rose-300">
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
            className="ui-link-shift mt-8 inline-flex items-center justify-center rounded-[18px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-base font-semibold text-white shadow-[0_18px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
          >
            {matches.length > 0 ? "View Mutual Interests" : "Browse Profiles"}
          </Link>
        </div>
      ) : (
        <>
          <section
            className="ui-enter-up mx-auto w-full max-w-[1420px] rounded-[12px] border border-rose-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,246,249,0.94)_100%)] p-3 shadow-[0_20px_55px_rgba(15,23,42,0.05)]"
            style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {highlightStats.map((stat, index) => {
                const Icon = stat.icon;

                return (
                  <div
                    key={stat.label}
                    className="ui-enter-scale ui-card-lift-soft flex items-center gap-3 rounded-[18px] bg-white/70 px-3.5 py-2 backdrop-blur-sm"
                    style={{
                      animationDelay: `${180 + index * 60}ms`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <div
                      className={`ui-icon-lift flex h-10 w-10 items-center justify-center rounded-full ${stat.iconClass}`}
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

          {showSavedShortlistEmptyState ? (
            <section
              className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm"
              style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
            >
              <div className="ui-soft-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Bookmark className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                Your shortlist is still saved
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">
                Those saved profiles are not available in your current shortlist view right now.
                They may have moved to Mutual Interest or Unlocked Profiles.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/dashboard/liked"
                  className="ui-link-shift inline-flex items-center justify-center rounded-[16px] border border-rose-200 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
                >
                  Show All Interests
                </Link>
                <Link
                  href={matches.length > 0 ? "/dashboard/matches" : "/dashboard/browse"}
                  className="ui-link-shift inline-flex items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
                >
                  {matches.length > 0 ? "View Mutual Interests" : "Browse Profiles"}
                </Link>
              </div>
            </section>
          ) : isShortlistView &&
            visibleLikes.length === 0 &&
            !loadingShortlistOnlyProfiles ? (
            <section
              className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm"
              style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
            >
              <div className="ui-soft-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Bookmark className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                No shortlisted profiles yet
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">
                Save profiles from your interests or accept a message notification to
                keep them here.
              </p>
              <Link
                href="/dashboard/liked"
                className="ui-link-shift mt-7 inline-flex items-center justify-center rounded-[16px] border border-rose-200 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                Show All Interests
              </Link>
            </section>
          ) : isShortlistView &&
            loadingShortlistOnlyProfiles &&
            visibleLikes.length === 0 ? (
            <section
              className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm"
              style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
            >
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500" />
              <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                Loading shortlisted profiles
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">
                Bringing in the profiles you saved from recent message notifications.
              </p>
            </section>
          ) : !isShortlistView && visibleLikes.length === 0 ? (
            <section
              className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 bg-white px-6 py-12 text-center shadow-sm"
              style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
            >
              <div className="ui-soft-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
                <Bookmark className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-[1.6rem] font-bold text-slate-900">
                All interests moved to shortlist
              </h2>
              <p className="mt-2 text-[15px] text-slate-500">
                Your shortlisted profiles are waiting in the bookmark view.
              </p>
              <Link
                href="/dashboard/shortlist"
                className="ui-link-shift mt-7 inline-flex items-center justify-center rounded-[16px] border border-rose-200 px-6 py-3 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                View Shortlisted Profiles
              </Link>
            </section>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {visibleLikes.map((like, index) => (
                  <div
                    key={like.id}
                    className="ui-enter-scale"
                    style={{
                      animationDelay: `${120 + (index % 10) * 55}ms`,
                      animationFillMode: "forwards",
                    }}
                  >
                    <LikedProfilePreviewCard
                      likedAt={like.createdAt}
                      profile={like.toProfile}
                      shortlistUserId={shortlistUserId}
                      showChatAction={isShortlistView}
                      allowUnlike={like.allowUnlike}
                      onUnlike={handleUnlike}
                    />
                  </div>
                ))}
              </section>

              <section
                className="ui-enter-up pb-6 pt-4 text-center"
                style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
              >
                <div className="ui-soft-float mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-500">
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
                  className="ui-link-shift mt-7 inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_34px_rgba(244,63,94,0.24)] transition-transform hover:-translate-y-0.5"
                >
                  Browse Profiles
                  <ArrowUpRight className="ui-arrow-shift h-4.5 w-4.5" />
                </Link>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
