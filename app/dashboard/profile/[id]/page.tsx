import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { formatDistanceToNow, subYears } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { ReactNode } from "react";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import { findUnlockForProfiles } from "@/lib/utils/matching";
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  ChevronsRight,
  Clock3,
  DatabaseZap,
  Globe2,
  GraduationCap,
  Home,
  Info,
  Leaf,
  MapPin,
  RefreshCw,
  Sparkles,
  UserCircle2,
  Users,
} from "lucide-react";
import {
  calculateAge,
  cmToFeetInches,
  FAMILY_STATUS_LABELS,
  FAMILY_TYPE_LABELS,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
  formatDate,
} from "@/lib/utils/helpers";
import ProfileCardToolbar from "@/components/profile/ProfileCardToolbar";
import ProfileDetailGallery from "@/components/profile/ProfileDetailGallery";

export const metadata: Metadata = {
  title: "Profile Details",
};

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type BrowseFilters = {
  gender?: string;
  search?: string;
  sort?: string;
  religion?: string;
  caste?: string;
  language?: string;
  maritalStatus?: string;
  location?: string;
  heightMin?: string;
  heightMax?: string;
  annualIncome?: string;
  education?: string;
  profession?: string;
  ageMin?: string;
  ageMax?: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildBrowseQueryString(page: number, filters: BrowseFilters) {
  const params = new URLSearchParams();
  params.set("source", "browse");
  params.set("page", String(page));

  if (filters.gender) params.set("gender", filters.gender);
  if (filters.search) params.set("search", filters.search);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.religion) params.set("religion", filters.religion);
  if (filters.caste) params.set("caste", filters.caste);
  if (filters.language) params.set("language", filters.language);
  if (filters.maritalStatus) params.set("maritalStatus", filters.maritalStatus);
  if (filters.location) params.set("location", filters.location);
  if (filters.heightMin) params.set("heightMin", filters.heightMin);
  if (filters.heightMax) params.set("heightMax", filters.heightMax);
  if (filters.annualIncome) params.set("annualIncome", filters.annualIncome);
  if (filters.education) params.set("education", filters.education);
  if (filters.profession) params.set("profession", filters.profession);
  if (filters.ageMin) params.set("ageMin", filters.ageMin);
  if (filters.ageMax) params.set("ageMax", filters.ageMax);

  return params.toString();
}

function getProfileAccessFallback(detailSource: string | undefined, browseBackHref: string) {
  if (detailSource === "browse") {
    return browseBackHref;
  }

  if (detailSource === "liked") {
    return "/dashboard/liked";
  }

  if (detailSource === "received-likes") {
    return "/dashboard/received-likes";
  }

  if (detailSource === "matches") {
    return "/dashboard/matches";
  }

  return "/dashboard/unlocked";
}

