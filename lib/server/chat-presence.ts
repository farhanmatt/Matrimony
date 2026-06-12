import "server-only";
import { prisma } from "@/lib/prisma";
import { publishUserNotification } from "@/lib/utils/notification-events";

const CHAT_PRESENCE_WINDOW_MS = 20_000;
const CHAT_PRESENCE_STALE_MS = CHAT_PRESENCE_WINDOW_MS * 6;

const activeChatProfiles = new Map<string, number>();

function pruneExpiredPresence(nowMs: number) {
  for (const [profileId, lastActiveAtMs] of activeChatProfiles.entries()) {
    if (nowMs - lastActiveAtMs > CHAT_PRESENCE_STALE_MS) {
      activeChatProfiles.delete(profileId);
    }
  }
}

function updateChatProfilePresence(profileId: string, at = new Date()) {
  const timestampMs = at.getTime();
  pruneExpiredPresence(timestampMs);
  const lastActiveAtMs = activeChatProfiles.get(profileId) ?? null;
  const wasOnline =
    lastActiveAtMs !== null &&
    timestampMs - lastActiveAtMs <= CHAT_PRESENCE_WINDOW_MS;

  activeChatProfiles.set(profileId, timestampMs);

  return {
    isOnline: true,
    lastActiveAt: at.toISOString(),
    becameOnline: !wasOnline,
  };
}

export function markChatProfileActive(profileId: string, at = new Date()) {
  const { becameOnline: _becameOnline, ...presence } = updateChatProfilePresence(
    profileId,
    at
  );

  return presence;
}

async function getPresenceSubscriberUserIds(profileId: string) {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      userId: true,
      likesSent: {
        select: {
          toProfile: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      likesReceived: {
        select: {
          fromProfile: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      matchesAsA: {
        select: {
          profileB: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      matchesAsB: {
        select: {
          profileA: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      chatConversationsAsA: {
        select: {
          profileB: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
      chatConversationsAsB: {
        select: {
          profileA: {
            select: {
              id: true,
              userId: true,
            },
          },
        },
      },
    },
  });

  if (!profile) {
    return [];
  }

  const subscriberUserIds = new Set<string>();

  const addProfileUser = (connectedProfile: { id: string; userId: string } | null) => {
    if (
      !connectedProfile ||
      connectedProfile.id === profileId ||
      connectedProfile.userId === profile.userId
    ) {
      return;
    }

    subscriberUserIds.add(connectedProfile.userId);
  };

  for (const like of profile.likesSent) {
    addProfileUser(like.toProfile);
  }

  for (const like of profile.likesReceived) {
    addProfileUser(like.fromProfile);
  }

  for (const match of profile.matchesAsA) {
    addProfileUser(match.profileB);
  }

  for (const match of profile.matchesAsB) {
    addProfileUser(match.profileA);
  }

  for (const conversation of profile.chatConversationsAsA) {
    addProfileUser(conversation.profileB);
  }

  for (const conversation of profile.chatConversationsAsB) {
    addProfileUser(conversation.profileA);
  }

  return [...subscriberUserIds];
}

export async function markChatProfileActiveAndBroadcast(
  profileId: string,
  at = new Date()
) {
  const { becameOnline, ...presence } = updateChatProfilePresence(profileId, at);

  if (!becameOnline) {
    return presence;
  }

  const subscriberUserIds = await getPresenceSubscriberUserIds(profileId);

  for (const userId of subscriberUserIds) {
    publishUserNotification(userId, {
      type: "presence_updated",
      profileId,
      isOnline: true,
      lastActiveAt: presence.lastActiveAt,
    });
  }

  return presence;
}

export function getChatProfilePresence(profileId: string, now = new Date()) {
  const nowMs = now.getTime();
  pruneExpiredPresence(nowMs);

  const lastActiveAtMs = activeChatProfiles.get(profileId) ?? null;
  const isOnline =
    lastActiveAtMs !== null && nowMs - lastActiveAtMs <= CHAT_PRESENCE_WINDOW_MS;

  return {
    isOnline,
    lastActiveAt:
      lastActiveAtMs !== null ? new Date(lastActiveAtMs).toISOString() : null,
  };
}
