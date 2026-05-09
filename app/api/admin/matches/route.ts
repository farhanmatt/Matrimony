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

      await tx.$executeRaw(
        Prisma.sql`
          INSERT INTO "DeletedMatch" (
            "matchId",
            "profileAId",
            "profileBId",
            "profileAName",
            "profileAGender",
            "profileACity",
            "profileALocation",
            "profileAState",
            "profileBName",
            "profileBGender",
            "profileBCity",
            "profileBLocation",
            "profileBState",
            "unlockCount",
            "matchCreatedAt"
          ) VALUES ${Prisma.join(
            matches.map((match) =>
              Prisma.sql`(
                ${match.id},
                ${match.profileAId},
                ${match.profileBId},
                ${match.profileA.fullName},
                ${match.profileA.gender},
                ${match.profileA.city},
                ${match.profileA.location},
                ${match.profileA.state},
                ${match.profileB.fullName},
                ${match.profileB.gender},
                ${match.profileB.city},
                ${match.profileB.location},
                ${match.profileB.state},
                ${match.unlocks.length},
                ${match.createdAt}
              )`,
            ),
          )}
          ON CONFLICT ("matchId") DO NOTHING
        `,
      );

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
