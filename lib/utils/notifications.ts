import { randomUUID } from "crypto";
import type { Prisma, ProfileNotificationKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createFeaturedProfilePreviewToken,
  getFeaturedProfilePreviewSource,
} from "@/lib/server/featured-profile-preview";

export type DashboardNotificationItem = {
  id: string;
  kind: "like" | "message" | "message_rejected";
  createdAt: string;
  href: string;
  actorProfileId: string;
  actorName: string;
  actorProfession: string | null;
  actorLocation: string;
  actorImageUrl: string | null;
  title: string;
  subtitle: string;
};

const AUTHENTICATED_NOTIFICATION_PROFILE_IMAGE_ROUTE =
  "/api/notifications/profile-image";

const notificationActorSelect = {
  id: true,
  fullName: true,
  city: true,
  state: true,
  location: true,
  profession: true,
  profileImage: true,
  photos: {
    where: { isPrimary: true },
    select: { url: true, publicId: true, isPrimary: true },
    take: 1,
  },
} as const;

const latestMessageNotificationSelect = {
  id: true,
  content: true,
  createdAt: true,
  senderProfile: {
    select: notificationActorSelect,
  },
} as const;

function getLocation(city?: string | null, state?: string | null, location?: string | null) {
  return [city, state].filter(Boolean).join(", ") || location || "India";
}

