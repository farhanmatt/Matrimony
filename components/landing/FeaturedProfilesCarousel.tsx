"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { MapPin } from "lucide-react";
import LandingReveal from "./LandingReveal";
import type { LandingFeaturedProfile } from "./FullLandingPage";

export default function FeaturedProfilesCarousel({
  profiles,
}: {
  profiles: LandingFeaturedProfile[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Array.from(el.children).indexOf(entry.target as HTMLElement);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      { root: el, threshold: 0.5 }
    );
    
    Array.from(el.children).forEach((child) => observer.observe(child));
    
    return () => observer.disconnect();
  }, [profiles]);

  return (
    <div className="relative">
      <div 
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-6 md:grid md:grid-cols-2 xl:grid-cols-6 md:overflow-visible md:pb-0 md:snap-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {profiles.map((profile, index) => (
          <div key={profile.cardKey} className="w-[85vw] shrink-0 snap-center md:w-auto md:shrink md:snap-align-none">
            <LandingReveal
              delayMs={80 + index * 70}
              variant="scale"
            >
            <article className="landing-surface group overflow-hidden rounded-[1.5rem] border border-rose-100 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <div className="relative h-[380px] md:h-[420px] xl:h-[280px]">
                {profile.previewImageUrl ? (
                  <Image
                    src={profile.previewImageUrl}
                    alt="Featured profile preview"
                    fill
                    className="landing-surface-media object-cover object-top"
                    sizes="(max-width: 1280px) 50vw, 16vw"
                    unoptimized
                  />
                ) : (
                  <div className="h-full bg-[radial-gradient(circle_at_top,#ffe4eb_0%,#f8bbd0_42%,#f48fb1_100%)]" />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <div className="absolute left-3 top-3 rounded-full bg-gradient-to-r from-rose-600 to-pink-500 px-3 py-1 text-xs font-semibold text-white">
                  Featured
                </div>
              </div>
              <div className="px-4 py-4 md:px-5 md:py-5">
                <div className="min-h-[1.9rem]">
                  <div className="text-lg font-bold text-slate-900 truncate">
                    {profile.nameLabel || "Featured Profile"}
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4 text-rose-400" />
                  {profile.location}
                </div>
              </div>
            </article>
            </LandingReveal>
          </div>
        ))}
      </div>
      
      {profiles.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 md:hidden">
          {profiles.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? "w-4 bg-rose-500"
                  : "w-1.5 bg-rose-200"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
