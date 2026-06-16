import { NextRequest, NextResponse } from "next/server";
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

// DELETE /api/admin/matches/deleted — permanently remove one or more DeletedMatch records
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const body = (await req.json()) as { ids?: string[] };
    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];

    if (!ids.length) {
      return NextResponse.json({ error: "IDs are required" }, { status: 400 });
    }

    const { count } = await prisma.deletedMatch.deleteMany({
      where: { id: { in: ids } },
    });

    if (count === 0) {
      return NextResponse.json({ error: "Records not found" }, { status: 404 });
    }

    revalidatePath("/admin/matches/deleted");

    return NextResponse.json({ deleted: count });
  } catch (error) {
    console.error("Admin deleted match permanent delete error:", error);
    return NextResponse.json({ error: "Failed to permanently delete records" }, { status: 500 });
  }
}

// POST /api/admin/matches/deleted — restore a deleted match back to the active matches table
export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  try {
    const body = (await req.json()) as { id?: string };
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const deletedMatch = await prisma.deletedMatch.findUnique({
      where: { id },
    });

    if (!deletedMatch) {
      return NextResponse.json({ error: "Deleted match record not found" }, { status: 404 });
    }

    // Check both profiles still exist
    const [profileA, profileB] = await Promise.all([
      prisma.profile.findUnique({ where: { id: deletedMatch.profileAId }, select: { id: true } }),
      prisma.profile.findUnique({ where: { id: deletedMatch.profileBId }, select: { id: true } }),
    ]);

    if (!profileA) {
      return NextResponse.json(
        { error: `Profile A (${deletedMatch.profileAName}) no longer exists and cannot be restored.` },
        { status: 422 },
      );
    }
    if (!profileB) {
      return NextResponse.json(
        { error: `Profile B (${deletedMatch.profileBName}) no longer exists and cannot be restored.` },
        { status: 422 },
      );
    }

    // Check if a match already exists between these two profiles
    const existingMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { profileAId: deletedMatch.profileAId, profileBId: deletedMatch.profileBId },
          { profileAId: deletedMatch.profileBId, profileBId: deletedMatch.profileAId },
        ],
      },
      select: { id: true },
    });

    if (existingMatch) {
      return NextResponse.json(
        { error: "An active match between these profiles already exists." },
        { status: 409 },
      );
    }

    // Restore the original match record so the match ID and createdAt stay stable.
    const restoredMatch = await prisma.$transaction(async (tx) => {
      const newMatch = await tx.match.create({
        data: {
          id: deletedMatch.matchId,
          profileAId: deletedMatch.profileAId,
          profileBId: deletedMatch.profileBId,
          createdAt: deletedMatch.matchCreatedAt,
        },
      });

      await tx.deletedMatch.delete({ where: { id } });

      return newMatch;
    });

    revalidatePath("/admin/matches");
    revalidatePath("/admin/matches/deleted");

    return NextResponse.json({ restored: true, matchId: restoredMatch.id });
  } catch (error) {
    console.error("Admin deleted match restore error:", error);
    return NextResponse.json({ error: "Failed to restore match" }, { status: 500 });
  }
}
