import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendProfileLikedEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { likeProfile, unlikeProfile } from "@/lib/utils/matching";

// POST /api/likes - like a profile
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { toProfileId } = await req.json();
    if (!toProfileId) {
      return NextResponse.json({ error: "toProfileId is required" }, { status: 400 });
    }

    const ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true, fullName: true },
    });

    if (!ownProfile) {
      return NextResponse.json(
        { error: "You must create your profile before liking others" },
        { status: 403 }
      );
    }

    const result = await likeProfile(ownProfile.id, toProfileId);

    if (result.created && result.liked) {
      const likedProfile = await prisma.profile.findUnique({
        where: { id: toProfileId },
        select: {
          fullName: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      });

      if (likedProfile?.user.email) {
        const emailResult = await sendProfileLikedEmail({
          to: likedProfile.user.email,
          recipientName: likedProfile.user.name ?? likedProfile.fullName,
          likedByName: ownProfile.fullName,
        });

        if (!emailResult.ok) {
          console.warn("Profile liked email skipped:", emailResult.reason);
        }
      } else {
        console.warn("Profile liked email skipped: recipient email is unavailable.");
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Like error:", error);
    return NextResponse.json({ error: "Failed to like profile" }, { status: 500 });
  }
}

// GET /api/likes - get profiles the current user has liked
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

  const likes = await prisma.like.findMany({
    where: { fromProfileId: ownProfile.id },
    include: {
      toProfile: {
        include: { photos: { where: { isPrimary: true }, take: 1 } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: likes });
}

// DELETE /api/likes - unlike a profile
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { toProfileId } = await req.json();
    if (!toProfileId) {
      return NextResponse.json(
        { error: "toProfileId is required" },
        { status: 400 }
      );
    }

    const ownProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!ownProfile) {
      return NextResponse.json(
        { error: "You must create your profile before managing likes" },
        { status: 403 }
      );
    }

    const result = await unlikeProfile(ownProfile.id, toProfileId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Unlike error:", error);
    return NextResponse.json(
      { error: "Failed to remove liked profile" },
      { status: 500 }
    );
  }
}
