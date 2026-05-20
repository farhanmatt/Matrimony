import type { Metadata } from "next";
import FullLandingPage from "@/components/landing/FullLandingPage";
import { prisma } from "@/lib/prisma";
import { isDatabaseConnectionError } from "@/lib/utils/errors";
import { calculateAge } from "@/lib/utils/helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Vivah Bandhan - Find Your Perfect Life Partner",
  description:
    "Find your perfect life partner with Vivah Bandhan. Explore verified profiles, success stories, membership plans, and premium matchmaking support.",
  alternates: { canonical: "/" },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Vivah Bandhan",
      url: process.env.NEXT_PUBLIC_APP_URL,
      description:
        "A trusted Indian matrimony platform connecting families and individuals through verified matchmaking.",
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/browse?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    }),
  },
};

function maskFirstName(fullName: string) {
  const firstName = fullName.trim().split(/\s+/)[0] ?? "";

  if (firstName.length <= 1) {
    return firstName;
  }

  if (firstName.length === 2) {
    return `${firstName[0]}*`;
  }

  return `${firstName[0]}${"*".repeat(Math.max(2, firstName.length - 2))}${firstName[firstName.length - 1]}`;
}

function formatProfileLocation(profile: {
  city: string | null;
  state: string | null;
  location: string | null;
}) {
  const place = [profile.city, profile.state].filter(Boolean).join(", ");
  return place || profile.location || "India";
}

async function getFeaturedProfiles() {
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
    if (isDatabaseConnectionError(error)) {
      console.warn(
        "Featured profiles are temporarily unavailable because the database connection failed.",
        error
      );

      return {
        featuredProfiles: [],
        featuredProfilesUnavailable: true,
      };
    }

    throw error;
  }
}

async function getLandingHeroImage() {
  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
      select: { heroImageUrl: true },
    });

    return settings?.heroImageUrl ?? "/main.jpeg";
  } catch {
    return "/main.jpeg";
  }
}

export default async function HomePage() {
  const [{ featuredProfiles, featuredProfilesUnavailable }, heroImageUrl] =
    await Promise.all([getFeaturedProfiles(), getLandingHeroImage()]);

  return (
    <FullLandingPage
      featuredProfiles={featuredProfiles}
      featuredProfilesUnavailable={featuredProfilesUnavailable}
      heroImageUrl={heroImageUrl}
    />
  );
}
