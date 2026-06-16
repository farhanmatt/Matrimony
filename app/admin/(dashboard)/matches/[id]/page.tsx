import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminMatchDetailActions from "@/components/admin/AdminMatchDetailActions";
import AdminPreviewableImage from "@/components/admin/AdminPreviewableImage";
import StatusBadge from "@/components/common/StatusBadge";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Ruler,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  calculateAge,
  cmToFeetInches,
  formatDate,
  GENDER_LABELS,
  MARITAL_STATUS_LABELS,
} from "@/lib/utils/helpers";

export const metadata: Metadata = {
  title: "Match Details - Admin",
};

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value: string | undefined) {
  if (!value) return "/admin/matches";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin/matches";
  return value;
}

function fieldValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "Not added";
  if (typeof value === "string" && value.trim().length === 0) return "Not added";
  return String(value);
}

function getPrimaryPhoto(profile: {
  profileImage: string | null;
  user: { image: string | null };
  photos: Array<{ url: string; isPrimary: boolean }>;
}) {
  return (
    profile.photos.find((photo) => photo.isPrimary)?.url ??
    profile.photos[0]?.url ??
    profile.profileImage ??
    profile.user.image ??
    null
  );
}

function ProfileCard({
  profile,
  title,
}: {
  profile: {
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
    status: string;
    createdAt: Date;
    user: { name: string | null; email: string; image: string | null };
    photos: Array<{ url: string; isPrimary: boolean }>;
  };
  title: string;
}) {
  const photo = getPrimaryPhoto(profile);
  const age = calculateAge(profile.dateOfBirth);
  const location =
    [profile.city, profile.state].filter(Boolean).join(", ") ||
    profile.location ||
    profile.country ||
    "India";
  const isProfileA = title === "Profile A";
  const accent = isProfileA
    ? {
        titlePill: "bg-blue-50 text-blue-600 border-blue-100",
        panel: "from-blue-50/90 via-white to-white",
        ring: "ring-blue-100",
        icon: "text-blue-500",
        soft: "bg-blue-50/70",
        softBorder: "border-blue-100",
        badge: "text-blue-600",
      }
    : {
        titlePill: "bg-pink-50 text-pink-600 border-pink-100",
        panel: "from-pink-50/90 via-white to-white",
        ring: "ring-pink-100",
        icon: "text-pink-500",
        soft: "bg-pink-50/70",
        softBorder: "border-pink-100",
        badge: "text-pink-600",
      };

  const contactRows = [
    { icon: Phone, value: fieldValue(profile.phone) },
    { icon: Mail, value: profile.user.email },
    { icon: MapPin, value: location },
    { icon: CalendarDays, value: formatDate(profile.dateOfBirth) },
    { icon: Ruler, value: fieldValue(profile.height == null ? null : cmToFeetInches(profile.height)) },
    { icon: HeartHandshake, value: fieldValue(profile.religion) },
  ];

  const statCards = [
    { label: "Marital Status", value: MARITAL_STATUS_LABELS[profile.maritalStatus] ?? profile.maritalStatus, icon: HeartHandshake },
    { label: "Joined On", value: formatDate(profile.createdAt), icon: CalendarDays },
    { label: "Education", value: fieldValue(profile.education), icon: ShieldCheck },
    { label: "Profession", value: fieldValue(profile.profession), icon: CreditCard },
  ];

  return (
    <section className={`overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-sm`}>
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] ${accent.titlePill}`}
            >
              {title}
            </div>
            <div className="mt-4 flex items-center gap-4">
              {photo ? (
                <AdminPreviewableImage
                  src={photo}
                  alt={profile.fullName}
                  className={`relative block h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 bg-gray-100 ${accent.ring}`}
                  imageClassName="object-cover"
                  sizes="96px"
                />
              ) : (
                <div className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 bg-gray-100 ${accent.ring} ${accent.soft} ${accent.icon}`}>
                  <UserRound className="h-10 w-10" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="break-words font-display text-[1.85rem] font-semibold leading-none text-gray-900 sm:text-[2.1rem]">
                  {profile.fullName}
                </h2>
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                  <UserRound className={`h-4 w-4 ${accent.icon}`} />
                  <span>
                    {age} yrs, {GENDER_LABELS[profile.gender] ?? profile.gender}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <StatusBadge status={profile.status} />
        </div>
      </div>

      <div className="mt-5 border-t border-gray-100" />

      <div className="px-5 py-5 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1fr)]">
          <div className="space-y-6">
            {contactRows.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.value} className="flex items-center gap-4 text-sm text-gray-700">
                  <Icon className={`h-4 w-4 shrink-0 ${accent.icon}`} />
                  <span className="break-words leading-6">{item.value}</span>
                </div>
              );
            })}
          </div>

          <div className="hidden bg-gray-100/80 lg:block" />

          <div className="grid gap-3">
            {statCards.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className={`rounded-[18px] border ${accent.softBorder} ${accent.soft} px-4 py-3 shadow-sm`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/80 ${accent.icon}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] leading-none text-gray-500">{item.label}</div>
                      <div className="mt-1 text-sm font-semibold leading-5 text-gray-900">{item.value}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`mt-5 rounded-[18px] border ${accent.softBorder} ${accent.soft} px-4 py-4 shadow-sm`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${accent.icon}`}>
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
                Caste / Community
              </div>
              <div className="mt-1 text-sm font-semibold text-gray-900">
                {fieldValue(profile.caste)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default async function AdminMatchDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams?: SearchParams;
}) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const returnTo = safeReturnTo(firstValue(resolvedSearchParams.returnTo));
  let match = null;

  try {
    match = await prisma.match.findUnique({
      where: { id },
      include: {
        profileA: {
          include: {
            photos: { orderBy: { createdAt: "asc" } },
            user: { select: { name: true, email: true, image: true, createdAt: true } },
          },
        },
        profileB: {
          include: {
            photos: { orderBy: { createdAt: "asc" } },
            user: { select: { name: true, email: true, image: true, createdAt: true } },
          },
        },
        unlocks: {
          orderBy: { createdAt: "desc" },
          include: {
            user: { select: { name: true, email: true } },
            payment: {
              select: {
                amount: true,
                status: true,
                createdAt: true,
                razorpayOrderId: true,
              },
            },
          },
        },
      },
    });
  } catch {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Match Details</h1>
          <p className="mt-2 text-sm text-gray-500">Unable to load this match right now.</p>
        </div>

        <AdminDatabaseUnavailableState
          title="Match details unavailable"
          description="We couldn't reach the database to load the full match details."
        />
      </div>
    );
  }

  if (!match) {
    notFound();
  }

  const unlockCount = match.unlocks.length;
  const latestUnlock = match.unlocks[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <Link
            href={returnTo}
            className="mb-4 inline-flex h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Matches
          </Link>
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-500 shadow-sm ring-1 ring-violet-100">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl">
                Match Details
              </h1>
              <p className="mt-2 text-sm text-gray-500">
                Review and connect with your potential match
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <AdminMatchDetailActions matchId={id} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ProfileCard profile={match.profileA} title="Profile A" />
        <ProfileCard profile={match.profileB} title="Profile B" />
      </div>

      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-semibold text-gray-900">
                Unlock Details
              </h2>
              <p className="text-sm text-gray-500">
                Payment and access history for this match.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {match.unlocks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center">
              <p className="font-semibold text-gray-900">No unlocks recorded yet</p>
              <p className="mt-1 text-sm text-gray-500">
                This match has not been unlocked by any user.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                    Total Unlocks
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">{unlockCount}</div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                    Latest Unlock
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {latestUnlock
                      ? formatDate(latestUnlock.createdAt)
                      : "Not available"}
                  </div>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                    Latest User
                  </div>
                  <div className="mt-2 text-sm font-medium text-gray-900">
                    {latestUnlock
                      ? latestUnlock.user.name ?? latestUnlock.user.email
                      : "Not available"}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="min-w-[760px] w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                        Payment
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                        Order ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-900">
                        Unlocked At
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {match.unlocks.map((unlock) => (
                      <tr key={unlock.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-gray-700">
                          <div className="font-medium text-gray-900">
                            {unlock.user.name ?? unlock.user.email}
                          </div>
                          <div className="text-xs text-gray-500">{unlock.user.email}</div>
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          {unlock.payment ? `₹${Math.round(unlock.payment.amount / 100)}` : "Not added"}
                        </td>
                        <td className="px-4 py-4 text-gray-500">
                          {unlock.payment?.razorpayOrderId ?? "Not added"}
                        </td>
                        <td className="px-4 py-4 text-gray-700">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              unlock.payment?.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : unlock.payment?.status === "FAILED"
                                  ? "bg-rose-50 text-rose-700"
                                  : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {unlock.payment?.status ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500">
                          {formatDate(unlock.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
