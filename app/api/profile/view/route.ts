import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { viewedProfileId } = await req.json();

    if (!viewedProfileId) {
      return NextResponse.json(
        { error: "viewedProfileId is required" },
        { status: 400 }
      );
    }

    // Get current user's profile ID
    const currentProfile = await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!currentProfile) {
      return NextResponse.json(
        { error: "Profile not found for current user" },
        { status: 404 }
      );
    }

    // Don't track viewing your own profile
    if (currentProfile.id === viewedProfileId) {
      return NextResponse.json({ success: true });
    }

    // Create or update the view using upsert (since there's a unique constraint)
    await prisma.profileView.upsert({
      where: {
        viewerId_viewedId: {
          viewerId: currentProfile.id,
          viewedId: viewedProfileId,
        },
      },
      create: {
        viewerId: currentProfile.id,
        viewedId: viewedProfileId,
      },
      update: {}, // We only need the existence, no need to update anything
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PROFILE_VIEW]", error);
    return NextResponse.json(
      { error: "Failed to record profile view" },
      { status: 500 }
    );
  }
}
