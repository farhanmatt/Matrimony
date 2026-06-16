import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import StatusBadge from "@/components/common/StatusBadge";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CreditCard,
  Hash,
  HeartHandshake,
  Mail,
  MapPin,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { calculateAge, formatDate } from "@/lib/utils/helpers";

export const metadata: Metadata = {
  title: "Payment Details - Admin",
};

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value: string | undefined) {
  if (!value) return "/admin/payments";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin/payments";
  return value;
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

function formatMoney(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function isMissingProfileUnlockColumnError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("profileunlockamount") || message.includes("p2022") || message.includes("column");
}

type PaymentDetailRecord = {
  id: string;
  amount: number;
  baseAmount: number;
  profileAmount: number;
  perProfileChatAmount: number;
  profileUnlockAmount?: number | null;
  currency: string;
  status: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
    image: string | null;
    createdAt: Date;
  };
  unlock: {
    matchId: string;
    user: { name: string | null; email: string };
  } | null;
};

type MatchDetailRecord = {
  id: string;
  profileA: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date;
    city: string | null;
    state: string | null;
    location: string | null;
    profession: string | null;
    education: string | null;
    profileImage: string | null;
    user: { image: string | null };
    photos: Array<{ url: string; isPrimary: boolean }>;
  };
  profileB: MatchDetailRecord["profileA"];
};

function fieldValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return "Not added";
  if (typeof value === "string" && value.trim().length === 0) return "Not added";
  return String(value);
}

