import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getProtectedMatchProfileImageUrl } from "@/lib/server/match-profile-preview";
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

  if (summaryOnly) {
    return NextResponse.json({
      data: matches.map((match) => ({
        id: match.id,
        createdAt: match.createdAt.toISOString(),
        isUnlocked: match.unlocks.some((unlock) => unlock.userId === session.user.id),
        otherProfile: {
          id: match.profileAId === ownProfile.id ? match.profileB.id : match.profileA.id,
        },
      })),
    });
  }

  const pendingMatches = matches.reduce<
    Array<{
      id: string;
      createdAt: string;
      isUnlocked: false;
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
        previewImageUrl: string | null;
      };
    }>
  >((items, match) => {
    const isUnlocked = match.unlocks.some((unlock) => unlock.userId === session.user.id);
    if (isUnlocked) {
      return items;
    }

    const otherProfile =
      match.profileAId === ownProfile.id ? match.profileB : match.profileA;

    items.push({
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      isUnlocked: false,
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
        previewImageUrl: getProtectedMatchProfileImageUrl(otherProfile),
      },
    });

    return items;
  }, []);

  return NextResponse.json({
    data: pendingMatches,
    unlockedMatchesCount: matches.length - pendingMatches.length,
  });
}
