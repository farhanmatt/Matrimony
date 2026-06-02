import type { Metadata } from "next";
import FullLandingPage from "@/components/landing/FullLandingPage";
import {
  getCachedFeaturedProfiles,
  getCachedSiteBranding,
} from "@/lib/server/site-content";
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

export default async function HomePage() {
  const [{ featuredProfiles, featuredProfilesUnavailable }, branding] =
    await Promise.all([getCachedFeaturedProfiles(), getCachedSiteBranding()]);

  return (
    <FullLandingPage
      featuredProfiles={featuredProfiles}
      featuredProfilesUnavailable={featuredProfilesUnavailable}
      heroImageUrl={branding.heroImageUrl}
    />
  );
}
