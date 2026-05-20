import type { Metadata } from "next";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import AdminDatabaseUnavailableState from "@/components/admin/AdminDatabaseUnavailableState";
import AdminProfileRelationsExplorer from "@/components/admin/AdminProfileRelationsExplorer";
import StatusBadge from "@/components/common/StatusBadge";
import { ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Profile Details - Admin",
};

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type RelatedMatch = {
  id: string;
  createdAt: Date;
  profileA: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date;
    city: string | null;
    state: string | null;
    profession: string | null;
    education: string | null;
    religion: string | null;
    maritalStatus: string;
    height: number | null;
    profileImage: string | null;
    photos: Array<{ url: string; isPrimary: boolean }>;
  };
  profileB: {
    id: string;
    fullName: string;
    gender: string;
    dateOfBirth: Date;
    city: string | null;
    state: string | null;
    profession: string | null;
    education: string | null;
    religion: string | null;
    maritalStatus: string;
    height: number | null;
    profileImage: string | null;
    photos: Array<{ url: string; isPrimary: boolean }>;
  };
  unlocks: Array<{
    id: string;
    createdAt: Date;
    user: {
      name: string | null;
      email: string;
    };
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value: string | undefined) {
  if (!value) return "/admin/profiles";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin/profiles";
  return value;
}

export default async function AdminProfileDetailPage({
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
  let dbUnavailable = false;

  try {
    const profile = await prisma.profile.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            image: true,
            createdAt: true,
            payments: {
              select: {
                status: true,
              },
            },
          },
        },
        photos: {
          orderBy: { createdAt: "asc" },
        },
        preference: true,
      },
    });

    if (!profile) {
      notFound();
    }

    const primaryPhoto =
      profile.photos.find((photo) => photo.isPrimary)?.url ??
      profile.photos[0]?.url ??
      profile.profileImage ??
      profile.user.image ??
      null;
    let relatedMatches: RelatedMatch[] = [];
    try {
      relatedMatches = (await prisma.match.findMany({
        where: {
          OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
        },
        orderBy: { createdAt: "desc" },
        include: {
          profileA: {
            select: {
              id: true,
              fullName: true,
              gender: true,
              dateOfBirth: true,
              city: true,
              state: true,
              profession: true,
              education: true,
              religion: true,
              maritalStatus: true,
              height: true,
              profileImage: true,
              photos: {
                where: { isPrimary: true },
                select: { url: true, isPrimary: true },
                take: 1,
              },
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
              profession: true,
              education: true,
              religion: true,
              maritalStatus: true,
              height: true,
              profileImage: true,
              photos: {
                where: { isPrimary: true },
                select: { url: true, isPrimary: true },
                take: 1,
              },
            },
          },
          unlocks: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })) as RelatedMatch[];
    } catch {
      relatedMatches = [];
    }
    const relationItems = relatedMatches.map((match) => {
      const partner = match.profileA.id === profile.id ? match.profileB : match.profileA;
      const partnerImage =
        partner.photos.find((photo) => photo.isPrimary)?.url ??
        partner.photos[0]?.url ??
        partner.profileImage ??
        null;
      const latestUnlock = match.unlocks[0];

      return {
        id: partner.id,
        fullName: partner.fullName,
        gender: partner.gender,
        dateOfBirth: partner.dateOfBirth.toISOString(),
        city: partner.city,
        state: partner.state,
        profession: partner.profession,
        education: partner.education,
        religion: partner.religion,
        maritalStatus: partner.maritalStatus,
        height: partner.height,
        profileImage: partnerImage,
        matchId: match.id,
        matchCreatedAt: match.createdAt.toISOString(),
        unlockCount: match.unlocks.length,
        latestUnlockAt: latestUnlock?.createdAt.toISOString() ?? null,
        latestUnlockUser: latestUnlock?.user.name ?? latestUnlock?.user.email ?? null,
      };
    });
    const matchedProfiles = relationItems;
    const unlockedProfiles = relationItems.filter((item) => item.unlockCount > 0);

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <Link
              href={returnTo}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:border-rose-300 hover:text-rose-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Profiles
            </Link>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="text-right text-xs leading-5 text-gray-500">
              <div>Created: {format(profile.user.createdAt, "d MMM yyyy")}</div>
              <div>Last active: {formatDistanceToNow(profile.updatedAt, { addSuffix: true })}</div>
            </div>
          </div>
        </div>

        <main className="space-y-6">
          <AdminProfileRelationsExplorer
            matchedProfiles={matchedProfiles}
            unlockedProfiles={unlockedProfiles}
            currentProfile={{
              id: profile.id,
              fullName: profile.fullName,
              gender: profile.gender,
              dateOfBirth: profile.dateOfBirth.toISOString(),
              height: profile.height,
              city: profile.city,
              state: profile.state,
              country: profile.country,
              houseNumber: profile.houseNumber,
              streetName: profile.streetName,
              pincode: profile.pincode,
              profession: profile.profession,
              education: profile.education,
              course: profile.course,
              employedIn: profile.employedIn,
              income: profile.income,
              religion: profile.religion,
              caste: profile.caste,
              subCaste: profile.subCaste,
              language: profile.language,
              star: profile.star,
              rasi: profile.rasi,
              timeOfBirth: profile.timeOfBirth,
              placeOfBirth: profile.placeOfBirth,
              fatherName: profile.fatherName,
              motherName: profile.motherName,
              familyType: profile.familyType,
              familyStatus: profile.familyStatus,
              maritalStatus: profile.maritalStatus,
              profileImage: primaryPhoto,
              photos: profile.photos.map((photo) => ({
                url: photo.url,
                isPrimary: photo.isPrimary,
              })),
              horoscopeImage: profile.horoscopeImage,
              displayId: `MTR-${profile.createdAt.getFullYear()}-${profile.id.slice(-5).toUpperCase()}`,
              email: profile.user.email,
              phone: profile.phone ?? null,
              isPaidProfile: profile.user.payments.some((payment) => payment.status === "PAID"),
              joinedAt: profile.user.createdAt.toISOString(),
              lastActiveAt: profile.updatedAt.toISOString(),
            }}
          />
        </main>
      </div>
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-gray-900">Profile Details</h1>
          <p className="mt-2 text-sm text-gray-500">Unable to load this profile right now.</p>
        </div>

        <AdminDatabaseUnavailableState
          title="Profile details unavailable"
          description="We couldn't reach the database to load the full profile details."
        />
      </div>
    );
  }

  return null;
}


