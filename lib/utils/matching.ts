import { prisma } from "@/lib/prisma";

function normalizeMatchPair(profileAId: string, profileBId: string) {
  return profileAId < profileBId
    ? { profileAId, profileBId }
    : { profileAId: profileBId, profileBId: profileAId };
}

async function cleanupStaleMatchIfUnused(profileAId: string, profileBId: string) {
  const pair = normalizeMatchPair(profileAId, profileBId);
  const match = await prisma.match.findUnique({
    where: { profileAId_profileBId: pair },
    select: {
      id: true,
      unlocks: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (match && match.unlocks.length === 0) {
    await prisma.match.delete({
      where: { id: match.id },
    });
  }
}

export async function syncMatchesFromMutualLikes() {
  const likes = await prisma.like.findMany({
    select: {
      fromProfileId: true,
      toProfileId: true,
    },
  });

  if (likes.length === 0) {
    return 0;
  }

  const likePairs = new Set(
    likes.map((like) => `${like.fromProfileId}->${like.toProfileId}`)
  );
  const mutualPairs = new Map<string, { profileAId: string; profileBId: string }>();

  for (const like of likes) {
    const reverseKey = `${like.toProfileId}->${like.fromProfileId}`;
    if (!likePairs.has(reverseKey)) {
      continue;
    }

    const { profileAId, profileBId } = normalizeMatchPair(
      like.fromProfileId,
      like.toProfileId
    );
    const key = `${profileAId}|${profileBId}`;
    if (!mutualPairs.has(key)) {
      mutualPairs.set(key, { profileAId, profileBId });
    }
  }

  if (mutualPairs.size === 0) {
    return 0;
  }

  const results = await Promise.all(
    Array.from(mutualPairs.values()).map(async (pair) => {
      try {
        return await prisma.match.upsert({
          where: { profileAId_profileBId: pair },
          update: {},
          create: pair,
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          return await prisma.match.findUnique({
            where: { profileAId_profileBId: pair },
          });
        }
        throw error;
      }
    })
  );

  return results.length;
}

export async function hasMutualLike(profileAId: string, profileBId: string) {
  const likes = await prisma.like.findMany({
    where: {
      OR: [
        { fromProfileId: profileAId, toProfileId: profileBId },
        { fromProfileId: profileBId, toProfileId: profileAId },
      ],
    },
    select: {
      fromProfileId: true,
      toProfileId: true,
    },
  });

  const hasForwardLike = likes.some(
    (like) =>
      like.fromProfileId === profileAId && like.toProfileId === profileBId
  );
  const hasReverseLike = likes.some(
    (like) =>
      like.fromProfileId === profileBId && like.toProfileId === profileAId
  );

  return hasForwardLike && hasReverseLike;
}

/**
 * Creates a Like from profileA to profileB.
 * If the reverse like already exists, creates a Match record.
 * Returns whether the like exists, whether it became a match,
 * and whether this request created a brand-new like row.
 */
export async function likeProfile(
  fromProfileId: string,
  toProfileId: string
): Promise<{ liked: boolean; matched: boolean; created: boolean }> {
  if (fromProfileId === toProfileId) {
    return { liked: false, matched: false, created: false };
  }

  const createResult = await prisma.like.createMany({
    data: [{ fromProfileId, toProfileId }],
    skipDuplicates: true,
  });
  const created = createResult.count > 0;

  const reverseLike = await prisma.like.findUnique({
    where: {
      fromProfileId_toProfileId: {
        fromProfileId: toProfileId,
        toProfileId: fromProfileId,
      },
    },
  });

  if (!reverseLike) {
    return { liked: true, matched: false, created };
  }

  const { profileAId, profileBId } = normalizeMatchPair(
    fromProfileId,
    toProfileId
  );

  try {
    await prisma.match.upsert({
      where: { profileAId_profileBId: { profileAId, profileBId } },
      update: {},
      create: { profileAId, profileBId },
    });
  } catch (error: any) {
    if (error.code !== "P2002") {
      throw error;
    }
    // If it's P2002, the match already exists, which is what we want
  }

  return { liked: true, matched: true, created };
}

/**
 * Removes a Like from profileA to profileB.
 * Returns { unliked: boolean }.
 */
export async function unlikeProfile(
  fromProfileId: string,
  toProfileId: string
): Promise<{ unliked: boolean }> {
  if (fromProfileId === toProfileId) {
    return { unliked: false };
  }

  const result = await prisma.like.deleteMany({
    where: {
      fromProfileId,
      toProfileId,
    },
  });

  if (result.count > 0) {
    await cleanupStaleMatchIfUnused(fromProfileId, toProfileId);
  }

  return { unliked: result.count > 0 };
}

/**
 * Check if a stored match exists between two profiles (in any order).
 */
export async function findMatch(profileAId: string, profileBId: string) {
  const pair = normalizeMatchPair(profileAId, profileBId);

  return prisma.match.findUnique({
    where: { profileAId_profileBId: pair },
  });
}

/**
 * Check whether a viewer can access another profile through an unlock record.
 * Returns the unlock row when present; returns null for non-unlocked pairs.
 */
export async function findUnlockForProfiles(
  userId: string,
  viewerProfileId: string,
  targetProfileId: string,
  type?: "PROFILE" | "CHAT"
) {
  if (viewerProfileId === targetProfileId) {
    return null;
  }

  return prisma.unlock.findFirst({
    where: {
      userId,
      match: {
        OR: [
          {
            profileAId: viewerProfileId,
            profileBId: targetProfileId,
          },
          {
            profileAId: targetProfileId,
            profileBId: viewerProfileId,
          },
        ],
      },
      ...(type ? { type } : {}),
    },
    select: {
      id: true,
      matchId: true,
      type: true,
    },
  });
}

/**
 * Get all currently valid mutual matches for a profile.
 * Stale match rows without unlocks are cleaned up automatically.
 */
export async function syncMatchesFromConversations() {
  const conversations = await prisma.chatConversation.findMany({
    select: {
      profileAId: true,
      profileBId: true,
    },
  });

  if (conversations.length === 0) return 0;

  const results = await Promise.all(
    conversations.map(async (conv) => {
      const pair = { profileAId: conv.profileAId, profileBId: conv.profileBId };
      try {
        return await prisma.match.upsert({
          where: { profileAId_profileBId: pair },
          update: {},
          create: pair,
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          return prisma.match.findUnique({
            where: { profileAId_profileBId: pair },
          });
        }
        throw error;
      }
    })
  );

  return results.length;
}

export async function findOrCreateMatch(profileAId: string, profileBId: string) {
  const pair = normalizeMatchPair(profileAId, profileBId);
  try {
    return await prisma.match.upsert({
      where: { profileAId_profileBId: pair },
      update: {},
      create: pair,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return prisma.match.findUnique({
        where: { profileAId_profileBId: pair },
      });
    }
    throw error;
  }
}



export async function getMatchesForProfile(profileId: string) {
  await syncMatchesFromMutualLikes();
  await syncMatchesFromConversations();

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ profileAId: profileId }, { profileBId: profileId }],
    },
    include: {
      profileA: {
        include: { photos: true, user: { select: { email: true } } },
      },
      profileB: {
        include: { photos: true, user: { select: { email: true } } },
      },
      unlocks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (matches.length === 0) {
    return [];
  }

  const otherProfileIds = Array.from(
    new Set(
      matches.map((match) =>
        match.profileAId === profileId ? match.profileBId : match.profileAId
      )
    )
  );

  const likes = await prisma.like.findMany({
    where: {
      OR: [
        {
          fromProfileId: profileId,
          toProfileId: { in: otherProfileIds },
        },
        {
          fromProfileId: { in: otherProfileIds },
          toProfileId: profileId,
        },
      ],
    },
    select: {
      fromProfileId: true,
      toProfileId: true,
    },
  });

  const outgoingLikes = new Set(
    likes
      .filter((like) => like.fromProfileId === profileId)
      .map((like) => like.toProfileId)
  );
  const incomingLikes = new Set(
    likes
      .filter((like) => like.toProfileId === profileId)
      .map((like) => like.fromProfileId)
  );

  const conversations = await prisma.chatConversation.findMany({
    where: {
      OR: [{ profileAId: profileId }, { profileBId: profileId }],
    },
    select: {
      profileAId: true,
      profileBId: true,
    },
  });

  const conversationProfileIds = new Set(
    conversations.flatMap((c) => [c.profileAId, c.profileBId])
  );

  const staleUnlockedFreeMatchIds: string[] = [];
  const activeMatches = matches.filter((match) => {
    const otherProfileId =
      match.profileAId === profileId ? match.profileBId : match.profileAId;

    const isMutual =
      outgoingLikes.has(otherProfileId) && incomingLikes.has(otherProfileId);

    const hasConversation = conversationProfileIds.has(otherProfileId);

    const hasUnlock = match.unlocks.length > 0;

    if (!isMutual && !hasConversation && !hasUnlock) {
      staleUnlockedFreeMatchIds.push(match.id);
    }

    return isMutual || hasConversation || hasUnlock;
  });

  if (staleUnlockedFreeMatchIds.length > 0) {
    await prisma.match.deleteMany({
      where: {
        id: { in: staleUnlockedFreeMatchIds },
      },
    });
  }

  return activeMatches;
}
