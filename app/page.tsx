import type { Metadata } from "next";
import FullLandingPage from "@/components/landing/FullLandingPage";
import { auth } from "@/lib/auth";
import { getCachedFeaturedProfiles, getCachedSiteBranding, getCachedSuccessStories } from "@/lib/server/site-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "FMLP Matrimony - Find Your Perfect Life Partner",
  description:
    "Find your perfect life partner with FMLP Matrimony. Explore verified profiles, success stories, membership plans, and premium matchmaking support.",
  alternates: { canonical: "/" },
  other: {
    "application/ld+json": JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "FMLP Matrimony",
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
  const session = await auth();
  const [
    { featuredProfiles, featuredProfilesUnavailable },
    branding,
    { successStories, successStoriesUnavailable }
  ] = await Promise.all([
    getCachedFeaturedProfiles(),
    getCachedSiteBranding(),
    getCachedSuccessStories()
  ]);

  return (
    <FullLandingPage
      featuredProfiles={featuredProfiles}
      featuredProfilesUnavailable={featuredProfilesUnavailable}
      heroImageUrl={branding.heroImageUrl}
      session={session}
      successStories={successStories}
      successStoriesUnavailable={successStoriesUnavailable}
      officialEmail={branding.officialEmail}
      doorNumber={branding.doorNumber}
      streetName={branding.streetName}
      roadName={branding.roadName}
      areaLocality={branding.areaLocality}
      city={branding.city}
      district={branding.district}
      state={branding.state}
      pincode={branding.pincode}
      country={branding.country}
      logoImageUrl={branding.logoImageUrl}
    />
  );
}
