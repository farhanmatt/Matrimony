import Link from "next/link";
import { DatabaseZap, Heart, RefreshCw } from "lucide-react";
import EmptyState from "@/components/common/EmptyState";
import ReceivedLikesBoard from "@/components/dashboard/ReceivedLikesBoard";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/utils/errors";

export default async function ReceivedLikesPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  let ownProfile: { id: string } | null = null;
  let dbUnavailable = false;
  let receivedLikes: Array<{
    id: string;
    createdAt: Date;
    fromProfile: {
      id: string;
      fullName: string;
      gender: string;
      dateOfBirth: Date;
      height: number | null;
      maritalStatus: string;
      education: string | null;
      course: string | null;
      profession: string | null;
      location: string | null;
      city: string | null;
      state: string | null;
      religion: string | null;
      profileImage: string | null;
      photos: { url: string; isPrimary: boolean }[];
    };
  }> = [];
  let likedBackRows: Array<{ toProfileId: string }> = [];

  try {
    ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (ownProfile) {
      [receivedLikes, likedBackRows] = await Promise.all([
        prisma.like.findMany({
          where: { toProfileId: ownProfile.id },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            createdAt: true,
            fromProfile: {
              select: {
                id: true,
                fullName: true,
                gender: true,
                dateOfBirth: true,
                height: true,
                maritalStatus: true,
                education: true,
                course: true,
                profession: true,
                location: true,
                city: true,
                state: true,
                religion: true,
                profileImage: true,
                photos: {
                  where: { isPrimary: true },
                  select: { url: true, isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        }),
        prisma.like.findMany({
          where: { fromProfileId: ownProfile.id },
          select: { toProfileId: true },
        }),
      ]);
    }
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      dbUnavailable = true;
    } else {
      throw error;
    }
  }

  if (dbUnavailable) {
    return (
      <div className="rounded-[28px] border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
            <DatabaseZap className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold text-gray-900">
              Received likes temporarily unavailable
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600">
              We could not reach your database right now, so the received likes
              page could not load. Once the connection is back, the profiles who
              liked you will appear here again.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard/received-likes"
                className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-600"
              >
                <RefreshCw className="h-4 w-4" />
                Retry Page
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-rose-300 hover:text-rose-600"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!ownProfile) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 shadow-sm">
              <Heart className="h-4.5 w-4.5" />
            </div>
            <h1 className="font-display text-[1.8rem] font-bold tracking-tight text-slate-900">
              Received Likes
            </h1>
          </div>
          <p className="mt-3 text-[15px] text-slate-600">
            Profiles who have shown interest in you.
          </p>
        </div>

        <EmptyState
          icon="heart"
          title="Create your profile to receive likes"
          description="Once your profile is live, interested members will appear here."
          action={{ label: "Create Profile", href: "/dashboard/profile/create" }}
        />
      </div>
    );
  }

  const likedBackIds = new Set(likedBackRows.map((like) => like.toProfileId));
  const matchedReceivedCount = receivedLikes.filter((like) =>
    likedBackIds.has(like.fromProfile.id)
  ).length;
  const pendingReceivedLikes = receivedLikes.filter(
    (like) => !likedBackIds.has(like.fromProfile.id)
  );

  const initialLikes = pendingReceivedLikes.map((like) => ({
    id: like.id,
    createdAt: like.createdAt.toISOString(),
    isLikedBack: false,
    isMatched: false,
    profile: {
      ...like.fromProfile,
      dateOfBirth: like.fromProfile.dateOfBirth.toISOString(),
    },
  }));

  if (initialLikes.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 text-rose-500 shadow-sm">
              <Heart className="h-4.5 w-4.5" />
            </div>
            <h1 className="font-display text-[1.8rem] font-bold tracking-tight text-slate-900">
              Received Likes
            </h1>
          </div>
          <p className="mt-3 text-[15px] text-slate-600">
            Profiles who have shown interest in you.
          </p>
        </div>

        <EmptyState
          icon="heart"
          title={
            matchedReceivedCount > 0
              ? "No pending received likes"
              : "No received likes yet"
          }
          description={
            matchedReceivedCount > 0
              ? "Profiles you liked back have been moved to Mutual Interest."
              : "Keep your profile updated and active to attract more interest."
          }
          action={{
            label: matchedReceivedCount > 0 ? "View Mutual Interests" : "Browse Profiles",
            href: matchedReceivedCount > 0 ? "/dashboard/matches" : "/dashboard/browse",
          }}
        />
      </div>
    );
  }

  return (
    <ReceivedLikesBoard
      initialLikes={initialLikes}
      movedToMatchesCount={matchedReceivedCount}
    />
  );
}
