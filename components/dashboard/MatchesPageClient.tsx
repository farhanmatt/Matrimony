"use client";

import Link from "next/link";
import { isAfter, subDays } from "date-fns";
import { useRouter } from "next/navigation";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import EmptyState from "@/components/common/EmptyState";
import { PageLoader } from "@/components/common/LoadingSpinner";
import MatchProfileCard from "@/components/dashboard/MatchProfileCard";
import PaymentModal from "@/components/payment/PaymentModal";
import { useAutoRefresh } from "@/lib/hooks/useAutoRefresh";
import {
  ChevronDown,
  HeartHandshake,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

interface Match {
  id: string;
  otherProfile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: string;
    height: number | null;
    maritalStatus: string;
    profession: string | null;
    city: string | null;
    state: string | null;
    religion: string | null;
    education: string | null;
    course: string | null;
    phone: string | null;
    previewImageUrl?: string | null;
    photos: { url: string; isPrimary: boolean }[];
  };
  isProfileUnlocked: boolean;
  isChatUnlocked: boolean;
  createdAt: string;
}

type FilterKey = "all" | "recent";

const INITIAL_VISIBLE_COUNT = 8;
const LOAD_MORE_COUNT = 4;

export default function MatchesPageClient({
  initialMatches,
  initialUnlockedMatchesCount,
  initialPricing,
}: {
  initialMatches: Match[];
  initialUnlockedMatchesCount: number;
  initialPricing: {
    baseAmount: number;
    profileAmount: number;
    perProfileChatAmount: number;
  };
}) {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [unlockedMatchesCount, setUnlockedMatchesCount] = useState(
    initialUnlockedMatchesCount
  );
  const [loading, setLoading] = useState(false);
  const [pricing, setPricing] = useState(initialPricing);
  const [unlockMatchId, setUnlockMatchId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  useEffect(() => {
    setMatches(initialMatches);
    setUnlockedMatchesCount(initialUnlockedMatchesCount);
    setPricing(initialPricing);
  }, [initialMatches, initialPricing, initialUnlockedMatchesCount]);

  const fetchData = useCallback(
    async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const [matchRes, settingsRes] = await Promise.all([
          fetch("/api/matches", { cache: "no-store" }),
          fetch("/api/admin/settings", { cache: "no-store" }),
        ]);
        const matchData = await matchRes.json();
        const settingsData = await settingsRes.json();
        const pendingMatches: Match[] = matchData.data ?? [];

        setMatches(pendingMatches);
        setUnlockedMatchesCount(matchData.unlockedMatchesCount ?? 0);
        if (settingsData.settings) {
          setPricing({
            baseAmount: settingsData.settings.baseAmount,
            profileAmount: settingsData.settings.profileAmount,
            perProfileChatAmount: settingsData.settings.perProfileChatAmount ?? 0,
          });
        }
      } catch (error) {
        console.error("Matches refresh error:", error);
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

  const handleUnlockSuccess = (
    matchId: string,
    options?: { redirectToUnlocked?: boolean }
  ) => {
    setMatches((prev) => prev.filter((match) => match.id !== matchId));
    setUnlockedMatchesCount((current) => current + 1);
    setUnlockMatchId(null);

    if (options?.redirectToUnlocked) {
      router.push("/dashboard/unlocked");
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  const recentCutoff = subDays(new Date(), 7);
  const normalizedSearch = deferredSearchTerm.trim().toLowerCase();
  const filteredMatches = matches.filter((match) => {
    if (
      activeFilter === "recent" &&
      !isAfter(new Date(match.createdAt), recentCutoff)
    ) {
      return false;
    }

    if (!normalizedSearch) {
      return true;
    }

    const searchableText = [
      match.otherProfile.fullName,
      match.otherProfile.profession,
      match.otherProfile.religion,
      match.otherProfile.education,
      match.otherProfile.course,
      match.otherProfile.city,
      match.otherProfile.state,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(normalizedSearch);
  });

  const visibleMatches = filteredMatches.slice(0, visibleCount);
  const canLoadMore = visibleCount < filteredMatches.length;

  if (matches.length === 0) {
    return (
      <div
        className="ui-enter-scale"
        style={{ animationDelay: "80ms", animationFillMode: "forwards" }}
      >
        <EmptyState
          icon="heart"
          title={
            unlockedMatchesCount > 0
              ? "No pending mutual interests to unlock"
              : "No mutual interests yet"
          }
          description={
            unlockedMatchesCount > 0
              ? "Profiles you unlocked have been moved to Unlocked Profiles."
              : "Start liking profiles that interest you. When they like you back, you'll see a mutual interest here!"
          }
          action={{
            label: unlockedMatchesCount > 0 ? "View Unlocked Profiles" : "Browse Profiles",
            href: unlockedMatchesCount > 0 ? "/dashboard/unlocked" : "/dashboard/browse",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div
          className="ui-enter-up space-y-3"
          style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
        >
          <div className="flex items-center gap-4">
            <div className="ui-soft-float flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 shadow-sm">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-slate-900">
              Mutual Interest
            </h1>
          </div>
          <p className="max-w-2xl text-[15px] text-slate-600">
            These are your mutual interests - both of you showed interest in each other.
          </p>
        </div>

        <div
          className="ui-enter-right flex w-full flex-col gap-3 sm:flex-row xl:max-w-[520px]"
          style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
        >
          <label className="ui-card-lift-soft relative block flex-1 rounded-[18px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search mutual interests..."
              className="h-12 w-full rounded-[18px] border border-rose-100 bg-white pl-12 pr-4 text-sm text-slate-700 outline-none shadow-sm transition-colors placeholder:text-slate-400 focus:border-rose-300"
            />
          </label>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowFilterMenu((current) => !current)}
              className="ui-link-shift inline-flex h-12 w-12 items-center justify-center rounded-[14px] border border-rose-100 bg-white text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
              aria-label="Open filters"
            >
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </button>

            {showFilterMenu ? (
              <div className="ui-enter-up absolute right-0 top-14 z-20 min-w-[180px] overflow-hidden rounded-2xl border border-rose-100 bg-white py-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
                {[
                  { key: "all", label: "All Mutual Interests" },
                  { key: "recent", label: "Recent Mutual Interests" },
                ].map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => {
                      setActiveFilter(option.key as FilterKey);
                      setShowFilterMenu(false);
                    }}
                    className={`ui-link-shift flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-medium transition-colors ${
                      activeFilter === option.key
                        ? "bg-rose-50 text-rose-600"
                        : "text-slate-700 hover:bg-rose-50 hover:text-rose-600"
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

      {filteredMatches.length === 0 ? (
        <section
          className="ui-enter-scale ui-card-lift-soft rounded-[28px] border border-rose-100 bg-white px-6 py-10 text-center shadow-sm"
          style={{ animationDelay: "160ms", animationFillMode: "forwards" }}
        >
          <h2 className="font-display text-[1.55rem] font-bold text-slate-900">
            No mutual interests found
          </h2>
          <p className="mt-2 text-[15px] text-slate-500">
            Try a different search or filter to see more mutual interests.
          </p>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {visibleMatches.map((match, index) => (
              <div
                key={match.id}
                className="ui-enter-scale"
                style={{
                  animationDelay: `${140 + (index % 8) * 55}ms`,
                  animationFillMode: "forwards",
                }}
              >
                <MatchProfileCard
                  matchId={match.id}
                  profile={match.otherProfile}
                  isUnlocked={match.isProfileUnlocked}
                  baseAmount={pricing.baseAmount}
                  profileAmount={pricing.profileAmount}
                  perProfileChatAmount={pricing.perProfileChatAmount}
                  onUnlock={(id) => setUnlockMatchId(id)}
                />
              </div>
            ))}
          </section>

          {canLoadMore ? (
            <div
              className="ui-enter-up flex justify-center"
              style={{ animationDelay: "200ms", animationFillMode: "forwards" }}
            >
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((current) => current + LOAD_MORE_COUNT)
                }
                className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-[16px] border border-rose-100 bg-white px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-600"
              >
                Load More
                <RefreshCw className="h-4.5 w-4.5" />
              </button>
            </div>
          ) : null}
        </>
      )}

      <section
        className="ui-enter-up ui-card-lift-soft flex flex-col gap-5 rounded-[28px] border border-rose-100/80 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between"
        style={{ animationDelay: "240ms", animationFillMode: "forwards" }}
      >
        <div className="flex items-start gap-4">
          <div className="ui-icon-lift flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h2 className="font-display text-[1.4rem] font-bold text-slate-900">
              Safe & Secure
            </h2>
            <p className="mt-1 text-[15px] text-slate-500">
              Your privacy is our priority. Contact details stay protected until
              you unlock the profile.
            </p>
          </div>
        </div>

        <Link
          href="/privacy"
          className="ui-link-shift inline-flex items-center gap-2 text-sm font-semibold text-rose-500 transition-colors hover:text-rose-600"
        >
          Know more about safety
          <ChevronDown className="ui-arrow-shift h-4 w-4 -rotate-90" />
        </Link>
      </section>

      {unlockMatchId ? (
        <PaymentModal
          matchId={unlockMatchId}
          profileName={
            matches.find((match) => match.id === unlockMatchId)?.otherProfile.fullName
          }
          baseAmount={pricing.baseAmount}
          profileAmount={pricing.profileAmount}
          perProfileChatAmount={pricing.perProfileChatAmount}
          onClose={() => setUnlockMatchId(null)}
          onSuccess={handleUnlockSuccess}
        />
      ) : null}
    </div>
  );
}
