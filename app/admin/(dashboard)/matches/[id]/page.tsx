import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
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

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
              {title}
            </p>
            <h2 className="mt-2 font-display text-xl font-semibold text-gray-900 sm:text-[1.9rem]">
              {profile.fullName}
            </h2>
          </div>
          <StatusBadge status={profile.status} />
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-gradient-to-br from-violet-50 via-white to-rose-50 lg:h-[520px]">
            <div className="relative aspect-[4/5] h-full w-full">
              {photo ? (
                <Image
                  src={photo}
                  alt={profile.fullName}
                  fill
                  className="object-cover"
                  style={{ objectPosition: "center 12%" }}
                  sizes="(max-width: 1024px) 100vw, 220px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-violet-200">
                  <UserRound className="h-24 w-24" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Age
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">{age} yrs</div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Gender
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  {GENDER_LABELS[profile.gender] ?? profile.gender}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Marital Status
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  {MARITAL_STATUS_LABELS[profile.maritalStatus] ?? profile.maritalStatus}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Joined
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  {formatDate(profile.createdAt)}
                </div>
              </div>
            </div>

            <div className="grid gap-2.5 text-sm text-gray-600 sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-violet-500" />
                <span>{fieldValue(profile.phone)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-violet-500" />
                <span>{profile.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-violet-500" />
                <span>{location}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-violet-500" />
                <span>{formatDate(profile.dateOfBirth)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ruler className="h-4 w-4 text-violet-500" />
                <span>{fieldValue(profile.height == null ? null : cmToFeetInches(profile.height))}</span>
              </div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-4 w-4 text-violet-500" />
                <span>{fieldValue(profile.religion)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Education
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  {fieldValue(profile.education)}
                </div>
              </div>
              <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                  Profession
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  {fieldValue(profile.profession)}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
                Caste / Community
              </div>
              <div className="mt-2 text-sm font-medium text-gray-900">
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link
            href={returnTo}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-violet-300 hover:text-violet-600"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <h1 className="mt-4 text-2xl font-display font-bold text-gray-900 sm:text-3xl">
            Match Details
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Combined view of both profiles in this mutual match.
          </p>
        </div>

        <div className="w-full rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm lg:w-auto">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">
            Match Summary
          </div>
          <div className="mt-2 text-sm font-medium text-gray-900">
            {formatDate(match.createdAt)}
          </div>
          <div className="mt-1 text-sm text-gray-500">
            {unlockCount} unlock{unlockCount === 1 ? "" : "s"} recorded
          </div>
          <div className="mt-1 text-xs text-gray-400">Match ID: {match.id}</div>
          {latestUnlock ? (
            <div className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
              Latest unlock by {latestUnlock.user.name ?? latestUnlock.user.email}
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="break-words font-display text-lg font-semibold text-gray-900 sm:text-xl">
              {match.profileA.fullName} and {match.profileB.fullName}
            </h2>
            <p className="text-sm text-gray-500">
              Two profile records matched together on {formatDate(match.createdAt)}.
            </p>
          </div>
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
