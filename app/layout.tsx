import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { getCachedSiteBranding } from "@/lib/server/site-content";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ),
  title: {
    default: "Vivah Bandhan - Find Your Perfect Life Partner",
    template: "%s | Vivah Bandhan",
  },
  description:
    "Vivah Bandhan is a trusted matrimony platform connecting families and individuals to find their ideal life partner. Join thousands of happy couples today.",
  keywords: [
    "matrimony",
    "matrimonial",
    "marriage",
    "matchmaking",
    "shaadi",
    "vivah",
    "life partner",
    "bride",
    "groom",
    "Indian matrimony",
  ],
  authors: [{ name: "Vivah Bandhan" }],
  creator: "Vivah Bandhan",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "Vivah Bandhan",
    title: "Vivah Bandhan - Find Your Perfect Life Partner",
    description:
      "India's most trusted matrimony platform. Create your profile, find matches, and begin your journey to a lifetime of happiness.",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Vivah Bandhan - Matrimony Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vivah Bandhan - Find Your Perfect Life Partner",
    description:
      "India's most trusted matrimony platform. Create your profile and find your ideal match.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-video-preview": -1 },
  },
};

async function getLogoImageUrl() {
  try {
    const settings = await getCachedSiteBranding();

    return (
      resolveAllowedImageSrc(settings.logoImageUrl, "/default-logo.svg") ??
      "/default-logo.svg"
    );
  } catch {
    return "/default-logo.svg";
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const logoImageUrl = await getLogoImageUrl();

  return (
    <html lang="en">
      <body
        className="font-sans bg-background text-foreground antialiased"
        data-logo-image-url={logoImageUrl}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
