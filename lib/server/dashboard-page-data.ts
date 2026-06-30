import { prisma } from "@/lib/prisma";
import { getProtectedMatchProfileImageUrl } from "@/lib/server/match-profile-preview";
import {
  likedProfileCardSelect,
  serializeLikedProfileCard,
  serializeProfilePreviewCard,
} from "@/lib/server/liked-profile-preview";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";
import { getMatchesForProfile } from "@/lib/utils/matching";
import { ensureProfileUserIdForProfile } from "@/lib/profile-user-id";

export async function getDashboardProfileSummary(userId: string) {
  const profile = await prisma.profile.findFirst({
    where: { userId, status: "ACTIVE" },
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

  const settings = await getAdminSettingsSnapshot();

  return {
    likes: likes.map(serializeLikedProfileCard),
    matches: matches.map((match) => {
      const otherProfile = match.profileAId === ownProfile.id ? match.profileB : match.profileA;
      return {
        id: match.id,
        isProfileUnlocked: match.unlocks.some(
          (unlock) => unlock.userId === userId && unlock.type === "PROFILE"
        ),
        isChatUnlocked: match.unlocks.some(
          (unlock) => unlock.userId === userId && unlock.type === "CHAT"
        ),
        otherProfile: serializeProfilePreviewCard(otherProfile as any),
      };
    }),
    pricing: {
      baseAmount: settings.baseAmount,
      profileAmount: settings.profileAmount,
      perProfileChatAmount: settings.perProfileChatAmount,
    },
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
  const otherProfileIds = matches.map((match) =>
    match.profileAId === ownProfile.id ? match.profileBId : match.profileAId
  );
  const likes = await prisma.like.findMany({
    where: {
      OR: [
        { fromProfileId: ownProfile.id, toProfileId: { in: otherProfileIds } },
        { fromProfileId: { in: otherProfileIds }, toProfileId: ownProfile.id },
      ],
    },
    select: { fromProfileId: true, toProfileId: true },
  });

  const outgoing = new Set(likes.filter(l => l.fromProfileId === ownProfile.id).map(l => l.toProfileId));
  const incoming = new Set(likes.filter(l => l.toProfileId === ownProfile.id).map(l => l.fromProfileId));

  const filteredMatches = matches.filter((match) => {
    const otherProfileId = match.profileAId === ownProfile.id ? match.profileBId : match.profileAId;
    return outgoing.has(otherProfileId) && incoming.has(otherProfileId);
  });

  const pendingMatches = filteredMatches.reduce<
    Array<{
      id: string;
      createdAt: string;
      isProfileUnlocked: false;
      isChatUnlocked: boolean;
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
    const isProfileUnlocked = match.unlocks.some(
      (unlock) => unlock.userId === userId && unlock.type === "PROFILE"
    );
    const isChatUnlocked = match.unlocks.some(
      (unlock) => unlock.userId === userId && unlock.type === "CHAT"
    );

    if (isProfileUnlocked) {
      return items;
    }

    const otherProfile =
      match.profileAId === ownProfile.id ? match.profileB : match.profileA;

    items.push({
      id: match.id,
      createdAt: match.createdAt.toISOString(),
      isProfileUnlocked: false,
      isChatUnlocked,
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
    unlockedMatchesCount: filteredMatches.length - pendingMatches.length,
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
    where: { 
      userId,
      type: "PROFILE"
    },
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
