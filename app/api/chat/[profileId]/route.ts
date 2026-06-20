import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  createFeaturedProfilePreviewToken,
  getFeaturedProfilePreviewSource,
} from "@/lib/server/featured-profile-preview";
import {
  getChatProfilePresence,
  markChatProfileActiveAndBroadcast,
} from "@/lib/server/chat-presence";
import { publishUserNotification } from "@/lib/utils/notification-events";
import {
  canStartChatForProfiles,
  findConversationForProfiles,
  getOrCreateConversation,
} from "@/lib/utils/chat";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

const PROTECTED_CHAT_PROFILE_IMAGE_ROUTE = "/api/chat/profile-image";

const chatMessageSelect = {
  id: true,
  content: true,
  isRead: true,
  isSystemMessage: true,
  systemAction: true,
  createdAt: true,
  updatedAt: true,
  senderProfileId: true,
  replyToMessageId: true,
  replyToMessage: {
    select: {
      id: true,
      content: true,
      senderProfileId: true,
    },
  },
} as const;

function getProtectedChatImageUrl(profile: {
  id: string;
  profileImage?: string | null;
  photos: { url: string; publicId: string; isPrimary: boolean }[];
}) {
  const previewSource = getFeaturedProfilePreviewSource({
    ...profile,
    profileImage: profile.profileImage ?? null,
  });
  const previewToken =
    previewSource.previewUrl && previewSource.fingerprint
      ? createFeaturedProfilePreviewToken({
          profileId: profile.id,
          fingerprint: previewSource.fingerprint,
        })
      : null;

  return previewToken
    ? `${PROTECTED_CHAT_PROFILE_IMAGE_ROUTE}/${encodeURIComponent(previewToken)}`
    : null;
}

async function resolveChatAccess(targetProfileId: string, userId: string) {
  const [ownProfile, targetProfile] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { id: true, fullName: true, userId: true },
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
          select: { url: true, publicId: true, isPrimary: true },
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
  await markChatProfileActiveAndBroadcast(ownProfile.id);
  const targetPresence = getChatProfilePresence(targetProfile.id);
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

  const pair = {
    profileAId: ownProfile.id < targetProfile.id ? ownProfile.id : targetProfile.id,
    profileBId: ownProfile.id < targetProfile.id ? targetProfile.id : ownProfile.id,
  };

  let match;
  try {
    match = await prisma.match.upsert({
      where: { profileAId_profileBId: pair },
      update: {},
      create: pair,
      include: {
        unlocks: {
          where: { userId: session.user.id, type: "CHAT" },
        },
      },
    });
  } catch (error: any) {
    // Handle race condition where another request created the match between where and create
    if (error.code === "P2002") {
      match = await prisma.match.findUnique({
        where: { profileAId_profileBId: pair },
        include: {
          unlocks: {
            where: { userId: session.user.id, type: "CHAT" },
          },
        },
      });
      if (!match) throw error;
    } else {
      throw error;
    }
  }

  const settings = await getAdminSettingsSnapshot();
  const isUnlockedDefault = Boolean(match.unlocks.length);
  const isUnlocked = !settings.isChatPaymentEnabled || isUnlockedDefault || conversation?.status === "ACCEPTED";

  const messages = conversation
    ? await prisma.chatMessage.findMany({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "asc" },
        select: chatMessageSelect,
      })
    : [];

  return NextResponse.json({
    data: {
      conversationId: conversation?.id ?? null,
      status: conversation?.status ?? "PENDING",
      initiatorProfileId: conversation?.initiatorProfileId ?? null,
      isUnlocked,
      matchId: match?.id ?? null,
      viewerProfileId: ownProfile.id,
      pricing: {
        baseAmount: settings.baseAmount,
        profileAmount: settings.profileAmount,
        perProfileChatAmount: settings.perProfileChatAmount,
        isChatPaymentEnabled: settings.isChatPaymentEnabled,
      },
      targetProfile: {
        id: targetProfile.id,
        fullName: targetProfile.fullName,
        profession: targetProfile.profession,
        location:
          [targetProfile.city, targetProfile.state].filter(Boolean).join(", ") ||
          targetProfile.location ||
          "India",
        imageUrl: getProtectedChatImageUrl(targetProfile),
        isOnline: targetPresence.isOnline,
        lastActiveAt: targetPresence.lastActiveAt,
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
  await markChatProfileActiveAndBroadcast(ownProfile.id);

  // Enforce chat unlock payment check
  const settings = await getAdminSettingsSnapshot();
  if (settings.isChatPaymentEnabled) {
    const pair = {
      profileAId: ownProfile.id < targetProfile.id ? ownProfile.id : targetProfile.id,
      profileBId: ownProfile.id < targetProfile.id ? targetProfile.id : ownProfile.id,
    };
    const match = await prisma.match.findUnique({
      where: { profileAId_profileBId: pair },
      include: {
        unlocks: {
          where: { userId: session.user.id, type: "CHAT" },
        },
      },
    });
    const conversation = await findConversationForProfiles(ownProfile.id, targetProfile.id);
    const isUnlocked = Boolean(match?.unlocks.length) || conversation?.status === "ACCEPTED";
    if (!isUnlocked) {
      return NextResponse.json({ error: "Chat is locked. Payment required." }, { status: 402 });
    }
  }

  try {
    const { content, replyToMessageId } = await req.json();
    const messageContent = typeof content === "string" ? content.trim() : "";
    const normalizedReplyToMessageId =
      typeof replyToMessageId === "string" ? replyToMessageId.trim() : "";

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
      targetProfile.id,
      ownProfile.id
    );
    
    const replyTarget = normalizedReplyToMessageId
      ? await prisma.chatMessage.findFirst({
          where: {
            id: normalizedReplyToMessageId,
            conversationId: conversation.id,
          },
          select: { id: true },
        })
      : null;

    if (normalizedReplyToMessageId && !replyTarget) {
      return NextResponse.json(
        { error: "Reply message not found in this conversation" },
        { status: 400 }
      );
    }

    const timestamp = new Date();

    const message = await prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatMessage.create({
        data: {
          conversationId: conversation.id,
          senderProfileId: ownProfile.id,
          content: messageContent,
          replyToMessageId: replyTarget?.id ?? null,
        },
        select: chatMessageSelect,
      });

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: timestamp },
      });

      return createdMessage;
    });

    publishUserNotification(targetProfile.userId, {
      type: "message_created",
      createdAt: message.createdAt.toISOString(),
      conversationId: conversation.id,
      messageId: message.id,
      fromProfileId: ownProfile.id,
      toProfileId: targetProfile.id,
    });

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        status: conversation.status,
        initiatorProfileId: conversation.initiatorProfileId,
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

