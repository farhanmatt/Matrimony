import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getChatProfilePresence,
  markChatProfileActiveAndBroadcast,
} from "@/lib/server/chat-presence";
import { canStartChatForProfiles } from "@/lib/utils/chat";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

async function resolvePresenceAccess(targetProfileId: string, userId: string) {
  const [ownProfile, targetProfile] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    }),
    prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: { id: true },
    }),
  ]);

  if (!ownProfile) {
    return {
      error: NextResponse.json(
        { error: "You must create your profile before using chat" },
        { status: 403 }
      ),
    };
  }

  if (!targetProfile) {
    return {
      error: NextResponse.json({ error: "Profile not found" }, { status: 404 }),
    };
  }

  if (ownProfile.id === targetProfile.id) {
    return {
      error: NextResponse.json(
        { error: "You cannot chat with your own profile" },
        { status: 400 }
      ),
    };
  }

  const canAccess = await canStartChatForProfiles(ownProfile.id, targetProfile.id);

  if (!canAccess) {
    return {
      error: NextResponse.json(
        { error: "This chat is not available for the selected profile" },
        { status: 403 }
      ),
    };
  }

  return { ownProfile, targetProfile };
}

export async function POST(
  _req: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await context.params;
  const access = await resolvePresenceAccess(profileId, session.user.id);

  if ("error" in access) {
    return access.error;
  }

  const { ownProfile, targetProfile } = access;
  await markChatProfileActiveAndBroadcast(ownProfile.id);
  const targetPresence = getChatProfilePresence(targetProfile.id);

  return NextResponse.json({
    data: {
      targetProfile: {
        id: targetProfile.id,
        isOnline: targetPresence.isOnline,
        lastActiveAt: targetPresence.lastActiveAt,
      },
    },
  });
}
