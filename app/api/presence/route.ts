import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { markChatProfileActive } from "@/lib/server/chat-presence";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!profile) {
    return NextResponse.json({ data: { profileId: null, isOnline: false } });
  }

  const presence = markChatProfileActive(profile.id);

  return NextResponse.json({
    data: {
      profileId: profile.id,
      isOnline: presence.isOnline,
      lastActiveAt: presence.lastActiveAt,
    },
  });
}
