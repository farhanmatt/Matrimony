import { prisma } from "@/lib/prisma";
import { getProtectedMatchProfileImageUrl } from "@/lib/server/match-profile-preview";
import {
  likedProfileCardSelect,
  serializeLikedProfileCard,
} from "@/lib/server/liked-profile-preview";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";
import { getMatchesForProfile } from "@/lib/utils/matching";
import { ensureProfileUserIdForProfile } from "@/lib/profile-user-id";

export async function getDashboardProfileSummary(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      id: true,
      profileUserId: true,
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

  const profileUserId =
    profile.profileUserId ??
    (await ensureProfileUserIdForProfile({
      id: profile.id,
      gender: profile.gender,
      profileUserId: profile.profileUserId,
    }));

  return {
    id: profile.id,
    profileUserId,
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
      select: likedProfileCardSelect,
      orderBy: { createdAt: "desc" },
    }),
    getMatchesForProfile(ownProfile.id),
  ]);

  return {
    likes: likes.map(serializeLikedProfileCard),
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
  const pendingMatches = matches.reduce<
    Array<{
      id: string;
      createdAt: string;
      isUnlocked: false;
      otherProfile: {
        id: string;
        fullName: string;
        gender: string;
        dateOfBirth: string;
        height: number | null;
        maritalStatus: string;
        profession: string | null;
        city: string | null;
        state: string | null;
        religion: string | null;
        education: string | null;
        course: string | null;
        phone: null;
        previewImageUrl: string | null;
      };
    }>
  >((items, match) => {
    const isUnlocked = match.unlocks.some((unlock) => unlock.userId === userId);
    if (isUnlocked) {
      return items;
    }

    const otherProfile =
      match.profileAId === ownProfile.id ? match.profileB : match.profileA;

    items.push({
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      isUnlocked: false,
      otherProfile: {
        id: otherProfile.id,
        fullName: otherProfile.fullName,
        gender: otherProfile.gender,
        dateOfBirth: otherProfile.dateOfBirth.toISOString(),
        height: otherProfile.height,
        maritalStatus: otherProfile.maritalStatus,
        profession: otherProfile.profession,
        city: otherProfile.city,
        state: otherProfile.state,
        religion: otherProfile.religion,
        education: otherProfile.education,
        course: otherProfile.course,
        phone: null,
        previewImageUrl: getProtectedMatchProfileImageUrl(otherProfile),
      },
    });

    return items;
  }, []);

  return {
    matches: pendingMatches,
    unlockedMatchesCount: matches.length - pendingMatches.length,
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
