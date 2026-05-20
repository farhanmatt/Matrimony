import { prisma } from "@/lib/prisma";

export type DashboardNotificationItem = {
  id: string;
  kind: "like" | "message";
  createdAt: string;
  href: string;
  actorName: string;
  actorProfession: string | null;
  actorLocation: string;
  actorImageUrl: string | null;
  title: string;
  subtitle: string;
};

function getLocation(city?: string | null, state?: string | null, location?: string | null) {
  return [city, state].filter(Boolean).join(", ") || location || "India";
}

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

function getMessagePreview(content: string, maxLength = 90) {
  const trimmed = content.trim().replace(/\s+/g, " ");

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 1).trimEnd()}...`;
}

export async function getDashboardNotificationsForUser(userId: string): Promise<{
  profileId: string | null;
  items: DashboardNotificationItem[];
}> {
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

  const [receivedLikes, unreadMessages] = await Promise.all([
    prisma.like.findMany({
      where: { toProfileId: profile.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        createdAt: true,
        fromProfile: {
          select: {
            id: true,
            fullName: true,
            city: true,
            state: true,
            location: true,
            profession: true,
            profileImage: true,
            photos: {
              where: { isPrimary: true },
              select: { url: true, isPrimary: true },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.chatMessage.findMany({
      where: {
        isRead: false,
        senderProfileId: { not: profile.id },
        conversation: {
          OR: [{ profileAId: profile.id }, { profileBId: profile.id }],
        },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        content: true,
        createdAt: true,
        senderProfile: {
          select: {
            id: true,
            fullName: true,
            city: true,
            state: true,
            location: true,
            profession: true,
            profileImage: true,
            photos: {
              where: { isPrimary: true },
              select: { url: true, isPrimary: true },
              take: 1,
            },
          },
        },
      },
    }),
  ]);

  const items = [
    ...receivedLikes.map((like) => ({
      id: like.id,
      kind: "like" as const,
      createdAt: like.createdAt.toISOString(),
      href: "/dashboard/received-likes",
      actorName: like.fromProfile.fullName,
      actorProfession: like.fromProfile.profession,
      actorLocation: getLocation(
        like.fromProfile.city,
        like.fromProfile.state,
        like.fromProfile.location
      ),
      actorImageUrl: getPrimaryImage(like.fromProfile),
      title: `${like.fromProfile.fullName} liked your profile`,
      subtitle: like.fromProfile.profession ?? "Tap to view their interest.",
    })),
    ...unreadMessages.map((message) => ({
      id: message.id,
      kind: "message" as const,
      createdAt: message.createdAt.toISOString(),
      href: `/dashboard/chat/${message.senderProfile.id}`,
      actorName: message.senderProfile.fullName,
      actorProfession: message.senderProfile.profession,
      actorLocation: getLocation(
        message.senderProfile.city,
        message.senderProfile.state,
        message.senderProfile.location
      ),
      actorImageUrl: getPrimaryImage(message.senderProfile),
      title: `${message.senderProfile.fullName} sent you a message`,
      subtitle: getMessagePreview(message.content),
    })),
  ].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );

  return {
    profileId: profile.id,
    items,
  };
}
