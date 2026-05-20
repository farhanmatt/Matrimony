"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { Menu, X, ChevronDown } from "lucide-react";
import SiteLogo from "@/components/common/SiteLogo";
import { resolveAllowedImageSrc } from "@/lib/utils/image";
import { cn } from "@/lib/utils/helpers";

export default function Navbar() {
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const brandLogoSrc = logoImageUrl || "/default-logo.svg";

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    setLogoImageUrl(resolveAllowedImageSrc(document.body.dataset.logoImageUrl ?? "", null));

    const handleBrandingUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ logoImageUrl?: string }>;
      const nextValue = customEvent.detail?.logoImageUrl ?? "";
      setLogoImageUrl(resolveAllowedImageSrc(nextValue, null));
    };

    window.addEventListener("branding-logo-updated", handleBrandingUpdate);
    return () => window.removeEventListener("branding-logo-updated", handleBrandingUpdate);
  }, []);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-[80px] transition-all duration-300",
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-full max-w-10xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Go to home page">
          <SiteLogo
            src={brandLogoSrc}
            alt="Site logo"
            className="h-12 max-w-[180px] sm:h-14 sm:max-w-[224px] lg:max-w-[260px]"
          />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-gray-700 hover:text-rose-600 font-medium transition-colors text-sm"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-gray-700 hover:text-rose-600 font-medium text-sm transition-colors"
              >
                Logout
              </button>
              <Link
                href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="btn-primary text-sm py-2 px-5"
              >
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="text-gray-700 hover:text-rose-600 font-medium text-sm transition-colors"
              >
                Login
              </Link>
              <Link href="/register" className="btn-primary text-sm py-2 px-5">
                Register Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 text-gray-700 hover:text-rose-600 transition-colors"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle menu"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden bg-white border-t border-gray-100 shadow-lg transition-all duration-300 overflow-hidden",
          isMobileOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileOpen(false)}
              className="block py-2 text-gray-700 hover:text-rose-600 font-medium transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="btn-outline text-center text-sm py-2.5"
                >
                  Logout
                </button>
                <Link
                  href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
                  className="btn-primary text-center text-sm py-2.5"
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn-outline text-center text-sm py-2.5">
                  Login
                </Link>
                <Link href="/register" className="btn-primary text-center text-sm py-2.5">
                  Register Free
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
