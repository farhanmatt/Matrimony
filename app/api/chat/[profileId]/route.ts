import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publishUserNotification } from "@/lib/utils/notification-events";
import {
  canStartChatForProfiles,
  findConversationForProfiles,
  getOrCreateConversation,
} from "@/lib/utils/chat";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

function getPrimaryImage(profile: {
  profileImage?: string | null;
  photos: { url: string; isPrimary: boolean }[];
}) {
  return (
    profile.profileImage ??
    profile.photos.find((photo) => photo.isPrimary)?.url ??
    profile.photos[0]?.url ??
    null
  );
}

async function resolveChatAccess(targetProfileId: string, userId: string) {
  const [ownProfile, targetProfile] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { id: true, fullName: true },
    }),
    prisma.profile.findUnique({
      where: { id: targetProfileId },
      select: {
        id: true,
        userId: true,
        fullName: true,
        profession: true,
        city: true,
        state: true,
        location: true,
        profileImage: true,
        photos: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
          take: 1,
          select: { url: true, isPrimary: true },
        },
      },
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

export async function GET(
  _req: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await context.params;
  const access = await resolveChatAccess(profileId, session.user.id);

  if ("error" in access) {
    return access.error;
  }

  const { ownProfile, targetProfile } = access;
  const conversation = await findConversationForProfiles(
    ownProfile.id,
    targetProfile.id
  );

  if (conversation) {
    await prisma.chatMessage.updateMany({
      where: {
        conversationId: conversation.id,
        senderProfileId: targetProfile.id,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  const messages = conversation
    ? await prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          isRead: true,
          createdAt: true,
          senderProfileId: true,
        },
      })
    : [];

  return NextResponse.json({
    data: {
      conversationId: conversation?.id ?? null,
      viewerProfileId: ownProfile.id,
      targetProfile: {
        id: targetProfile.id,
        fullName: targetProfile.fullName,
        profession: targetProfile.profession,
        location:
          [targetProfile.city, targetProfile.state].filter(Boolean).join(", ") ||
          targetProfile.location ||
          "India",
        imageUrl: getPrimaryImage(targetProfile),
      },
      messages,
    },
  });
}

export async function POST(
  req: NextRequest,
  context: RouteContext
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { profileId } = await context.params;
  const access = await resolveChatAccess(profileId, session.user.id);

  if ("error" in access) {
    return access.error;
  }

  const { ownProfile, targetProfile } = access;

  try {
    const { content } = await req.json();
    const messageContent = typeof content === "string" ? content.trim() : "";

    if (!messageContent) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (messageContent.length > 1000) {
      return NextResponse.json(
        { error: "Message must be 1000 characters or less" },
        { status: 400 }
      );
    }

    const conversation = await getOrCreateConversation(
      ownProfile.id,
      targetProfile.id
    );
    const timestamp = new Date();

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderProfileId: ownProfile.id,
          content: messageContent,
        },
        select: {
          id: true,
          content: true,
          isRead: true,
          createdAt: true,
          senderProfileId: true,
        },
      });

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: timestamp },
      });

      return createdMessage;
    });

    publishUserNotification(targetProfile.userId, {
      type: "message",
      createdAt: message.createdAt.toISOString(),
      conversationId: conversation.id,
      messageId: message.id,
      fromProfileId: ownProfile.id,
      toProfileId: targetProfile.id,
    });

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        message,
      },
    });
  } catch (error) {
    console.error("Send chat message error:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
