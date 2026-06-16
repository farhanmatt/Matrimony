import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

// DELETE /api/admin/matches - bulk delete matches
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const body = (await req.json()) as { matchIds?: string[] };
    const matchIds = Array.isArray(body.matchIds) ? body.matchIds.filter(Boolean) : [];

    if (!matchIds.length) {
      return NextResponse.json({ error: "Match IDs are required" }, { status: 400 });
    }

    const archivedCount = await prisma.$transaction(async (tx) => {
      const matches = await tx.match.findMany({
        where: { id: { in: matchIds } },
        include: {
          profileA: {
            select: {
              id: true,
              fullName: true,
              gender: true,
              city: true,
              location: true,
              state: true,
            },
          },
          profileB: {
            select: {
              id: true,
              fullName: true,
              gender: true,
              city: true,
              location: true,
              state: true,
            },
          },
          unlocks: {
            select: { id: true },
          },
        },
      });

      if (matches.length === 0) {
        return 0;
      }

      await tx.deletedMatch.createMany({
        data: matches.map((match) => ({
          matchId: match.id,
          profileAId: match.profileAId,
          profileBId: match.profileBId,
          profileAName: match.profileA.fullName,
          profileAGender: match.profileA.gender,
          profileACity: match.profileA.city,
          profileALocation: match.profileA.location,
          profileAState: match.profileA.state,
          profileBName: match.profileB.fullName,
          profileBGender: match.profileB.gender,
          profileBCity: match.profileB.city,
          profileBLocation: match.profileB.location,
          profileBState: match.profileB.state,
          unlockCount: match.unlocks.length,
          matchCreatedAt: match.createdAt,
        })),
        skipDuplicates: true,
      });

      await tx.match.deleteMany({
        where: { id: { in: matches.map((match) => match.id) } },
      });

      return matches.length;
    });

    if (archivedCount === 0) {
      return NextResponse.json({ error: "Matches not found" }, { status: 404 });
    }

    revalidatePath("/admin/matches");
    revalidatePath("/admin/matches/deleted");

    return NextResponse.json({ deleted: archivedCount });
  } catch (error) {
    console.error("Admin match bulk delete error:", error);
    return NextResponse.json({ error: "Failed to delete matches" }, { status: 500 });
  }
}
