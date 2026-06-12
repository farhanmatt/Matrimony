"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import {
  getProfileCompletion,
  type ProfileCompletionResult,
  type ProfileCompletionSource,
} from "@/lib/utils/profileCompletion";

type CreateProfileDraft = {
  currentStep: number;
  values: Partial<ProfileCompletionSource>;
};

const CREATE_PROFILE_DRAFT_STORAGE_KEY = "vivah-bandhan-create-profile-draft";

function loadCreateProfileDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawDraft = window.localStorage.getItem(CREATE_PROFILE_DRAFT_STORAGE_KEY);
    if (!rawDraft) {
      return null;
    }

    return JSON.parse(rawDraft) as CreateProfileDraft;
  } catch {
    return null;
  }
}

function useDashboardProfileCompletion(
  initialCompletion: ProfileCompletionResult,
  hasPersistedProfile: boolean
) {
  const [completion, setCompletion] = useState(initialCompletion);

  useEffect(() => {
    if (hasPersistedProfile) {
      setCompletion(initialCompletion);
      return;
    }

    const syncDraftCompletion = () => {
      const draft = loadCreateProfileDraft();

      if (!draft?.values) {
        setCompletion(initialCompletion);
        return;
      }

      setCompletion(
        getProfileCompletion(draft.values, { hasPersistedProfile: false })
      );
    };

    syncDraftCompletion();
    window.addEventListener("focus", syncDraftCompletion);

    return () => {
      window.removeEventListener("focus", syncDraftCompletion);
    };
  }, [hasPersistedProfile, initialCompletion]);

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
    <section className="ui-card-lift-soft rounded-[14px] border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold leading-tight text-gray-900">
          Profile Completeness
        </h2>
        <p className="text-xs font-semibold text-gray-500">
          {completion.percent}% Complete
        </p>
      </div>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-rose-100">
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
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              ) : (
                <Circle className="h-4.5 w-4.5 text-amber-400" />
              )}
              <span className="text-[13px] text-gray-700">{item.label}</span>
            </div>
          </div>
        ))}
      </div>

      <Link
        href={buttonHref}
        className="ui-link-shift mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-[13px] font-semibold text-white shadow-lg shadow-rose-200 transition-all hover:-translate-y-0.5 hover:shadow-xl"
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
      className="ui-enter-scale ui-card-lift-soft group rounded-[22px] border border-white/70 bg-white/88 px-4 py-3 shadow-sm backdrop-blur-sm xl:rounded-none xl:border-0 xl:bg-transparent xl:px-5 xl:py-1 xl:shadow-none"
      style={{
        animationDelay: `${animationDelayMs}ms`,
        animationFillMode: "forwards",
      }}
    >
      <div className="flex flex-col items-center text-center">
        <div className="ui-icon-lift inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-500">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="mt-3 text-[1.5rem] font-display font-bold leading-none text-gray-900">
          {completion.percent}%
        </div>
        <p className="mt-2 text-[11px] font-semibold text-gray-900">
          Profile Complete
        </p>
        <p className="mt-1 text-[9px] leading-4 text-indigo-500">
          {completion.completedCount}/5 sections done
        </p>
      </div>
    </div>
  );
}
