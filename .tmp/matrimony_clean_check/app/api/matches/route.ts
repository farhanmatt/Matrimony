import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMatchesForProfile } from "@/lib/utils/matching";

// GET /api/matches — get all mutual matches for current user
export async function GET() {
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

  // Attach unlock status per match for current user
  const matchesWithUnlockStatus = matches.map((match) => ({
    ...match,
    isUnlocked: match.unlocks.some(
      (u: { userId: string }) => u.userId === session.user.id
    ),
    otherProfile:
      match.profileAId === ownProfile.id ? match.profileB : match.profileA,
  }));

  return NextResponse.json({ data: matchesWithUnlockStatus });
}
