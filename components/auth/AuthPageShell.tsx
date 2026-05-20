"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import SiteLogo from "@/components/common/SiteLogo";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

export default function AuthPageShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const [logoImageUrl, setLogoImageUrl] = useState(DEFAULT_LOGO_IMAGE);

  useEffect(() => {
    setLogoImageUrl(
      resolveAllowedImageSrc(
        document.body.dataset.logoImageUrl ?? "",
        DEFAULT_LOGO_IMAGE
      ) ?? DEFAULT_LOGO_IMAGE
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
    <div className="min-h-screen hero-gradient flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center">
            <SiteLogo
              src={logoImageUrl}
              alt="Vivah Bandhan logo"
              className="h-14 max-w-[260px] sm:h-16 sm:max-w-[320px]"
            />
          </Link>
          <h1 className="text-2xl font-display font-bold text-gray-900 mt-5 mb-1">
            {title}
          </h1>
          <p className="text-gray-500 text-sm">{description}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {children}

          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
