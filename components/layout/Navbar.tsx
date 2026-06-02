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
        <Link
          href="/"
          className="ui-enter-left ui-link-shift inline-flex shrink-0 items-center"
          aria-label="Go to home page"
          style={{ animationDelay: "40ms" }}
        >
          <SiteLogo
            src={brandLogoSrc}
            alt="Site logo"
            className="h-12 max-w-[180px] sm:h-14 sm:max-w-[224px] lg:max-w-[260px]"
          />
        </Link>

        {/* Desktop Nav */}
        <div className="ui-enter-up hidden items-center gap-8 md:flex" style={{ animationDelay: "110ms" }}>
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="ui-link-shift text-sm font-medium text-gray-700 transition-colors hover:text-rose-600"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="ui-enter-right hidden items-center gap-3 md:flex" style={{ animationDelay: "170ms" }}>
          {session ? (
            <>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="ui-link-shift text-sm font-medium text-gray-700 transition-colors hover:text-rose-600"
              >
                Logout
              </button>
              <Link
                href={session.user.role === "ADMIN" ? "/admin" : "/dashboard"}
                className="btn-primary ui-link-shift px-5 py-2 text-sm"
              >
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="ui-link-shift text-sm font-medium text-gray-700 transition-colors hover:text-rose-600"
              >
                Login
              </Link>
              <Link href="/register" className="btn-primary ui-link-shift px-5 py-2 text-sm">
                Register Free
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="ui-link-shift p-2 text-gray-700 transition-colors hover:text-rose-600 md:hidden"
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
              className="ui-link-shift block py-2 font-medium text-gray-700 transition-colors hover:text-rose-600"
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