function ProfileCard({
  profile,
  href,
}: {
  profile: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date;
    city: string | null;
    state: string | null;
    location: string | null;
    profession: string | null;
    education: string | null;
    profileImage: string | null;
    user: { image: string | null };
    photos: Array<{ url: string; isPrimary: boolean }>;
  };
  href: string;
}) {
  const photo = getPrimaryPhoto(profile);
  const age = calculateAge(profile.dateOfBirth);
  const location =
    [profile.city, profile.state].filter(Boolean).join(", ") ||
    profile.location ||
    "India";

  return (
    <Link
      href={href}
      className="group overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-gradient-to-br from-rose-50 via-white to-pink-50">
        {photo ? (
          <Image src={photo} alt={profile.fullName} fill className="object-cover" sizes="(max-width: 768px) 100vw, 360px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-rose-200">
            <UserRound className="h-20 w-20" />
          </div>
        )}
      </div>

      <div className="space-y-3 p-5">
        <div>
          <div className="font-display text-lg font-bold text-gray-900 group-hover:text-rose-600">
            {profile.fullName}
          </div>
          <div className="mt-1 text-sm text-slate-500">
            {age} yrs • {profile.gender}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-rose-500" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Banknote className="h-4 w-4 text-rose-500" />
            <span>{fieldValue(profile.profession || profile.education)}</span>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-rose-500" />
            <span>{formatDate(profile.dateOfBirth)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function AdminPaymentDetailPage({
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
  try {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: {
        id: true,
        amount: true,
        baseAmount: true,
        profileAmount: true,
        perProfileChatAmount: true,
        currency: true,
        status: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        createdAt: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true,
            createdAt: true,
          },
        },
      },
    });

    if (!payment) {
      notFound();
    }

    const paymentDetails: PaymentDetailRecord = {
      ...payment,
      profileUnlockAmount: payment.profileAmount,
      unlock: null,
    };

    const unlock = await prisma.unlock.findUnique({
      where: { paymentId: paymentDetails.id },
      select: {
        matchId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    paymentDetails.unlock = unlock;

    let match: MatchDetailRecord | null = null;

    if (unlock) {
      try {
        match = await prisma.match.findUnique({
          where: { id: unlock.matchId },
          select: {
            id: true,
            profileA: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                city: true,
                state: true,
                location: true,
                profession: true,
                education: true,
                profileImage: true,
                photos: { orderBy: { createdAt: "asc" } },
                user: { select: { image: true } },
              },
            },
            profileB: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                city: true,
                state: true,
                location: true,
                profession: true,
                education: true,
                profileImage: true,
                photos: { orderBy: { createdAt: "asc" } },
                user: { select: { image: true } },
              },
            },
          },
        });
      } catch (error) {
        if (!isMissingProfileUnlockColumnError(error)) {
          throw error;
        }
      }
    }

    const paymentAmount = Math.round(paymentDetails.amount / 100);
    const paymentPricing = paymentDetails as typeof paymentDetails & {
      perProfileChatAmount: number;
      profileUnlockAmount: number;
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href={returnTo}
              className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-sm font-medium text-rose-700 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profile Unlocks
            </Link>

            <div className="mt-4 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shadow-sm ring-1 ring-rose-100">
                <CreditCard className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h1 className="font-display text-3xl font-bold tracking-[-0.03em] text-gray-900 sm:text-4xl">
                  Profile Unlock Details
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Review full transaction and profile unlock information.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={match ? `/admin/matches/${match.id}?returnTo=${encodeURIComponent(returnTo)}` : returnTo}
              className="inline-flex items-center gap-2 rounded-[16px] border border-rose-200 bg-white px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              <HeartHandshake className="h-4 w-4" />
              Open Match
            </Link>
            <Link
              href={`/admin/payments?search=${encodeURIComponent(paymentDetails.razorpayOrderId)}`}
              className="inline-flex items-center gap-2 rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.22)] transition-transform hover:-translate-y-0.5"
            >
              <Hash className="h-4 w-4" />
              Search Order
            </Link>
          </div>
        </div>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
          <div className="overflow-hidden rounded-[28px] border border-rose-100 bg-white shadow-sm">
            <div className="border-b border-rose-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-gray-900">
                    Transaction Summary
                  </h2>
                  <p className="text-sm text-slate-500">
                    Amount breakdown and payment identifiers.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Amount
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {formatMoney(paymentAmount)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Currency
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">{paymentDetails.currency}</div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Base Amount
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {formatMoney(paymentDetails.baseAmount)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Profile Amount
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {formatMoney(paymentDetails.profileAmount)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Unlock Amount
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {formatMoney(paymentPricing.profileUnlockAmount)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Per Profile Chat Amount
                </div>
                <div className="mt-2 text-lg font-semibold text-gray-900">
                  {formatMoney(paymentPricing.perProfileChatAmount)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Razorpay Payment ID
                </div>
                <div className="mt-2 break-words text-sm font-medium text-gray-900">
                  {fieldValue(paymentDetails.razorpayPaymentId)}
                </div>
              </div>
              <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-400">
                  Created At
                </div>
                <div className="mt-2 text-sm font-medium text-gray-900">
                  {formatDate(paymentDetails.createdAt)}
                </div>
              </div>
            </div>

            <div className="border-t border-rose-100 px-6 py-5">
              <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-rose-500" />
                  <span className="break-all">Order ID: {paymentDetails.razorpayOrderId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-rose-500" />
                  <span>Current status: {paymentDetails.status}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
              <div className="border-b border-rose-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-gray-900">
                      Paying User
                    </h2>
                    <p className="text-sm text-slate-500">
                      Account that created this payment.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-6 text-sm text-gray-600">
                <div className="font-semibold text-gray-900">{paymentDetails.user.name ?? paymentDetails.user.email}</div>
                <div>{paymentDetails.user.email}</div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-rose-500" />
                  <span>Joined {formatDate(paymentDetails.user.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserRound className="h-4 w-4 text-rose-500" />
                  <span>Payment user profile image available: {paymentDetails.user.image ? "Yes" : "No"}</span>
                </div>
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-rose-100 bg-white shadow-sm">
              <div className="border-b border-rose-100 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-semibold text-gray-900">
                      Related Match
                    </h2>
                    <p className="text-sm text-slate-500">
                      Linked match and profile details for this unlock.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {match ? (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600">
                      Match ID: <span className="font-medium text-gray-900">{match.id}</span>
                    </div>
                    <Link
                      href={`/admin/matches/${match.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      className="inline-flex rounded-full border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 transition-colors hover:border-rose-300 hover:bg-rose-50"
                    >
                      Open match details
                    </Link>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <ProfileCard
                        profile={match.profileA}
                        href={`/admin/profiles/${match.profileA.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      />
                      <ProfileCard
                        profile={match.profileB}
                        href={`/admin/profiles/${match.profileB.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/60 px-6 py-10 text-center">
                    <p className="font-semibold text-gray-900">No related match found</p>
                    <p className="mt-1 text-sm text-slate-500">
                      This payment is not linked to a match record.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    throw error;
  }
}






