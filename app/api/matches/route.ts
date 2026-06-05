import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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

  const matchesWithUnlockStatus = matches.map((match) => {
    const otherProfile =
      match.profileAId === ownProfile.id ? match.profileB : match.profileA;

    return {
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      isUnlocked: match.unlocks.some((unlock) => unlock.userId === session.user.id),
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
        phone: otherProfile.phone,
        profileImage: otherProfile.profileImage,
        photos: otherProfile.photos,
      },
    };
  });

  return NextResponse.json({ data: matchesWithUnlockStatus });
}
