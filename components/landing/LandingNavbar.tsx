"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Menu, X } from "lucide-react";
import SiteLogo from "@/components/common/SiteLogo";
import { resolveAllowedImageSrc } from "@/lib/utils/image";
import { cn } from "@/lib/utils/helpers";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/#find-match", label: "Search" },
  { href: "/#success-stories", label: "Success Stories" },
  { href: "/#membership-plans", label: "Membership Plans" },
  { href: "/blog", label: "Blog" },
  { href: "/contact", label: "Help" },
];

export default function LandingNavbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const brandLogoSrc = logoImageUrl || "/default-logo.svg";
  const dashboardHref = session?.user.role === "ADMIN" ? "/admin" : "/dashboard";

  const isActiveLink = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    if (href === "/blog") {
      return pathname === "/blog" || pathname.startsWith("/blog/");
    }

    if (href.includes("#")) {
      return false;
    }

    return pathname === href;
  };

  useEffect(() => {
    const handler = () => setIsScrolled(window.scrollY > 12);
    handler();
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

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 h-[80px] border-b border-rose-100 bg-white transition-all duration-300",
        isScrolled ? "shadow-[0_14px_34px_rgba(15,23,42,0.08)]" : "shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      )}
    >
      <nav className="mx-auto w-[90%] flex h-full w-full items-center justify-between  px-4 sm:px-6 lg:px-10">
        <Link href="/" className="inline-flex shrink-0 items-center" aria-label="Go to home page">
          <SiteLogo
            src={brandLogoSrc}
            alt="Site logo"
            className="h-12 max-w-[180px] sm:h-14 sm:max-w-[220px] lg:h-16 lg:max-w-[280px]"
          />
        </Link>

        <div className="hidden items-center gap-7 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors",
                isActiveLink(link.href)
                  ? "text-rose-500"
                  : "text-slate-700 hover:text-rose-500"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          {session ? (
            <>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
              >
                Logout
              </button>
              <Link
                href={dashboardHref}
                className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,63,94,0.24)]"
              >
                Go to Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-500 transition-colors hover:bg-rose-50"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(244,63,94,0.24)]"
              >
                Register Free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="rounded-xl border border-rose-100 bg-white p-2.5 text-slate-700 shadow-sm lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setIsMobileOpen((open) => !open)}
        >
          {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <div
        className={cn(
          "mx-auto max-w-7xl overflow-hidden border-t border-rose-100 bg-white transition-all duration-300 lg:hidden",
          isMobileOpen ? "max-h-[32rem] opacity-100" : "pointer-events-none max-h-0 opacity-0"
        )}
      >
        <div className="space-y-2 px-5 py-5">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setIsMobileOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-500"
            >
              {link.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 border-t border-rose-100 pt-4">
            {session ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileOpen(false);
                    signOut({ callbackUrl: "/" });
                  }}
                  className="rounded-xl border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-500"
                >
                  Logout
                </button>
                <Link
                  href={dashboardHref}
                  onClick={() => setIsMobileOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-center text-sm font-semibold text-white"
                >
                  Go to Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsMobileOpen(false)}
                  className="rounded-xl border border-rose-200 px-5 py-3 text-center text-sm font-semibold text-rose-500"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileOpen(false)}
                  className="rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-5 py-3 text-center text-sm font-semibold text-white"
                >
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
