import "server-only";

import {
  createFeaturedProfilePreviewToken,
  getFeaturedProfilePreviewSource,
} from "@/lib/server/featured-profile-preview";

const PROTECTED_MATCH_PROFILE_IMAGE_ROUTE = "/api/matches/profile-image";

type MatchProfilePreviewSource = {
  id: string;
  profileImage?: string | null;
  photos: Array<{
    url: string;
    publicId: string;
  }>;
};

export function getProtectedMatchProfileImageUrl(
  profile: MatchProfilePreviewSource
) {
  const previewSource = getFeaturedProfilePreviewSource({
    profileImage: profile.profileImage ?? null,
    photos: profile.photos,
  });
  return previewSource.previewUrl;
}
