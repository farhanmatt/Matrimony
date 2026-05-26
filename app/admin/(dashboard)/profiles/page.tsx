import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AdminListCard from "@/components/admin/AdminListCard";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminPageSizeSelector from "@/components/admin/AdminPageSizeSelector";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminProfileFilters from "@/components/admin/AdminProfileFilters";
import AdminProfileStatusQuickLinks from "@/components/admin/AdminProfileStatusQuickLinks";
import AdminColumnSelector, {
  type AdminProfileColumnKey,
} from "@/components/admin/AdminColumnSelector";
import AdminPreviewableImage from "@/components/admin/AdminPreviewableImage";
import AdminProfileRowActions from "@/components/admin/AdminProfileRowActions";
import AdminSelectableProfilesTable from "@/components/admin/AdminSelectableProfilesTable";
import StatusBadge from "@/components/common/StatusBadge";
import { formatDate, calculateAge, GENDER_LABELS, getInitials } from "@/lib/utils/helpers";
import {
  BriefcaseBusiness,
  CalendarDays,
  Cake,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  GraduationCap,
  Heart,
  Home,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  Crown,
  UserRound,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import { subYears } from "date-fns";

export const metadata: Metadata = { title: "Manage Profiles — Admin" };

function formatHeight(height: number | null) {
  if (height == null) return "Not added";
  const feet = Math.floor(height / 30.48);
  const inches = Math.round((height / 30.48 - feet) * 12);
  return `${height.toFixed(0)} cm (${feet}'${inches}")`;
}

const PROFILE_COLUMN_KEYS = [
  "profile",
  "basicInfo",
  "community",
  "location",
  "career",
  "contact",
  "plan",
  "status",
  "joined",
  "actions",
] as const;

const DEFAULT_PROFILE_COLUMN_KEYS: AdminProfileColumnKey[] = [
  "profile",
  "basicInfo",
  "community",
  "location",
  "career",
  "contact",
  "status",
  "actions",
];

const PROFILE_COLUMNS_COOKIE = "admin_profiles_columns";

function parseProfileColumns(raw: string | undefined): AdminProfileColumnKey[] {
  if (!raw) return [...DEFAULT_PROFILE_COLUMN_KEYS];

  const legacyMap: Partial<Record<string, AdminProfileColumnKey>> = {
    name: "profile",
    gender: "basicInfo",
    details: "community",
    email: "contact",
    created: "joined",
  };

  const selected = raw
    .split(",")
    .map((value) => value.trim())
    .map((value) => {
      const legacyValue = legacyMap[value];
      if (legacyValue) {
        return legacyValue;
      }

      return (PROFILE_COLUMN_KEYS as readonly string[]).includes(value)
        ? (value as AdminProfileColumnKey)
        : null;
    })
    .filter((value): value is AdminProfileColumnKey => value !== null);

  return selected.length > 0 ? selected : [...DEFAULT_PROFILE_COLUMN_KEYS];
}

type ProfileRow = {
  id: string;
  fullName: string;
  profileImage: string | null;
  phone: string | null;
  gender: string;
  dateOfBirth: Date;
  height: number | null;
  maritalStatus: string;
  city: string | null;
  location: string | null;
  state: string | null;
  country: string;
  religion: string | null;
  caste: string | null;
  education: string | null;
  profession: string | null;
  income: string | null;
  isPaidProfile: boolean;
  status: string;
  createdAt: Date;
  user: { email: string };
};

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    gender?: string;
    status?: string;
    view?: string;
    religion?: string;
    maritalStatus?: string;
    location?: string;
    ageMin?: string;
    ageMax?: string;
    heightMin?: string;
    heightMax?: string;
    education?: string;
    profession?: string;
    income?: string;
    columns?: string;
    column?: string;
    limit?: string;
  }>;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);
  const search = sp.search ?? "";
  const gender = sp.gender ?? "";
  const status = sp.status ?? "";
  const religion = sp.religion ?? "";
  const maritalStatus = sp.maritalStatus ?? "";
  const location = sp.location ?? "";
  const ageMin = sp.ageMin ? parseInt(sp.ageMin, 10) : undefined;
  const ageMax = sp.ageMax ? parseInt(sp.ageMax, 10) : undefined;
  const heightMin = sp.heightMin ? parseFloat(sp.heightMin) : undefined;
  const heightMax = sp.heightMax ? parseFloat(sp.heightMax) : undefined;
  const education = sp.education ?? "";
  const profession = sp.profession ?? "";
  const income = sp.income ?? "";
  const limit = [10, 20, 50].includes(Number(sp.limit)) ? Number(sp.limit) : 20;
  const view = sp.view ?? "";
  const isDeletedView = view === "deleted";
  const isBlockedView = view === "blocked";
  const showBackToProfiles = isDeletedView || isBlockedView;
  const pageTitle = isDeletedView ? "Deleted Profiles" : isBlockedView ? "Blocked Profiles" : "Manage Profiles";
  const pageDescription = isDeletedView
    ? "Profiles marked as deleted stay visible here for admin review."
    : isBlockedView
      ? "Profiles marked as blocked stay visible here for admin review."
      : "View and manage all profiles from one place.";
  const cookieStore = await cookies();
  const storedColumns = cookieStore.get(PROFILE_COLUMNS_COOKIE)?.value;
  const selectedColumns = parseProfileColumns(sp.columns ?? sp.column ?? storedColumns);
  const listReturnParams = new URLSearchParams();
  const preservedParams: Array<[string, string | undefined]> = [
    ["page", sp.page],
    ["search", sp.search],
    ["gender", sp.gender],
    ["status", sp.status],
    ["religion", sp.religion],
    ["maritalStatus", sp.maritalStatus],
    ["location", sp.location],
    ["ageMin", sp.ageMin],
    ["ageMax", sp.ageMax],
    ["heightMin", sp.heightMin],
    ["heightMax", sp.heightMax],
    ["education", sp.education],
    ["profession", sp.profession],
    ["income", sp.income],
    ["view", sp.view],
    ["limit", sp.limit],
  ];
  preservedParams.forEach(([key, value]) => {
    if (value) {
      listReturnParams.set(key, value);
    }
  });
  listReturnParams.set("columns", selectedColumns.join(","));
  const listReturnHref = listReturnParams.toString()
    ? `/admin/profiles?${listReturnParams.toString()}`
    : "/admin/profiles";
  const buildViewHref = (nextView: "blocked" | "deleted") => {
    const params = new URLSearchParams();
    const filterParams: Array<[string, string | undefined]> = [
      ["search", sp.search],
      ["gender", sp.gender],
      ["religion", sp.religion],
      ["maritalStatus", sp.maritalStatus],
      ["location", sp.location],
      ["ageMin", sp.ageMin],
      ["ageMax", sp.ageMax],
      ["heightMin", sp.heightMin],
      ["heightMax", sp.heightMax],
      ["education", sp.education],
      ["profession", sp.profession],
      ["income", sp.income],
      ["limit", sp.limit ?? String(limit)],
      ["columns", selectedColumns.join(",")],
      ["view", nextView],
    ];

    filterParams.forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return `/admin/profiles?${params.toString()}`;
  };
  const buildPageHref = (nextPage: number) => {
    const params = new URLSearchParams();
    const filterParams: Array<[string, string | undefined]> = [
      ["search", sp.search],
      ["gender", sp.gender],
      ["status", sp.status],
      ["religion", sp.religion],
      ["maritalStatus", sp.maritalStatus],
      ["location", sp.location],
      ["ageMin", sp.ageMin],
      ["ageMax", sp.ageMax],
      ["heightMin", sp.heightMin],
      ["heightMax", sp.heightMax],
      ["education", sp.education],
      ["profession", sp.profession],
      ["income", sp.income],
      ["view", sp.view],
      ["limit", sp.limit ?? String(limit)],
      ["columns", selectedColumns.join(",")],
      ["page", String(nextPage)],
    ];

    filterParams.forEach(([key, value]) => {
      if (value) params.set(key, value);
    });

    return `?${params.toString()}`;
  };
  const where: Prisma.ProfileWhereInput = {};
  const andConditions: Prisma.ProfileWhereInput[] = [];

  if (search) {
    andConditions.push({
      OR: [
        { fullName: { contains: search, mode: "insensitive" as const } },
        { location: { contains: search, mode: "insensitive" as const } },
      ],
    });
  }

  if (gender) {
    andConditions.push({ gender: gender as "MALE" | "FEMALE" | "OTHER" });
  }

  if (isDeletedView) {
    andConditions.push({ status: "INACTIVE" as never });
  } else if (isBlockedView) {
    andConditions.push({ status: "SUSPENDED" as never });
  } else if (status) {
    andConditions.push({ status: status as never });
  }

  if (religion) {
    andConditions.push({ religion: { contains: religion, mode: "insensitive" as const } });
  }

  if (maritalStatus) {
    andConditions.push({ maritalStatus: maritalStatus as never });
  }

  if (location) {
    andConditions.push({
      OR: [
        { location: { contains: location, mode: "insensitive" as const } },
        { city: { contains: location, mode: "insensitive" as const } },
        { state: { contains: location, mode: "insensitive" as const } },
      ],
    });
  }

  if (ageMin || ageMax) {
    const dateOfBirthFilter: Prisma.DateTimeFilter = {};
    if (ageMax) {
      dateOfBirthFilter.gte = subYears(new Date(), ageMax);
    }
    if (ageMin) {
      dateOfBirthFilter.lte = subYears(new Date(), ageMin);
    }
    andConditions.push({ dateOfBirth: dateOfBirthFilter });
  }

  if (heightMin || heightMax) {
    const heightFilter: Prisma.FloatNullableFilter = {};
    if (heightMin) {
      heightFilter.gte = heightMin;
    }
    if (heightMax) {
      heightFilter.lte = heightMax;
    }
    andConditions.push({ height: heightFilter });
  }

  if (education) {
    andConditions.push({ education: { contains: education, mode: "insensitive" as const } });
  }

  if (profession) {
    andConditions.push({ profession: { contains: profession, mode: "insensitive" as const } });
  }

  if (income) {
    andConditions.push({ income: { contains: income, mode: "insensitive" as const } });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  try {
    const [profiles, total] = await Promise.all([
    prisma.profile.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: {
            email: true,
            name: true,
            image: true,
            emailVerified: true,
            payments: { select: { status: true } },
          },
        },
        photos: { where: { isPrimary: true }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
      prisma.profile.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

  const paginationFooter =
    totalPages > 0 ? (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-slate-700">{total} total profiles</span>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <AdminProfileStatusQuickLinks
            items={[
              {
                label: "Blocked Profiles",
                href: buildViewHref("blocked"),
                active: isBlockedView,
                icon: "blocked",
              },
              {
                label: "Deleted Profiles",
                href: buildViewHref("deleted"),
                active: isDeletedView,
                icon: "deleted",
              },
            ]}
          />

          <AdminPageSizeSelector value={limit} />

          <div className="flex items-center gap-2">
            <a
              href={buildPageHref(Math.max(1, page - 1))}
              aria-label="Previous page"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-gray-400 transition-colors ${
                page === 1 ? "pointer-events-none opacity-40" : "hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
            </a>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-sm font-medium text-gray-700">
              {page}
            </div>

            <span className="text-sm text-gray-500">of {totalPages || 1}</span>

            <a
              href={buildPageHref(Math.min(totalPages || 1, page + 1))}
              aria-label="Next page"
              className={`flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200 bg-white text-gray-400 transition-colors ${
                page >= totalPages
                  ? "pointer-events-none opacity-40"
                  : "hover:border-gray-300 hover:text-gray-700"
              }`}
            >
              <ChevronRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    ) : null;

  const profileColumns: Array<{
    key: Exclude<AdminProfileColumnKey, "all">;
    label: string;
    render: (profile: ProfileRow) => ReactNode;
  }> = [
    {
      key: "profile",
      label: "Profile",
      render: (profile) => (
        <div className="flex items-start gap-2 sm:gap-2.5">
          {profile.profileImage ? (
            <AdminPreviewableImage
              src={profile.profileImage}
              alt={profile.fullName}
              className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100 cursor-zoom-in sm:h-10 sm:w-10"
              imageClassName="object-cover object-[50%_15%]"
              sizes="40px"
            />
          ) : (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-rose-100 via-white to-pink-100 shadow-sm ring-1 ring-slate-100 sm:h-10 sm:w-10">
              <div className="flex h-full w-full items-center justify-center bg-slate-50 text-[10px] font-semibold text-slate-500">
                {getInitials(profile.fullName)}
              </div>
            </div>
          )}

          <div className="min-w-0">
            <div className="break-words text-[15px] font-semibold leading-tight text-gray-900">
              {profile.fullName}
            </div>
            <div className="break-words text-[11px] leading-tight text-gray-500">
              {calculateAge(profile.dateOfBirth)} years, {GENDER_LABELS[profile.gender] ?? profile.gender}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "basicInfo",
      label: "Basic Info",
      render: (profile) => (
        <div className="space-y-0.5 text-[12px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <UserRound className="h-3 w-3" />
            </span>
            <span className="break-words">{GENDER_LABELS[profile.gender] ?? profile.gender}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Cake className="h-3 w-3" />
            </span>
            <span className="break-words">{calculateAge(profile.dateOfBirth)} years</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Ruler className="h-3 w-3" />
            </span>
            <span className="break-words">{formatHeight(profile.height)}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Heart className="h-3 w-3" />
            </span>
            <span className="break-words">{profile.maritalStatus}</span>
          </div>
        </div>
      ),
    },
    {
      key: "community",
      label: "Community",
      render: (profile) => (
        <div className="space-y-0.5 text-[12px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Home className="h-3 w-3" />
            </span>
            <span className="break-words">{profile.religion ?? "Not added"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <ContactRound className="h-3 w-3" />
            </span>
            <span className="break-words">{profile.caste ?? "Not added"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      render: (profile) => (
        <div className="space-y-0.5 text-[12px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <MapPin className="h-3 w-3" />
            </span>
            <span className="break-words">{profile.city ?? "Not added"}</span>
          </div>
          <div className="pl-5 break-words text-[12px] text-gray-500">{profile.state ?? "Not added"}</div>
          <div className="pl-5 break-words text-[12px] text-gray-500">{profile.country ?? "India"}</div>
        </div>
      ),
    },
    {
      key: "career",
      label: "Career",
      render: (profile) => (
        <div className="space-y-0.5 text-[12px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <BriefcaseBusiness className="h-3 w-3" />
            </span>
            <span className="break-words font-medium text-[12px] text-gray-900">
              {profile.profession ?? "Not added"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <GraduationCap className="h-3 w-3" />
            </span>
            <span className="break-words text-xs text-gray-500">{profile.education ?? "Not added"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <BriefcaseBusiness className="h-3 w-3" />
            </span>
            <span className="break-words text-xs text-gray-500">Income: {profile.income ?? "Not added"}</span>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      label: "Contact",
      render: (profile) => (
        <div className="space-y-0.5 text-[12px] text-gray-600">
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Phone className="h-3 w-3" />
            </span>
            <span className="break-words">{profile.phone ?? "Not added"}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Mail className="h-3 w-3" />
            </span>
            <span className="break-words text-xs text-gray-500">{profile.user.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: "plan",
      label: "Plan",
      render: (profile) => (
        <div className="space-y-1 text-[12px] text-gray-600">
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <Crown className="h-3 w-3" />
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">Plan Type:</span>
            <span className="inline-flex w-fit rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-700">
              {profile.isPaidProfile ? "Premium" : "Free"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <CalendarDays className="h-3 w-3" />
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">Expiry Date:</span>
            <span className="text-[12px] text-gray-700">Not available</span>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (profile) => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 whitespace-nowrap">
            <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-gray-400">
              <ShieldCheck className="h-3 w-3" />
            </span>
            <StatusBadge status={profile.status} />
          </div>
          <span className="inline-flex w-fit whitespace-nowrap rounded-full bg-gray-100 px-2 py-0.5 text-[12px] font-semibold text-gray-700">
            {profile.isPaidProfile ? "Verified" : "Not Verified"}
          </span>
        </div>
      ),
    },
    {
      key: "joined",
      label: "Joined",
      render: (profile) => (
        <div className="flex items-center gap-1 whitespace-nowrap text-[12px] text-gray-500">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span>{formatDate(profile.createdAt)}</span>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (profile) => (
        <AdminProfileRowActions
          profileId={profile.id}
          profileStatus={profile.status}
          viewHref={`/admin/profiles/${profile.id}?returnTo=${encodeURIComponent(listReturnHref)}`}
          mode={isDeletedView ? "deleted" : isBlockedView ? "blocked" : "default"}
        />
      ),
    },
  ];

  const visibleColumns =
    profileColumns.filter((column) => selectedColumns.includes(column.key));

  const profileColumnWidths: Record<Exclude<AdminProfileColumnKey, "all">, string> = {
    profile: "20%",
    basicInfo: "12%",
    community: "12%",
    location: "14%",
    career: "14%",
    contact: "14%",
    plan: "7%",
    status: "12%",
    joined: "9%",
    actions: "6%",
  };

  const getColumnWidth = (key: Exclude<AdminProfileColumnKey, "all">) =>
    visibleColumns.length === 1 ? "100%" : profileColumnWidths[key];

  const profileTableRows = profiles.map((profile) => {
    const profileData = profile as typeof profile & { phone?: string | null };

    return {
      id: profile.id,
      href: `/admin/profiles/${profile.id}?returnTo=${encodeURIComponent(listReturnHref)}`,
      cells: visibleColumns.map((column) => {
        const row = {
          id: profile.id,
          fullName: profile.fullName,
          profileImage: profile.profileImage ?? profile.photos[0]?.url ?? null,
          phone: profileData.phone ?? null,
          gender: profile.gender,
          dateOfBirth: profile.dateOfBirth,
          height: profile.height,
          maritalStatus: profile.maritalStatus,
          status: profile.status,
          location: profile.location,
          city: profile.city,
          state: profile.state,
          country: profile.country,
          religion: profile.religion,
          caste: profile.caste,
          education: profile.education,
          profession: profile.profession,
          income: profile.income,
          isPaidProfile: profile.user.payments.some((payment) => payment.status === "PAID"),
          user: {
            email: profile.user.email,
            name: profile.user.name,
            image: profile.user.image,
          },
          createdAt: profile.createdAt,
        } as ProfileRow;

        return column.render(row);
      }),
    };
  });

    return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col gap-6 overflow-hidden sm:h-[calc(100dvh-6.5rem)] lg:h-[calc(100dvh-3rem)]">
      <div className="shrink-0">
        {showBackToProfiles ? (
          <Link
            href="/admin/profiles"
            className="mb-4 inline-flex h-11 items-center gap-2 rounded-full border border-rose-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Profiles
          </Link>
        ) : null}
        <h1 className="text-2xl font-display font-bold text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-gray-500">{pageDescription}</p>
      </div>

      <div className="shrink-0 border-t border-gray-200" />

      <AdminListCard
        className="flex-1 min-h-0"
        bodyClassName="flex min-h-0 flex-col overflow-hidden"
        toolbar={
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <AdminSearchInput placeholder="Search by name or location..." />

            <div className="flex items-center gap-3 xl:ml-auto">
              <AdminProfileFilters />
              <AdminColumnSelector selectedColumns={selectedColumns} />
            </div>
          </div>
        }
      >
        <AdminSelectableProfilesTable
          columns={visibleColumns.map((column) => ({
            key: column.key,
            label: column.label,
            width: getColumnWidth(column.key),
          }))}
          rows={profileTableRows}
          listFooter={paginationFooter}
        />
      </AdminListCard>
    </div>
    );
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900">Manage Profiles</h1>
          <p className="mt-1 text-sm text-gray-500">Unable to load profiles right now.</p>
        </div>

        <div className="border-t border-gray-200" />

        <AdminDatabaseUnavailableState
          title="Profiles unavailable"
          description="We couldn't reach the database to load the profile list."
        />
      </div>
    );
  }
}

