import { prisma } from "@/lib/prisma";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";
import { getMatchesForProfile } from "@/lib/utils/matching";

export async function getDashboardProfileSummary(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      gender: true,
      profileImage: true,
      photos: {
        where: { isPrimary: true },
        select: { url: true, isPrimary: true },
        take: 1,
      },
    },
  });

  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    gender: profile.gender,
    accountImage: profile.profileImage ?? profile.photos[0]?.url ?? null,
  };
}

export async function getLikedPageData(userId: string) {
  const ownProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!ownProfile) {
    return {
      likes: [],
      matches: [],
    };
  }

  const [likes, matches] = await Promise.all([
    prisma.like.findMany({
      where: { fromProfileId: ownProfile.id },
      include: {
        toProfile: {
          include: { photos: { where: { isPrimary: true }, take: 1 } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    getMatchesForProfile(ownProfile.id),
  ]);

  return {
    likes: likes.map((like) => ({
      id: like.id,
      createdAt: like.createdAt.toISOString(),
      toProfile: {
        ...like.toProfile,
        dateOfBirth: like.toProfile.dateOfBirth.toISOString(),
      },
    })),
    matches: matches.map((match) => ({
      id: match.id,
      isUnlocked: match.unlocks.some((unlock) => unlock.userId === userId),
      otherProfile: {
        id: match.profileAId === ownProfile.id ? match.profileB.id : match.profileA.id,
      },
    })),
  };
}

export async function getMatchesPageData(userId: string) {
  const ownProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  const settings = await getAdminSettingsSnapshot();

  if (!ownProfile) {
    return {
      matches: [],
      unlockedMatchesCount: 0,
      pricing: {
        baseAmount: settings.baseAmount,
        profileAmount: settings.profileAmount,
        perProfileChatAmount: settings.perProfileChatAmount,
      },
    };
  }

  const matches = await getMatchesForProfile(ownProfile.id);
  const allMatches = matches.map((match) => ({
    id: match.id,
    otherProfile:
      match.profileAId === ownProfile.id ? match.profileB : match.profileA,
    isUnlocked: match.unlocks.some((unlock) => unlock.userId === userId),
    createdAt: match.createdAt.toISOString(),
  }));
  const pendingMatches = allMatches
    .filter((match) => !match.isUnlocked)
    .map((match) => ({
      ...match,
      otherProfile: {
        ...match.otherProfile,
        dateOfBirth: match.otherProfile.dateOfBirth.toISOString(),
      },
    }));

  return {
    matches: pendingMatches,
    unlockedMatchesCount: allMatches.length - pendingMatches.length,
    pricing: {
      baseAmount: settings.baseAmount,
      profileAmount: settings.profileAmount,
      perProfileChatAmount: settings.perProfileChatAmount,
    },
  };
}

export async function getUnlockedPageData(userId: string) {
  const ownProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!ownProfile) {
    return {
      unlocks: [],
      ownProfileId: null,
    };
  }

  const unlocks = await prisma.unlock.findMany({
    where: { userId },
    include: {
      payment: { select: { amount: true, createdAt: true } },
      match: {
        include: {
          profileA: { include: { photos: true } },
          profileB: { include: { photos: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    ownProfileId: ownProfile.id,
    unlocks: unlocks.map((unlock) => ({
      id: unlock.id,
      createdAt: unlock.createdAt.toISOString(),
      payment: {
        amount: unlock.payment.amount,
        createdAt: unlock.payment.createdAt.toISOString(),
      },
      match: {
        profileA: {
          ...unlock.match.profileA,
          dateOfBirth: unlock.match.profileA.dateOfBirth.toISOString(),
          updatedAt: unlock.match.profileA.updatedAt.toISOString(),
        },
        profileB: {
          ...unlock.match.profileB,
          dateOfBirth: unlock.match.profileB.dateOfBirth.toISOString(),
          updatedAt: unlock.match.profileB.updatedAt.toISOString(),
        },
      },
    })),
  };
}