export async function PUT(
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
    const { action } = await req.json(); // "ACCEPT" or "REJECT"

    const conversation = await findConversationForProfiles(
      ownProfile.id,
      targetProfile.id
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.initiatorProfileId === ownProfile.id) {
      return NextResponse.json(
        { error: "Only the recipient can accept or reject the chat request" },
        { status: 403 }
      );
    }

    const newStatus = action === "ACCEPT" ? "ACCEPTED" : "REJECTED";

    const updatedConversation = await prisma.$transaction(async (tx) => {
      const conv = await tx.chatConversation.update({
        where: { id: conversation.id },
        data: { 
          status: newStatus,
          updatedAt: new Date(),
        },
      });

      // Add a system message
      await tx.chatMessage.create({
        data: {
          conversationId: conv.id,
          senderProfileId: ownProfile.id,
          isSystemMessage: true,
          systemAction: action === "ACCEPT" ? "REQUEST_ACCEPTED" : "REQUEST_REJECTED",
          content: action === "ACCEPT" 
            ? `${ownProfile.fullName} accepted the chat request.` 
            : `${ownProfile.fullName} declined the chat request.`,
        }
      });

      return conv;
    });

    publishUserNotification(targetProfile.userId, {
      type: "status_updated",
      status: newStatus,
      createdAt: updatedConversation.updatedAt.toISOString(),
      conversationId: updatedConversation.id,
      fromProfileId: ownProfile.id,
      toProfileId: targetProfile.id,
    });

    return NextResponse.json({
      success: true,
      data: {
        status: updatedConversation.status,
      }
    });

  } catch (error) {
    console.error("Update chat status error:", error);
    return NextResponse.json(
      { error: "Failed to update chat status" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
  await markChatProfileActiveAndBroadcast(ownProfile.id);

  try {
    const { messageId, content } = await req.json();
    const normalizedMessageId =
      typeof messageId === "string" ? messageId.trim() : "";
    const messageContent = typeof content === "string" ? content.trim() : "";

    if (!normalizedMessageId) {
      return NextResponse.json(
        { error: "Message id is required" },
        { status: 400 }
      );
    }

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

    const conversation = await findConversationForProfiles(
      ownProfile.id,
      targetProfile.id
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const existingMessage = await prisma.chatMessage.findFirst({
      where: {
        id: normalizedMessageId,
        conversationId: conversation.id,
        senderProfileId: ownProfile.id,
      },
      select: { id: true },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    const message = await prisma.chatMessage.update({
      where: { id: existingMessage.id },
      data: { content: messageContent },
      select: chatMessageSelect,
    });

    publishUserNotification(targetProfile.userId, {
      type: "message_updated",
      createdAt: message.updatedAt.toISOString(),
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
    console.error("Update chat message error:", error);
    return NextResponse.json(
      { error: "Failed to update message" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
  await markChatProfileActiveAndBroadcast(ownProfile.id);

  try {
    const { messageId } = await req.json();
    const normalizedMessageId =
      typeof messageId === "string" ? messageId.trim() : "";

    if (!normalizedMessageId) {
      return NextResponse.json(
        { error: "Message id is required" },
        { status: 400 }
      );
    }

    const conversation = await findConversationForProfiles(
      ownProfile.id,
      targetProfile.id
    );

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    const existingMessage = await prisma.chatMessage.findFirst({
      where: {
        id: normalizedMessageId,
        conversationId: conversation.id,
        senderProfileId: ownProfile.id,
      },
      select: { id: true },
    });

    if (!existingMessage) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.chatMessage.delete({
        where: { id: existingMessage.id },
      });

      const latestRemainingMessage = await tx.chatMessage.findFirst({
        where: { conversationId: conversation.id },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      await tx.chatConversation.update({
        where: { id: conversation.id },
        data: {
          lastMessageAt:
            latestRemainingMessage?.createdAt ?? conversation.createdAt,
        },
      });
    });

    publishUserNotification(targetProfile.userId, {
      type: "message_deleted",
      createdAt: new Date().toISOString(),
      conversationId: conversation.id,
      messageId: existingMessage.id,
      fromProfileId: ownProfile.id,
      toProfileId: targetProfile.id,
    });

    return NextResponse.json({
      data: {
        conversationId: conversation.id,
        messageId: existingMessage.id,
      },
    });
  } catch (error) {
    console.error("Delete chat message error:", error);
    return NextResponse.json(
      { error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
