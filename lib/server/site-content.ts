import "server-only";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  isDatabaseConnectionError,
  isPrismaMissingTableError,
} from "@/lib/utils/errors";
import { calculateAge } from "@/lib/utils/helpers";
import { getAdminSettingsSnapshot } from "@/lib/utils/admin-settings";

function maskFirstName(fullName: string) {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";

  if (firstName.length <= 1) {
    return firstName;
  }

  if (firstName.length === 2) {
    return `${firstName[0]}*`;
  }

  return `${firstName[0]}${"*".repeat(
    Math.max(2, firstName.length - 2)
  )}${firstName[firstName.length - 1]}`;
}

function formatProfileLocation(profile: {
  city: string | null;
  state: string | null;
  location: string | null;
}) {
  const place = [profile.city, profile.state].filter(Boolean).join(", ");
  return place || profile.location || "India";
}

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
          fullName: true,
          dateOfBirth: true,
          location: true,
          city: true,
          state: true,
          profileImage: true,
          photos: {
            where: { isPrimary: true },
            take: 1,
            select: { url: true, isPrimary: true },
          },
        },
      });

      return {
        featuredProfiles: profiles.map((profile) => ({
          id: profile.id,
          displayName: maskFirstName(profile.fullName),
          age: calculateAge(profile.dateOfBirth),
          location: formatProfileLocation(profile),
          imageUrl: profile.profileImage ?? profile.photos[0]?.url ?? null,
        })),
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
