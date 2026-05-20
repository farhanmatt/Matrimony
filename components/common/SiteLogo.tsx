"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/helpers";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

type SiteLogoProps = {
  src: string;
  alt: string;
  className?: string;
};

const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

export default function SiteLogo({ src, alt, className }: SiteLogoProps) {
  const normalizedSrc = resolveAllowedImageSrc(src, DEFAULT_LOGO_IMAGE) ?? DEFAULT_LOGO_IMAGE;
  const [displaySrc, setDisplaySrc] = useState(normalizedSrc);

  useEffect(() => {
    setDisplaySrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <div className={cn("relative block flex-none overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt}
        className="block h-full w-auto max-w-full object-contain object-left"
        onError={() =>
          setDisplaySrc((current) =>
            current === DEFAULT_LOGO_IMAGE ? current : DEFAULT_LOGO_IMAGE
          )
        }
      />
    </div>
  );
}
