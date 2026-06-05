import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConnectionError,
  isPrismaMissingTableError,
} from "@/lib/utils/errors";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";
import { toPublicLandingFeaturedProfile } from "@/lib/server/featured-profile-preview";

export const getCachedSiteBranding = unstable_cache(
  async () => {
    const settings = await getAdminSettingsSnapshot();

    return {
      heroImageUrl: settings.heroImageUrl?.trim() || "/main.jpeg",
      logoImageUrl: settings.logoImageUrl?.trim() || "/default-logo.svg",
    };
  },
  ["site-branding"],
  {
    revalidate: 300,
    tags: ["admin-settings"],
  }
);

export const getCachedFeaturedProfiles = unstable_cache(
  async () => {
    try {
      const profiles = await prisma.profile.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          state: true,
          country: true,
          profileImage: true,
          photos: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, publicId: true },
          },
        },
      });

      return {
        featuredProfiles: profiles.map(toPublicLandingFeaturedProfile),
        featuredProfilesUnavailable: false,
      };
    } catch (error) {
      if (isDatabaseConnectionError(error) || isPrismaMissingTableError(error)) {
        console.warn(
          "Featured profiles are temporarily unavailable because the database is not ready.",
          error
        );

        return {
          featuredProfiles: [],
          featuredProfilesUnavailable: true,
        };
      }

      throw error;
    }
  },
  ["featured-profiles"],
  {
    revalidate: 300,
    tags: ["featured-profiles"],
  }
);