function getNotificationActorImageUrl(profile: {
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
    ? `${AUTHENTICATED_NOTIFICATION_PROFILE_IMAGE_ROUTE}/${encodeURIComponent(previewToken)}`
    : null;
}

function getMessagePreview(content: string, maxLength = 90) {
  const trimmed = content.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

function getProfileNotificationTitle(
  kind: ProfileNotificationKind,
  actorName: string
) {
  if (kind === "MESSAGE_REQUEST_REJECTED") {
    return `${actorName} rejected your message request`;
  }

  return `${actorName} sent you an update`;
}

function getProfileNotificationSubtitle(kind: ProfileNotificationKind) {
  if (kind === "MESSAGE_REQUEST_REJECTED") {
    return "Your recent message request was declined.";
  }

  return "You have a new profile update.";
}

type ProfileNotificationListItem = {
  id: string;
  kind: ProfileNotificationKind;
  createdAt: Date;
  actorProfileId: string;
  actorProfile: {
    id: string;
    fullName: string;
    city: string | null;
    state: string | null;
    location: string | null;
    profession: string | null;
    profileImage: string | null;
    photos: { url: string; publicId: string; isPrimary: boolean }[];
  };
};

function getProfileNotificationFindMany() {
  const delegate = (
    prisma as typeof prisma & {
      profileNotification?: {
        findMany?: (args: unknown) => Promise<ProfileNotificationListItem[]>;
      };
    }
  ).profileNotification;

  return delegate?.findMany;
}

async function getProfileNotificationsForRecipient(
  recipientProfileId: string,
  take: number
) {
  const findProfileNotifications = getProfileNotificationFindMany();

  if (findProfileNotifications) {
    return findProfileNotifications({
      where: {
        recipientProfileId,
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        kind: true,
        createdAt: true,
        actorProfileId: true,
        actorProfile: {
          select: notificationActorSelect,
        },
      },
    });
  }

  const rawNotifications = await prisma.$queryRaw<
    Array<{
      id: string;
      kind: ProfileNotificationKind;
      createdAt: Date;
      actorProfileId: string;
    }>
  >`
    SELECT
      pn."id",
      pn."kind",
      pn."createdAt",
      pn."actorProfileId"
    FROM "ProfileNotification" AS pn
    WHERE pn."recipientProfileId" = ${recipientProfileId}
    ORDER BY pn."createdAt" DESC
    LIMIT ${take}
  `;

  if (rawNotifications.length === 0) {
    return [] satisfies ProfileNotificationListItem[];
  }

  const actorProfiles = await prisma.profile.findMany({
    where: {
      id: {
        in: rawNotifications.map((notification) => notification.actorProfileId),
      },
    },
    select: notificationActorSelect,
  });

  const actorProfilesById = new Map(
    actorProfiles.map((actorProfile) => [actorProfile.id, actorProfile] as const)
  );

  return rawNotifications.reduce<ProfileNotificationListItem[]>(
    (items, notification) => {
      const actorProfile = actorProfilesById.get(notification.actorProfileId);

      if (!actorProfile) {
        return items;
      }

      items.push({
        ...notification,
        actorProfile,
      });

      return items;
    },
    []
  );
}

async function createProfileNotification(
  tx: Prisma.TransactionClient,
  recipientProfileId: string,
  actorProfileId: string,
  kind: ProfileNotificationKind
) {
  const createWithDelegate = (
    tx as Prisma.TransactionClient & {
      profileNotification?: {
        create?: (args: unknown) => Promise<unknown>;
      };
    }
  ).profileNotification?.create;

  if (createWithDelegate) {
    await createWithDelegate({
      data: {
        recipientProfileId,
        actorProfileId,
        kind,
      },
    });

    return;
  }

  await tx.$executeRaw`
    INSERT INTO "ProfileNotification" (
      "id",
      "recipientProfileId",
      "actorProfileId",
      "kind",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${recipientProfileId},
      ${actorProfileId},
      ${kind}::"ProfileNotificationKind",
      NOW()
    )
  `;
}

export async function getDashboardNotificationsForUser(userId: string): Promise<{
  profileId: string | null;
  items: DashboardNotificationItem[];
}> {
  const maxItems = 20;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    return {
      profileId: null,
      items: [],
    };
  }

  const unreadMessageWhere: Prisma.ChatMessageWhereInput = {
    isRead: false,
    senderProfileId: { not: profile.id },
    conversation: {
      OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
    },
  };

  const [receivedLikes, unreadMessageGroups, profileNotifications] = await Promise.all([
    prisma.like.findMany({
      where: { toProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      take: maxItems,
      select: {
        id: true,
        createdAt: true,
        fromProfile: {
          select: notificationActorSelect,
        },
      },
    }),
    prisma.chatMessage.groupBy({
      by: ["senderProfileId"],
      where: unreadMessageWhere,
      orderBy: {
        _max: {
          createdAt: "desc",
        },
      },
      take: maxItems,
      _count: {
        senderProfileId: true,
      },
      _max: {
        createdAt: true,
      },
    }),
    getProfileNotificationsForRecipient(profile.id, maxItems),
  ]);

  const unreadMessages = (
    await Promise.all(
      unreadMessageGroups.map(async (group) => {
        const latestCreatedAt = group._max?.createdAt;
        if (!latestCreatedAt) {
          return null;
        }

        const latestMessage = await prisma.chatMessage.findFirst({
          where: {
            ...unreadMessageWhere,
            senderProfileId: group.senderProfileId,
            createdAt: latestCreatedAt,
          },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: latestMessageNotificationSelect,
        });

        if (!latestMessage) {
          return null;
        }

        const latestPreview = getMessagePreview(latestMessage.content);
        const messageCount = group._count?.senderProfileId ?? 1;

        return {
          id: `message:${latestMessage.senderProfile.id}`,
          kind: "message" as const,
          createdAt: latestMessage.createdAt.toISOString(),
          href: `/dashboard/chat/${latestMessage.senderProfile.id}`,
          actorProfileId: latestMessage.senderProfile.id,
          actorName: latestMessage.senderProfile.fullName,
          actorProfession: latestMessage.senderProfile.profession,
          actorLocation: getLocation(
            latestMessage.senderProfile.city,
            latestMessage.senderProfile.state,
            latestMessage.senderProfile.location
          ),
          actorImageUrl: getNotificationActorImageUrl(
            latestMessage.senderProfile
          ),
          title:
            messageCount > 1
              ? `${latestMessage.senderProfile.fullName} sent you ${messageCount} messages`
              : `${latestMessage.senderProfile.fullName} sent you a message`,
          subtitle:
            messageCount > 1 ? `Latest: ${latestPreview}` : latestPreview,
        } satisfies DashboardNotificationItem;
      })
    )
  ).reduce<DashboardNotificationItem[]>(
    (items, item) => (item ? [...items, item] : items),
    []
  );

  const items = [
    ...receivedLikes.map((like) => ({
      id: like.id,
      kind: "like" as const,
      createdAt: like.createdAt.toISOString(),
      href: "/dashboard/received-likes",
      actorProfileId: like.fromProfile.id,
      actorName: like.fromProfile.fullName,
      actorProfession: like.fromProfile.profession,
      actorLocation: getLocation(
        like.fromProfile.city,
        like.fromProfile.state,
        like.fromProfile.location
      ),
      actorImageUrl: getNotificationActorImageUrl(like.fromProfile),
      title: `${like.fromProfile.fullName} liked your profile`,
      subtitle: like.fromProfile.profession ?? "Tap to view their interest.",
    })),
    ...unreadMessages,
    ...profileNotifications.map((notification) => ({
      id: notification.id,
      kind: "message_rejected" as const,
      createdAt: notification.createdAt.toISOString(),
      href: `/dashboard/chat/${notification.actorProfile.id}`,
      actorProfileId: notification.actorProfile.id,
      actorName: notification.actorProfile.fullName,
      actorProfession: notification.actorProfile.profession,
      actorLocation: getLocation(
        notification.actorProfile.city,
        notification.actorProfile.state,
        notification.actorProfile.location
      ),
      actorImageUrl: getNotificationActorImageUrl(notification.actorProfile),
      title: getProfileNotificationTitle(
        notification.kind,
        notification.actorProfile.fullName
      ),
      subtitle: getProfileNotificationSubtitle(notification.kind),
    })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  ).slice(0, maxItems);

  return {
    profileId: profile.id,
    items,
  };
}

export async function dismissUnreadMessageNotificationsForUser(
  userId: string,
  senderProfileId: string,
  action: "accept" | "reject" = "accept"
) {
  const [ownProfile, senderProfile] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    }),
    prisma.profile.findUnique({
      where: { id: senderProfileId },
      select: { id: true },
    }),
  ]);

  if (!ownProfile || !senderProfile || ownProfile.id === senderProfile.id) {
    return {
      updatedCount: 0,
    };
  }

  const messageWhere = {
    senderProfileId: senderProfile.id,
    isRead: false,
    conversation: {
      OR: [
        {
          profileAId: ownProfile.id,
          profileBId: senderProfile.id,
        },
        {
          profileAId: senderProfile.id,
          profileBId: ownProfile.id,
        },
      ],
    },
  } satisfies Prisma.ChatMessageWhereInput;

  const { updatedCount, rejectionNotificationCreated } = await prisma.$transaction(
    async (tx) => {
      const result = await tx.chatMessage.updateMany({
        where: messageWhere,
        data: {
          isRead: true,
        },
      });

      if (action !== "reject" || result.count === 0) {
        return {
          updatedCount: result.count,
          rejectionNotificationCreated: false,
        };
      }

      await createProfileNotification(
        tx,
        senderProfile.id,
        ownProfile.id,
        "MESSAGE_REQUEST_REJECTED"
      );

      return {
        updatedCount: result.count,
        rejectionNotificationCreated: true,
      };
    }
  );

  return {
    updatedCount,
    rejectionNotificationCreated,
  };
}
