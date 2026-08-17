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
    const settings = await getAdminSettingsSnapshot() as any;

    return {
      heroImageUrl: settings.heroImageUrl?.trim() || "/main.jpeg",
      logoImageUrl: settings.logoImageUrl?.trim() || "/default-logo.svg",
      officialEmail: settings.officialEmail?.trim() || "support@fmlpmatrimony.com",
      doorNumber: settings.doorNumber || null,
      streetName: settings.streetName || null,
      roadName: settings.roadName || null,
      areaLocality: settings.areaLocality || null,
      city: settings.city || null,
      district: settings.district || null,
      state: settings.state || null,
      pincode: settings.pincode || null,
      country: settings.country || null,
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
          fullName: true,
          gender: true,
          dateOfBirth: true,
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

export const getCachedSuccessStories = unstable_cache(
  async () => {
    try {
      // @ts-ignore
      const stories = await prisma.successStory.findMany({
        orderBy: { createdAt: "desc" },
      });

      return {
        successStories: stories,
        successStoriesUnavailable: false,
      };
    } catch (error) {
      if (isDatabaseConnectionError(error) || isPrismaMissingTableError(error)) {
        return {
          successStories: [],
          successStoriesUnavailable: true,
        };
      }

      throw error;
    }
  },
  ["success-stories"],
  {
    revalidate: 300,
    tags: ["success-stories"],
  }
);

