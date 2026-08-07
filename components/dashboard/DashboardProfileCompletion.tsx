"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import {
  getProfileCompletion,
  type ProfileCompletionResult,
  type ProfileCompletionSource,
} from "@/lib/utils/profileCompletion";
import { useSession } from "next-auth/react";
import { loadCreateProfileDraft } from "@/lib/utils/profile-draft";


function useDashboardProfileCompletion(
  initialCompletion: ProfileCompletionResult,
  hasPersistedProfile: boolean
) {
  const [completion, setCompletion] = useState(initialCompletion);

  const { data: session } = useSession();

  useEffect(() => {
    if (hasPersistedProfile) {
      setCompletion(initialCompletion);
      return;
    }

    const syncDraftCompletion = () => {
      const draft = loadCreateProfileDraft(session?.user?.id);

      if (!draft?.values) {
        setCompletion(initialCompletion);
        return;
      }

      setCompletion(
        getProfileCompletion(draft.values as ProfileCompletionSource, { hasPersistedProfile: false })
      );
    };

    syncDraftCompletion();
    window.addEventListener("focus", syncDraftCompletion);

    return () => {
      window.removeEventListener("focus", syncDraftCompletion);
    };
  }, [hasPersistedProfile, initialCompletion, session?.user?.id]);

  return completion;
}

type DashboardProfileCompletionSidebarProps = {
  hasPersistedProfile: boolean;
  initialCompletion: ProfileCompletionResult;
};

export function DashboardProfileCompletionSidebar({
  hasPersistedProfile,
  initialCompletion,
}: DashboardProfileCompletionSidebarProps) {
  const completion = useDashboardProfileCompletion(
    initialCompletion,
    hasPersistedProfile
  );
  const buttonLabel =
    hasPersistedProfile || completion.hasAnyProgress
      ? "Complete Your Profile"
      : "Create / Update Your Profile";
  const buttonHref = hasPersistedProfile
    ? "/dashboard/profile/edit"
    : "/dashboard/profile/create";

  return (
    <section className="ui-card-lift-soft rounded-[14px] border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold leading-tight text-gray-900 dark:text-slate-100">
          Profile Completeness
        </h2>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400">
          {completion.percent}% Complete
        </p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-rose-100 dark:bg-rose-900/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700"
          style={{ width: `${completion.percent}%` }}
        />
      </div>

      <div className="mt-5 space-y-3">
        {completion.items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              {item.complete ? (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 dark:text-emerald-400" />
              ) : (
                <Circle className="h-4.5 w-4.5 text-amber-400 dark:text-amber-500" />
              )}
              <span className="text-[13px] text-gray-700 dark:text-slate-300">{item.label}</span>
            </div>
          </div>
        ))}
      </div>

      <Link
        href={buttonHref}
        className="ui-link-shift mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-[13px] font-semibold text-white shadow-lg shadow-rose-200 dark:shadow-rose-900/20 transition-all hover:-translate-y-0.5 hover:shadow-xl"
      >
        {buttonLabel}
      </Link>
    </section>
  );
}

type DashboardProfileCompletionStatCardProps = {
  hasPersistedProfile: boolean;
  initialCompletion: ProfileCompletionResult;
  animationDelayMs: number;
};

export function DashboardProfileCompletionStatCard({
  hasPersistedProfile,
  initialCompletion,
  animationDelayMs,
}: DashboardProfileCompletionStatCardProps) {
  const completion = useDashboardProfileCompletion(
    initialCompletion,
    hasPersistedProfile
  );

  return (
    <div
      className="ui-enter-scale ui-card-lift-soft group rounded-[16px] sm:rounded-[22px] border border-white/70 dark:border-slate-800/70 bg-white/88 dark:bg-slate-900/88 px-1 py-3 sm:px-4 sm:py-3 shadow-sm backdrop-blur-sm xl:rounded-none xl:border-0 xl:bg-transparent xl:dark:bg-transparent xl:px-5 xl:py-1 xl:shadow-none"
      style={{
        animationDelay: `${animationDelayMs}ms`,
        animationFillMode: "forwards",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="ui-icon-lift inline-flex h-6 w-6 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
        </div>
        <div className="mt-1.5 sm:mt-3 text-base sm:text-[1.5rem] font-display font-bold leading-none text-gray-900 dark:text-slate-100">
          {completion.percent}%
        </div>
        <p className="mt-1 sm:mt-2 text-[9px] sm:text-[11px] font-semibold tracking-tight sm:tracking-normal text-gray-900 dark:text-slate-100 leading-tight">
          <span className="sm:hidden">Complete</span>
          <span className="hidden sm:inline">Profile Complete</span>
        </p>
        <p className="hidden sm:block mt-1 text-[9px] leading-4 text-indigo-500 dark:text-indigo-400">
          {completion.completedCount}/5 sections done
        </p>
      </div>
    </div>
  );
}
