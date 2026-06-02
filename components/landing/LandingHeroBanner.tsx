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
          className="landing-slow-zoom object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 100vw"
          onError={() =>
            setHeroImageUrl((current) =>
              current === DEFAULT_HERO_IMAGE ? current : DEFAULT_HERO_IMAGE
            )
          }
        />
        <div className="landing-float absolute -left-16 top-10 h-64 w-64 rounded-full bg-rose-200/40 blur-3xl" />
        <div
          className="landing-float absolute bottom-16 left-[36%] h-24 w-24 rounded-full border border-white/50 bg-white/25 backdrop-blur-md"
          style={{ animationDelay: "1.2s" }}
        />
        <div className="landing-drift absolute left-[18%] top-[18%] h-16 w-10 rounded-full bg-rose-200/45 blur-xl" />
        <div
          className="landing-drift absolute left-[47%] top-[58%] h-20 w-12 rounded-full bg-pink-200/40 blur-xl"
          style={{ animationDelay: "2.4s" }}
        />
        <div
          className="landing-drift absolute right-[10%] top-[22%] h-14 w-14 rounded-full bg-white/35 blur-lg"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative min-h-[18rem] w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:min-h-[22rem] lg:hidden">
        <Image
          src={heroImageUrl}
          alt="Happy couple"
          fill
          priority
          className="landing-slow-zoom object-cover object-center"
          sizes="100vw"
          onError={() =>
            setHeroImageUrl((current) =>
              current === DEFAULT_HERO_IMAGE ? current : DEFAULT_HERO_IMAGE
            )
          }
        />
        <div
          className="landing-float absolute right-5 top-5 h-16 w-16 rounded-full border border-white/50 bg-white/25 backdrop-blur-md"
          style={{ animationDelay: "0.8s" }}
        />
      </div>
    </>
  );
}
