"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteLogo from "@/components/common/SiteLogo";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

type AuthPageShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

export default function AuthPageShell({
  title,
  description,
  children,
  footer,
}: AuthPageShellProps) {
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_LOGO_IMAGE);

  useEffect(() => {
    setLogoImageUrl(
      resolveAllowedImageSrc(document.body.dataset.logoImageUrl ?? "", DEFAULT_LOGO_IMAGE) ??
        DEFAULT_LOGO_IMAGE
    );

    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logoImageUrl?: string }>;
      const nextValue = customEvent.detail?.logoImageUrl ?? "";

      setLogoImageUrl(
        resolveAllowedImageSrc(nextValue, DEFAULT_LOGO_IMAGE) ??
          DEFAULT_LOGO_IMAGE
      );
    };

    window.addEventListener("branding-logo-updated", handleBrandingUpdate);
    return () =>
      window.removeEventListener("branding-logo-updated", handleBrandingUpdate);
  }, []);

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="ui-enter-scale w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="ui-link-shift inline-flex items-center justify-center">
            <SiteLogo
              src={logoImageUrl}
              alt="Vivah Bandhan logo"
              className="ui-soft-float h-14 max-w-[260px] sm:h-16 sm:max-w-[320px]"
            />
          </Link>
          <h1 className="ui-enter-up mb-1 mt-5 text-2xl font-display font-bold text-gray-900" style={{ animationDelay: "120ms" }}>
            {title}
          </h1>
          <p className="ui-enter-up text-sm text-gray-500" style={{ animationDelay: "180ms" }}>{description}</p>
        </div>

        <div className="ui-enter-up ui-card-lift rounded-2xl bg-white p-8 shadow-xl" style={{ animationDelay: "220ms" }}>
          {children}
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
