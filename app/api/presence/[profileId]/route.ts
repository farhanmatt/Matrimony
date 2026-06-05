import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getChatProfilePresence,
  markChatProfileActive,
} from "@/lib/server/chat-presence";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

export async function GET(
  _req: Request,
  context: RouteContext
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await context.params;

  const [viewerProfile, targetProfile] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    }),
    prisma.profile.findUnique({
      where: { id: profileId },
      select: { id: true },
    }),
  ]);

  if (!targetProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (viewerProfile) {
    markChatProfileActive(viewerProfile.id);
  }

  const presence = getChatProfilePresence(targetProfile.id);

  return NextResponse.json({
    data: {
      profileId: targetProfile.id,
      isOnline: presence.isOnline,
      lastActiveAt: presence.lastActiveAt,
    },
  });
}
