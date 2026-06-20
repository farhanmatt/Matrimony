import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProtectedMatchProfileImageUrl } from "@/lib/server/match-profile-preview";
import { serializeProfilePreviewCard } from "@/lib/server/liked-profile-preview";
import { getMatchesForProfile } from "@/lib/utils/matching";

// GET /api/matches — get all mutual matches for current user
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!ownProfile) {
    return NextResponse.json({ data: [] });
  }

  const matches = await getMatchesForProfile(ownProfile.id);
  const summaryOnly = new URL(req.url).searchParams.get("summary") === "1";

  const settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
    select: { baseAmount: true, profileAmount: true, perProfileChatAmount: true },
  });

  let filteredMatches = matches;
  if (!summaryOnly) {
    const otherProfileIds = matches.map((match) =>
      match.profileAId === ownProfile.id ? match.profileBId : match.profileAId
    );
    const likes = await prisma.like.findMany({
      where: {
        OR: [
          { fromProfileId: ownProfile.id, toProfileId: { in: otherProfileIds } },
          { fromProfileId: { in: otherProfileIds }, toProfileId: ownProfile.id },
        ],
      },
      select: { fromProfileId: true, toProfileId: true },
    });

    const outgoing = new Set(likes.filter(l => l.fromProfileId === ownProfile.id).map(l => l.toProfileId));
    const incoming = new Set(likes.filter(l => l.toProfileId === ownProfile.id).map(l => l.fromProfileId));

    filteredMatches = matches.filter((match) => {
      const otherProfileId = match.profileAId === ownProfile.id ? match.profileBId : match.profileAId;
      return outgoing.has(otherProfileId) && incoming.has(otherProfileId);
    });
  }

  if (summaryOnly) {
    return NextResponse.json({
      data: matches.map((match) => {
        const otherProfile = match.profileAId === ownProfile.id ? match.profileB : match.profileA;
        return {
          id: match.id,
          createdAt: match.createdAt.toISOString(),
          isProfileUnlocked: match.unlocks.some(
            (unlock) => unlock.userId === session.user.id && unlock.type === "PROFILE"
          ),
          isChatUnlocked: match.unlocks.some(
            (unlock) => unlock.userId === session.user.id && unlock.type === "CHAT"
          ),
          otherProfile: serializeProfilePreviewCard(otherProfile as any),
        };
      }),
      pricing: settings
        ? {
            baseAmount: settings.baseAmount,
            profileAmount: settings.profileAmount,
            perProfileChatAmount: settings.perProfileChatAmount,
          }
        : undefined,
    });
  }

  const pendingMatches = filteredMatches.reduce<
    Array<{
      id: string;
      createdAt: string;
      isProfileUnlocked: false;
      isChatUnlocked: boolean;
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
        phone: null;
        profileImage: string | null;
        photos: { url: string; isPrimary: boolean }[];
      };
    }>
  >((items, match) => {
    const isProfileUnlocked = match.unlocks.some(
      (unlock) => unlock.userId === session.user.id && unlock.type === "PROFILE"
    );
    const isChatUnlocked = match.unlocks.some(
      (unlock) => unlock.userId === session.user.id && unlock.type === "CHAT"
    );

    if (isProfileUnlocked) {
      return items;
    }

    const otherProfile =
      match.profileAId === ownProfile.id ? match.profileB : match.profileA;

    items.push({
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      isProfileUnlocked: false,
      isChatUnlocked,
      otherProfile: {
        id: otherProfile.id,
        fullName: otherProfile.fullName,
        gender: otherProfile.gender,
        dateOfBirth: otherProfile.dateOfBirth.toISOString(),
        height: otherProfile.height,
        maritalStatus: otherProfile.maritalStatus,
        profession: otherProfile.profession,
        city: otherProfile.city,
        state: otherProfile.state,
        religion: otherProfile.religion,
        education: otherProfile.education,
        course: otherProfile.course,
        phone: null,
        profileImage: getProtectedMatchProfileImageUrl(otherProfile),
        photos: [],
      },
    });

    return items;
  }, []);

  return NextResponse.json({
    data: pendingMatches,
    unlockedMatchesCount: filteredMatches.length - pendingMatches.length,
    isSummary: summaryOnly,
    pricing: settings
      ? {
          baseAmount: settings.baseAmount,
          profileAmount: settings.profileAmount,
          perProfileChatAmount: settings.perProfileChatAmount,
        }
      : undefined,
  });
}
