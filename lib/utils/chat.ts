import { getPrismaClient } from "@/lib/prisma";

export function normalizeConversationPair(profileAId: string, profileBId: string) {
  return profileAId < profileBId
    ? { profileAId, profileBId }
    : { profileAId: profileBId, profileBId: profileAId };
}

export async function findConversationForProfiles(
  profileAId: string,
  profileBId: string
) {
  const prisma = getPrismaClient();

  return prisma.chatConversation.findUnique({
    where: {
      profileAId_profileBId: normalizeConversationPair(profileAId, profileBId),
    },
  });
}

export async function canStartChatForProfiles(
  viewerProfileId: string,
  targetProfileId: string
) {
  if (viewerProfileId === targetProfileId) {
    return false;
  }

  const prisma = getPrismaClient();
  const pair = normalizeConversationPair(viewerProfileId, targetProfileId);
  const [existingConversation, outgoingLike, incomingLike, existingMatch] =
    await Promise.all([
      prisma.chatConversation.findUnique({
        where: { profileAId_profileBId: pair },
        select: { id: true },
      }),
      prisma.like.findUnique({
        where: {
          fromProfileId_toProfileId: {
            fromProfileId: viewerProfileId,
            toProfileId: targetProfileId,
          },
        },
        select: { id: true },
      }),
      prisma.like.findUnique({
        where: {
          fromProfileId_toProfileId: {
            fromProfileId: targetProfileId,
            toProfileId: viewerProfileId,
          },
        },
        select: { id: true },
      }),
      prisma.match.findUnique({
        where: { profileAId_profileBId: pair },
        select: { id: true },
      }),
    ]);

  return Boolean(
    existingConversation || outgoingLike || incomingLike || existingMatch
  );
}

export async function getOrCreateConversation(
  viewerProfileId: string,
  targetProfileId: string,
  initiatorProfileId: string
) {
  const prisma = getPrismaClient();
  const pair = normalizeConversationPair(viewerProfileId, targetProfileId);

  try {
    const conversation = await prisma.chatConversation.upsert({
      where: { profileAId_profileBId: pair },
      update: {},
      create: {
        ...pair,
        initiatorProfileId,
      },
    });

    // Also ensure a Match record exists for this pair to support unlocking
    await prisma.match.upsert({
      where: { profileAId_profileBId: pair },
      update: {},
      create: pair,
    });

    return conversation;
  } catch (error: any) {
    if (error.code === "P2002") {
      const existing = await prisma.chatConversation.findUnique({
        where: { profileAId_profileBId: pair },
      });
      if (existing) {
        // Still ensure match exists even if conversation already did
        await prisma.match.upsert({
          where: { profileAId_profileBId: pair },
          update: {},
          create: pair,
        }).catch(() => {}); // Ignore errors if match also existed
        return existing;
      }
    }
    throw error;
  }
}
