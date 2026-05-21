"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SiteLogo from "@/components/common/SiteLogo";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

type BrandLogoProps = {
  href?: string;
  alt?: string;
  wrapperClassName?: string;
  className?: string;
};

export default function BrandLogo({
  href = "/",
  alt = "Vivah Bandhan logo",
  wrapperClassName,
  className,
}: BrandLogoProps) {
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_LOGO_IMAGE);

  useEffect(() => {
    setLogoImageUrl(
      resolveAllowedImageSrc(
        document.body.dataset.logoImageUrl ?? "",
        DEFAULT_LOGO_IMAGE,
      ) ?? DEFAULT_LOGO_IMAGE,
    );

    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logoImageUrl?: string }>;
      const nextValue = customEvent.detail?.logoImageUrl ?? "";

      setLogoImageUrl(
        resolveAllowedImageSrc(nextValue, DEFAULT_LOGO_IMAGE) ??
          DEFAULT_LOGO_IMAGE,
      );
    };

    window.addEventListener("branding-logo-updated", handleBrandingUpdate);
    return () =>
      window.removeEventListener("branding-logo-updated", handleBrandingUpdate);
  }, []);

  const logo = <SiteLogo src={logoImageUrl} alt={alt} className={className} />;

  if (!href) {
    return <div className={wrapperClassName}>{logo}</div>;
  }

  return (
    <Link href={href} className={wrapperClassName}>
      {logo}
    </Link>
  );
}
