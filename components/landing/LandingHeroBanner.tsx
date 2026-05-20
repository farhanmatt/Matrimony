"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

type LandingHeroBannerProps = {
  initialHeroImageUrl: string;
};

const DEFAULT_HERO_IMAGE = "/main.jpeg";

export default function LandingHeroBanner({
  initialHeroImageUrl,
}: LandingHeroBannerProps) {
  const [heroImageUrl, setHeroImageUrl] = useState(() =>
    resolveAllowedImageSrc(initialHeroImageUrl, DEFAULT_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE,
  );

  useEffect(() => {
    setHeroImageUrl(
      resolveAllowedImageSrc(initialHeroImageUrl, DEFAULT_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE,
    );
  }, [initialHeroImageUrl]);

  useEffect(() => {
    const handleHeroUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ heroImageUrl?: string }>;
      const nextValue = customEvent.detail?.heroImageUrl ?? "";
      setHeroImageUrl(resolveAllowedImageSrc(nextValue, DEFAULT_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE);
    };

    window.addEventListener("branding-hero-updated", handleHeroUpdate);
    return () => window.removeEventListener("branding-hero-updated", handleHeroUpdate);
  }, []);

  return (
    <>
      <div className="absolute inset-0 hidden overflow-hidden lg:block">
        <Image
          src={heroImageUrl}
          alt="Happy couple"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 100vw"
          onError={() =>
            setHeroImageUrl((current) =>
              current === DEFAULT_HERO_IMAGE ? current : DEFAULT_HERO_IMAGE
            )
          }
        />
      </div>

      <div className="relative min-h-[18rem] w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:min-h-[22rem] lg:hidden">
        <Image
          src={heroImageUrl}
          alt="Happy couple"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
          onError={() =>
            setHeroImageUrl((current) =>
              current === DEFAULT_HERO_IMAGE ? current : DEFAULT_HERO_IMAGE
            )
          }
        />
      </div>
    </>
  );
}
