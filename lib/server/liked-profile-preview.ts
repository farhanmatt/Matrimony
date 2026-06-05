import "server-only";

import type { Prisma } from "@prisma/client";
import {
  createFeaturedProfilePreviewToken,
  getFeaturedProfilePreviewSource,
} from "@/lib/server/featured-profile-preview";

const AUTHENTICATED_PROFILE_PREVIEW_ROUTE = "/api/profiles/preview";

export const profilePreviewCardSelect = {
  id: true,
  fullName: true,
  gender: true,
  dateOfBirth: true,
  height: true,
  maritalStatus: true,
  education: true,
  course: true,
  profession: true,
  location: true,
  city: true,
  state: true,
  religion: true,
  profileImage: true,
  photos: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    take: 1,
    select: {
      url: true,
      publicId: true,
      isPrimary: true,
    },
  },
} satisfies Prisma.ProfileSelect;

export const likedProfileCardSelect = {
  id: true,
  createdAt: true,
  toProfile: {
    select: profilePreviewCardSelect,
  },
} satisfies Prisma.LikeSelect;

type LikedProfileCardRecord = Prisma.LikeGetPayload<{
  select: typeof likedProfileCardSelect;
}>;

type ProfilePreviewCardRecord = Prisma.ProfileGetPayload<{
  select: typeof profilePreviewCardSelect;
}>;

export function serializeProfilePreviewCard(profile: ProfilePreviewCardRecord) {
  const previewSource = getFeaturedProfilePreviewSource(profile);
  const previewToken =
    previewSource.previewUrl && previewSource.fingerprint
      ? createFeaturedProfilePreviewToken({
          profileId: profile.id,
          fingerprint: previewSource.fingerprint,
        })
      : null;

  return {
    id: profile.id,
    fullName: profile.fullName,
    gender: profile.gender,
    dateOfBirth: profile.dateOfBirth.toISOString(),
    height: profile.height,
    maritalStatus: profile.maritalStatus,
    education: profile.education,
    course: profile.course,
    profession: profile.profession,
    location: profile.location,
    city: profile.city,
    state: profile.state,
    religion: profile.religion,
    previewImageUrl: previewToken
      ? `${AUTHENTICATED_PROFILE_PREVIEW_ROUTE}/${encodeURIComponent(previewToken)}`
      : null,
  };
}

export function serializeLikedProfileCard(like: LikedProfileCardRecord) {
  return {
    id: like.id,
    createdAt: like.createdAt.toISOString(),
    toProfile: serializeProfilePreviewCard(like.toProfile),
  };
}