function buildBrowseWhere(userId: string, filters: BrowseFilters): Prisma.ProfileWhereInput {
  const searchFilter = filters.search
    ? {
        OR: [
          { fullName: { contains: filters.search, mode: "insensitive" as const } },
          { profession: { contains: filters.search, mode: "insensitive" as const } },
          { education: { contains: filters.search, mode: "insensitive" as const } },
          { location: { contains: filters.search, mode: "insensitive" as const } },
          { city: { contains: filters.search, mode: "insensitive" as const } },
          { state: { contains: filters.search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const dateOfBirthFilter =
    filters.ageMin || filters.ageMax
      ? {
          dateOfBirth: {
            ...(filters.ageMax && { gte: subYears(new Date(), Number(filters.ageMax)) }),
            ...(filters.ageMin && { lte: subYears(new Date(), Number(filters.ageMin)) }),
          },
        }
      : {};
  const heightFilter =
    filters.heightMin || filters.heightMax
      ? {
          height: {
            ...(filters.heightMin && { gte: Number(filters.heightMin) }),
            ...(filters.heightMax && { lte: Number(filters.heightMax) }),
          },
        }
      : {};

  return {
    status: "ACTIVE",
    userId: { not: userId },
    likesReceived: {
      none: {
        fromProfile: {
          userId,
        },
      },
    },
    ...(filters.gender ? { gender: filters.gender as never } : {}),
    ...searchFilter,
    ...(filters.religion ? { religion: filters.religion } : {}),
    ...(filters.caste
      ? { caste: { contains: filters.caste, mode: "insensitive" } }
      : {}),
    ...(filters.language
      ? { language: { contains: filters.language, mode: "insensitive" } }
      : {}),
    ...(filters.maritalStatus ? { maritalStatus: filters.maritalStatus as never } : {}),
    ...(filters.location
      ? {
          OR: [
            { location: { contains: filters.location, mode: "insensitive" } },
            { city: { contains: filters.location, mode: "insensitive" } },
            { state: { contains: filters.location, mode: "insensitive" } },
          ],
        }
      : {}),
    ...heightFilter,
    ...(filters.annualIncome
      ? { income: { contains: filters.annualIncome, mode: "insensitive" } }
      : {}),
    ...(filters.education
      ? { education: { contains: filters.education, mode: "insensitive" } }
      : {}),
    ...(filters.profession
      ? { profession: { contains: filters.profession, mode: "insensitive" } }
      : {}),
    ...dateOfBirthFilter,
  };
}

function buildBrowseOrderBy(sort?: string): Prisma.ProfileOrderByWithRelationInput {
  return sort === "youngest"
    ? { dateOfBirth: "desc" }
    : sort === "oldest"
      ? { dateOfBirth: "asc" }
      : sort === "name"
        ? { fullName: "asc" }
        : { createdAt: "desc" };
}

async function resolveOrigin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  if (!host) return "";

  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

function ProfileThumb({
  name,
  photo,
  size = "md",
}: {
  name: string;
  photo?: string | null;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div className={`relative overflow-hidden rounded-full bg-rose-50 ${dimension}`}>
      {photo ? (
        <>
          <Image
            src={photo}
            alt={name}
            fill
            className="object-cover"
            sizes="48px"
            unoptimized
            quality={100}
          />
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-rose-300">
          <UserCircle2 className={iconSize} />
        </div>
      )}
    </div>
  );
}

function getThumbnailPhoto(profile: {
  photos: { url: string; isPrimary: boolean }[];
  profileImage?: string | null;
  user?: { image?: string | null } | null;
  fullName: string;
}) {
  return (
    profile.photos.find((photo) => photo.isPrimary)?.url ??
    profile.photos[0]?.url ??
    profile.profileImage ??
    profile.user?.image ??
    null
  );
}

function hasValue(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (value instanceof Date) {
    return !Number.isNaN(value.getTime());
  }

  return true;
}

function normalizeText(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function textPreferenceMatches(candidate?: string | null, preference?: string | null) {
  if (!candidate || !preference) {
    return false;
  }

  const candidateValue = normalizeText(candidate);
  const preferenceValue = normalizeText(preference);

  return (
    candidateValue.includes(preferenceValue) ||
    preferenceValue.includes(candidateValue)
  );
}

function formatAgePreference(min?: number | null, max?: number | null) {
  if (!min && !max) {
    return null;
  }

  if (min && max) {
    return `${min} - ${max}`;
  }

  if (min) {
    return `${min}+`;
  }

  return `Up to ${max}`;
}

function formatHeightPreference(min?: number | null, max?: number | null) {
  if (!min && !max) {
    return null;
  }

  if (min && max) {
    return `${cmToFeetInches(min)} - ${cmToFeetInches(max)}`;
  }

  if (min) {
    return `${cmToFeetInches(min)} and above`;
  }

  return `Up to ${cmToFeetInches(max!)}`;
}

function buildProfilePhotoUrls(profile: {
  photos: { url: string; isPrimary: boolean }[];
  profileImage?: string | null;
  user?: { image?: string | null } | null;
}) {
  const orderedUrls = [
    profile.photos.find((photo) => photo.isPrimary)?.url ?? null,
    ...profile.photos.map((photo) => photo.url),
    profile.profileImage ?? null,
    profile.user?.image ?? null,
  ];

  return Array.from(
    new Set(
      orderedUrls.filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    )
  );
}

function ProfileInfoCard({
  id,
  icon,
  title,
  rows,
  footer,
  delayMs = 0,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  rows: { label: string; value?: ReactNode }[];
  footer?: ReactNode;
  delayMs?: number;
}) {
  const visibleRows = rows.filter((row) => hasValue(row.value));

  return (
    <section
      id={id}
      className="ui-enter-up ui-card-lift-soft scroll-mt-28 h-full overflow-hidden rounded-[20px] border border-rose-100/70 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
      style={{
        animationDelay: `${delayMs}ms`,
        animationFillMode: "forwards",
      }}
    >
      <div className="flex items-center gap-3 px-5 pt-5">
        <div className="ui-icon-lift flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
          {icon}
        </div>
        <h2 className="font-display text-[1.18rem] font-bold text-gray-900">
          {title}
        </h2>
      </div>
      <div className="space-y-4 p-5">
        {visibleRows.length > 0 ? (
          <div className="space-y-2.5">
            {visibleRows.map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0"
              >
                <span className="text-[13px] leading-6 text-gray-500">{row.label}</span>
                <div className="max-w-[58%] text-right text-[13px] font-medium leading-6 text-gray-900">
                  {row.value}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Details will appear here once added.</p>
        )}

        {footer ? (
          <div className="border-t border-gray-100 pt-3 text-sm leading-6 text-gray-600">
            {footer}
          </div>
        ) : null}
      </div>
    </section>
  );
}

type DetailProfile = Prisma.ProfileGetPayload<{
  include: {
    photos: true;
    user: {
      select: {
        image: true;
        role: true;
      };
    };
  };
}>;
type ViewerProfile = Prisma.ProfileGetPayload<{
  select: {
    id: true;
    preference: true;
  };
}>;
type ThumbProfile = {
  id: string;
  fullName: string;
  photos: { url: string; isPrimary: boolean }[];
  profileImage?: string | null;
  user?: { image?: string | null } | null;
};

export default async function ProfileDetailsPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const detailSource = firstValue(resolvedSearchParams.source);
  const browseContext = detailSource === "browse";
  const unlockedContext = detailSource === "unlocked";
  const browsePage = Math.max(1, Number(firstValue(resolvedSearchParams.page) ?? "1") || 1);
  const browseFilters: BrowseFilters = {
    gender: firstValue(resolvedSearchParams.gender),
    search: firstValue(resolvedSearchParams.search),
    sort: firstValue(resolvedSearchParams.sort),
    religion: firstValue(resolvedSearchParams.religion),
    caste: firstValue(resolvedSearchParams.caste),
    language: firstValue(resolvedSearchParams.language),
    maritalStatus: firstValue(resolvedSearchParams.maritalStatus),
    location: firstValue(resolvedSearchParams.location),
    heightMin: firstValue(resolvedSearchParams.heightMin),
    heightMax: firstValue(resolvedSearchParams.heightMax),
    annualIncome: firstValue(resolvedSearchParams.annualIncome),
    education: firstValue(resolvedSearchParams.education),
    profession: firstValue(resolvedSearchParams.profession),
    ageMin: firstValue(resolvedSearchParams.ageMin),
    ageMax: firstValue(resolvedSearchParams.ageMax),
  };
  const browseQueryString = browseContext
    ? buildBrowseQueryString(browsePage, browseFilters)
    : "";
  const browseBackHref = browseQueryString
    ? `/dashboard/browse?${browseQueryString}`
    : "/dashboard/browse";
  const backHref = unlockedContext ? "/dashboard/unlocked" : browseBackHref;
  const backLabel = unlockedContext
    ? "Back to Unlocked Profiles"
    : "Back to Browse Profiles";
  const buildDetailHref = (profileId: string) => {
    const query = browseQueryString ? `?${browseQueryString}` : "";
    return `/dashboard/profile/${profileId}${query}`;
  };
  let dbUnavailable = false;
  let ownProfile: ViewerProfile | null = null;
  let profile: DetailProfile | null = null;
  let hasUnlockedAccess = false;
  let browseProfiles:
    | {
        id: string;
        fullName: string;
        photos: { url: string; isPrimary: boolean }[];
      }[]
    = [];
  let browseTotalCount = 0;
  let browsePosition: number | null = null;
  let previousProfile: ThumbProfile | null = null;
  let nextProfile: ThumbProfile | null = null;
  let previousProfileHref: string | null = null;
  let nextProfileHref: string | null = null;
  let canViewDob = false;
  let age = 0;
  let displayLocation = "India";
  let profileUrl = "";
  let initialShortlisted = false;
  let downloadUrl = "";

  try {
    ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        preference: true,
      },
    });

    if (!ownProfile) {
      redirect("/dashboard/profile/create");
    }

    profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        photos: true,
        user: {
          select: {
            image: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      notFound();
    }
    const activeProfile = profile;

    hasUnlockedAccess =
      ownProfile.id === activeProfile.id ||
      Boolean(
        await findUnlockForProfiles(
          session.user.id,
          ownProfile.id,
          activeProfile.id
        )
      );

    if (!hasUnlockedAccess) {
      redirect(getProfileAccessFallback(detailSource, browseBackHref));
    }

    browseProfiles = browseContext
      ? await prisma.profile.findMany({
          where: buildBrowseWhere(session.user.id, browseFilters),
          include: {
            photos: true,
          },
          orderBy: buildBrowseOrderBy(browseFilters.sort),
          skip: (browsePage - 1) * 12,
          take: 12,
        })
      : [];
    browseTotalCount = browseContext
      ? await prisma.profile.count({
          where: buildBrowseWhere(session.user.id, browseFilters),
        })
      : 0;

    const browseIndex = browseProfiles.findIndex((candidate) => candidate.id === activeProfile.id);
    browsePosition =
      browseContext && browseIndex >= 0
        ? Math.min(browseTotalCount, (browsePage - 1) * 12 + browseIndex + 1)
        : null;
    previousProfile = browseIndex > 0 ? browseProfiles[browseIndex - 1] : null;
    nextProfile =
      browseIndex >= 0 && browseIndex < browseProfiles.length - 1
        ? browseProfiles[browseIndex + 1]
        : null;

    previousProfileHref = previousProfile ? buildDetailHref(previousProfile.id) : null;
    nextProfileHref = nextProfile ? buildDetailHref(nextProfile.id) : null;

    canViewDob = true;

    age = calculateAge(activeProfile.dateOfBirth);
    displayLocation =
      [activeProfile.city, activeProfile.state].filter(Boolean).join(", ") ||
      activeProfile.location ||
      "India";
    const origin = await resolveOrigin();
    profileUrl = origin
      ? `${origin}/dashboard/profile/${activeProfile.id}`
      : `/dashboard/profile/${activeProfile.id}`;
    downloadUrl = `/api/profiles/download?id=${encodeURIComponent(activeProfile.id)}`;
    initialShortlisted = Boolean(
      await prisma.like.findUnique({
        where: {
          fromProfileId_toProfileId: {
            fromProfileId: ownProfile.id,
            toProfileId: activeProfile.id,
          },
        },
      })
    );
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      dbUnavailable = true;
    } else {
      throw error;
    }
  }

  if (dbUnavailable) {
    return (
      <div className="ui-enter-scale ui-card-lift-soft rounded-3xl border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <div className="ui-soft-float flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <DatabaseZap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h2 className="mb-2 text-xl font-display font-bold text-gray-900">
              Database connection unavailable
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-gray-600">
              We could not reach the database right now, so this profile page is temporarily unavailable.
            </p>
            <p className="mt-2 text-sm leading-6 text-gray-500">
              Please check your database connection and refresh the page.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/dashboard/profile/${id}`}
                className="ui-link-shift inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </Link>
              <Link
                href="/dashboard"
                className="ui-link-shift inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-rose-300 hover:text-rose-600"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ownProfile || !profile) {
    return null;
  }

  const photoUrls = buildProfilePhotoUrls(profile);
  const completionFields = [
    profile.fullName,
    profile.gender,
    profile.dateOfBirth,
    profile.height,
    profile.maritalStatus,
    profile.profession,
    profile.education,
    profile.income,
    profile.religion,
    profile.caste,
    profile.subCaste,
    profile.language,
    profile.city,
    profile.state,
    profile.country,
    profile.houseNumber,
    profile.streetName,
    profile.phone,
    profile.course,
    profile.employedIn,
    profile.fatherName,
    profile.motherName,
    profile.familyType,
    profile.familyStatus,
    profile.star,
    profile.rasi,
    profile.timeOfBirth,
    profile.placeOfBirth,
    photoUrls.length > 0 ? "photo" : null,
    profile.horoscopeImage,
  ];
  const profileCompletionScore = Math.round(
    (completionFields.filter(hasValue).length / completionFields.length) * 100
  );
  const lastActiveLabel = formatDistanceToNow(new Date(profile.updatedAt), {
    addSuffix: true,
  });
  const showHoroscopeSection = Boolean(
    profile.religion === "Hindu" ||
      profile.star ||
      profile.rasi ||
      profile.timeOfBirth ||
      profile.placeOfBirth ||
      profile.horoscopeImage
  );
  const sectionLinks = [
    { id: "about", label: "About" },
    { id: "family", label: "Family" },
    { id: "education", label: "Education & Career" },
    { id: "lifestyle", label: "Lifestyle" },
    ...(showHoroscopeSection ? [{ id: "horoscope", label: "Horoscope" }] : []),
  ];
  const primarySummary = profile.profession || profile.education || "Matrimony Member";
  const secondarySummary = profile.course || profile.education;
  const quickFacts = [
    profile.height ? cmToFeetInches(profile.height) : null,
    profile.religion,
    MARITAL_STATUS_LABELS[profile.maritalStatus],
  ].filter((value): value is string => Boolean(value));
  const showNewBadge =
    Date.now() - new Date(profile.createdAt).getTime() <=
    1000 * 60 * 60 * 24 * 14;
  const showOnlineBadge =
    Date.now() - new Date(profile.updatedAt).getTime() <=
    1000 * 60 * 60 * 24;
  const extraPhotoCount = Math.max(photoUrls.length - 5, 0);
  const heroBadgeLabel =
    ownProfile.id !== profile.id ? "Unlocked" : showNewBadge ? "New" : null;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div
        className="ui-enter-up flex items-center"
        style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
      >
        <Link
          href={backHref}
          className="ui-link-shift inline-flex items-center gap-2 text-[15px] font-medium text-slate-600 transition-colors hover:text-rose-600"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-5 self-start xl:sticky xl:top-[92px]">
          <div
            className="ui-enter-left"
            style={{ animationDelay: "90ms", animationFillMode: "forwards" }}
          >
            <ProfileDetailGallery
              name={profile.fullName}
              photoUrls={photoUrls}
              isNew={showNewBadge}
              isOnline={showOnlineBadge}
              extraPhotoCount={extraPhotoCount}
            />
          </div>

          <section
            className="ui-enter-left ui-card-lift-soft rounded-[20px] border border-rose-100 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.05)]"
            style={{ animationDelay: "150ms", animationFillMode: "forwards" }}
          >
            <div className="text-[1.06rem] font-semibold text-slate-900">
              <span className="font-bold text-rose-600">
                {profileCompletionScore}%
              </span>{" "}
              Profile Completion
            </div>

            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-rose-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-700"
                style={{ width: `${profileCompletionScore}%` }}
              />
            </div>

            <p className="mt-4 text-[13px] leading-6 text-gray-500">
              Based on the fields completed in this profile.
            </p>

            <div className="mt-4 space-y-3 text-[14px] text-slate-600">
              <div className="flex items-center gap-2.5">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Lives in {displayLocation}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 text-slate-400" />
                <span>Last active {lastActiveLabel}</span>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section
            className="ui-enter-up ui-card-lift-soft relative z-10 overflow-visible rounded-[10px] border border-rose-100/70 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]"
            style={{ animationDelay: "110ms", animationFillMode: "forwards" }}
          >
            <div className="p-6 sm:p-7">
              <div className="flex flex-col gap-8 xl:grid xl:grid-cols-[minmax(0,1fr)_336px] xl:items-end">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-[2.2rem] font-bold leading-[0.95] tracking-[-0.03em] text-slate-900 sm:text-[2.75rem]">
                      {profile.fullName}, {age}
                    </h1>
                    <BadgeCheck className="ui-icon-lift h-5 w-5 text-emerald-500" />
                    {heroBadgeLabel ? (
                      <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600">
                        {heroBadgeLabel}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-2 text-[1.18rem] font-medium text-slate-700">
                    {primarySummary}
                  </p>

                  <div className="mt-5 space-y-3 text-[15px] text-slate-600">
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-slate-400" />
                      <span>{displayLocation}</span>
                    </div>
                    {secondarySummary ? (
                      <div className="flex items-center gap-2.5">
                        <GraduationCap className="h-4 w-4 text-slate-400" />
                        <span>{secondarySummary}</span>
                      </div>
                    ) : null}
                    {quickFacts.length > 0 ? (
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-4 w-4 text-rose-400" />
                        <div className="flex flex-wrap items-center gap-2 text-[15px] text-slate-600">
                          {quickFacts.map((fact, index) => (
                            <div key={fact} className="inline-flex items-center gap-2">
                              {index > 0 ? (
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                              ) : null}
                              <span>{fact}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="xl:self-end">
                  <ProfileCardToolbar
                    profileName={profile.fullName}
                    profileUrl={profileUrl}
                    downloadUrl={downloadUrl}
                    downloadFilename={`${profile.fullName.replace(/\s+/g, "-").toLowerCase()}-profile.pdf`}
                    canDownloadProfile={canViewDob}
                  />
                </div>
              </div>

            </div>
          </section>

          <section
            className="ui-enter-up ui-card-lift-soft overflow-hidden rounded-[20px] border border-rose-100/70 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.05)]"
            style={{ animationDelay: "180ms", animationFillMode: "forwards" }}
          >
            <div className="flex flex-wrap items-center gap-8 border-b border-gray-100 px-5 sm:px-6">
              {sectionLinks.map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`ui-link-shift -mb-px border-b-2 pb-4 pt-5 text-[15px] font-medium transition-colors ${
                    index === 0
                      ? "border-rose-500 text-rose-600"
                      : "border-transparent text-slate-500 hover:text-rose-600"
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              <div className="grid auto-rows-fr gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <ProfileInfoCard
                  id="about"
                  icon={<Info className="h-5 w-5" />}
                  title="Basic Information"
                  delayMs={220}
                  rows={[
                    { label: "Gender", value: GENDER_LABELS[profile.gender] },
                    { label: "Age", value: `${age} years` },
                    {
                      label: "Date of Birth",
                      value: canViewDob
                        ? formatDate(profile.dateOfBirth)
                        : "Unlock to view exact DOB",
                    },
                    {
                      label: "Phone Number",
                      value: canViewDob
                        ? profile.phone ? (
                            <a
                              href={`tel:${profile.phone}`}
                              className="text-rose-600 transition-colors hover:text-rose-700"
                            >
                              {profile.phone}
                            </a>
                          ) : (
                            "Phone not added"
                          )
                        : "Unlock to view contact number",
                    },
                    {
                      label: "Height",
                      value: profile.height ? cmToFeetInches(profile.height) : null,
                    },
                    {
                      label: "Marital Status",
                      value: MARITAL_STATUS_LABELS[profile.maritalStatus],
                    },
                    { label: "Religion", value: profile.religion },
                    { label: "Mother Tongue", value: profile.language },
                    { label: "Location", value: displayLocation },
                  ]}
                />

                <ProfileInfoCard
                  id="family"
                  icon={<Users className="h-5 w-5" />}
                  title="Family Details"
                  delayMs={280}
                  rows={[
                    { label: "Father's Name", value: profile.fatherName },
                    { label: "Mother's Name", value: profile.motherName },
                    {
                      label: "Family Type",
                      value: profile.familyType
                        ? FAMILY_TYPE_LABELS[profile.familyType]
                        : null,
                    },
                    {
                      label: "Family Status",
                      value: profile.familyStatus
                        ? FAMILY_STATUS_LABELS[profile.familyStatus]
                        : null,
                    },
                    {
                      label: "Siblings",
                      value:
                        profile.siblings !== null ? String(profile.siblings) : null,
                    },
                  ]}
                />

                <ProfileInfoCard
                  id="education"
                  icon={<Briefcase className="h-5 w-5" />}
                  title="Education & Career"
                  delayMs={340}
                  rows={[
                    { label: "Education", value: profile.education },
                    { label: "Course", value: profile.course },
                    { label: "Profession", value: profile.profession },
                    { label: "Employed In", value: profile.employedIn },
                    { label: "Annual Income", value: profile.income },
                  ]}
                />

                <ProfileInfoCard
                  id="lifestyle"
                  icon={<Leaf className="h-5 w-5" />}
                  title="Lifestyle"
                  delayMs={400}
                  rows={[
                    { label: "Diet", value: profile.diet },
                    { label: "Smoking", value: profile.smoking },
                    { label: "Drinking", value: profile.drinking },
                    { label: "Hobbies", value: profile.hobbies },
                    {
                      label: "Physical Activity",
                      value: profile.physicalActivity,
                    },
                    {
                      label: "Personality Type",
                      value: profile.personalityType,
                    },
                  ]}
                />

                <ProfileInfoCard
                  id="culture"
                  icon={<Globe2 className="h-5 w-5" />}
                  title="Religious & Cultural Background"
                  delayMs={460}
                  rows={[
                    { label: "Religion", value: profile.religion },
                    { label: "Caste", value: profile.caste },
                    { label: "Sub Caste", value: profile.subCaste },
                    { label: "Mother Tongue", value: profile.language },
                    { label: "City", value: profile.city },
                    { label: "State", value: profile.state },
                  ]}
                />

                {showHoroscopeSection ? (
                  <ProfileInfoCard
                    id="horoscope"
                    icon={<Sparkles className="h-5 w-5" />}
                    title="Horoscope Details"
                    delayMs={520}
                    footer={
                      profile.horoscopeImage ? (
                        <a
                          href={profile.horoscopeImage}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 font-medium text-rose-600 hover:text-rose-700"
                        >
                          View Full Horoscope
                          <ChevronsRight className="h-4 w-4" />
                        </a>
                      ) : undefined
                    }
                    rows={[
                      { label: "Rasi / Moon Sign", value: profile.rasi },
                      { label: "Nakshatra", value: profile.star },
                      { label: "Time of Birth", value: profile.timeOfBirth },
                      { label: "Place of Birth", value: profile.placeOfBirth },
                    ]}
                  />
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

