"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { resolveAllowedImageSrc } from "@/lib/utils/image";
import { cn } from "@/lib/utils/helpers";

type LandingHeroBannerProps = {
  initialHeroImageUrl: string;
};

const DEFAULT_HERO_IMAGE = "/main.jpeg";

export default function LandingHeroBanner({
  initialHeroImageUrl,
}: LandingHeroBannerProps) {
  const [heroImages, setHeroImages] = useState<string[]>(() => {
    const images = initialHeroImageUrl ? initialHeroImageUrl.split(",") : [DEFAULT_HERO_IMAGE];
    return images.map(img => resolveAllowedImageSrc(img, DEFAULT_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE);
  });
  
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const images = initialHeroImageUrl ? initialHeroImageUrl.split(",") : [DEFAULT_HERO_IMAGE];
    setHeroImages(images.map(img => resolveAllowedImageSrc(img, DEFAULT_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE));
    setActiveIndex(0);
  }, [initialHeroImageUrl]);

  useEffect(() => {
    if (heroImages.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % heroImages.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [heroImages.length]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 overflow-hidden bg-transparent">
        {heroImages.map((src, index) => (
          <div
            key={`${src}-${index}`}
            className={cn(
              "absolute inset-0 transition-opacity duration-1000 ease-in-out",
              activeIndex === index ? "opacity-100" : "opacity-0"
            )}
          >
            <Image
              src={src}
              alt={`Happy couple slide ${index + 1}`}
              fill
              priority={index === 0}
              className="object-cover object-center"
              sizes="100vw"
              unoptimized={src.startsWith("blob:")}
            />
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      {heroImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2">
          {heroImages.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                activeIndex === i 
                  ? "w-8 bg-white shadow-[0_0_12px_rgba(255,255,255,0.5)]" 
                  : "w-2 bg-white/40 hover:bg-white/60"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
