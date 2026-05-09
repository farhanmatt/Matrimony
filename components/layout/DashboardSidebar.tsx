"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import NotificationBell from "@/components/dashboard/NotificationBell";
import {
  ChevronDown,
  Edit3,
  Heart,
  HeartHandshake,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  Settings,
  Star,
  Unlock,
  User,
  X,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils/helpers";
import { useEffect, useRef, useState } from "react";

const baseNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { href: "/dashboard/browse", icon: Search, label: "Find Match" },
  { href: "/dashboard/liked", icon: Heart, label: "Liked Profiles" },
  { href: "/dashboard/received-likes", icon: Inbox, label: "Received Likes" },
  { href: "/dashboard/matches", icon: HeartHandshake, label: "My Matches" },
  { href: "/dashboard/unlocked", icon: Unlock, label: "Unlocked Profiles" },
  { href: "/dashboard/preferences", icon: Star, label: "Preferences" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

function isActivePath(pathname: string, href: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname.startsWith(href);
}

type DashboardLike = {
  id: string;
  createdAt: string;
  fromProfile: {
    id: string;
    fullName: string;
    city: string | null;
    state: string | null;
    location: string | null;
    profession: string | null;
    profileImage: string | null;
    photos: { url: string; isPrimary: boolean }[];
  };
};

export default function DashboardSidebar({
  initialHasProfile = false,
  initialLikes = [],
}: {
  initialHasProfile?: boolean;
  initialLikes?: DashboardLike[];
}) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [hasProfile, setHasProfile] = useState(initialHasProfile);
  const [accountImage, setAccountImage] = useState<string | null>(null);
  const [desktopAccountOpen, setDesktopAccountOpen] = useState(false);
  const desktopAccountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialHasProfile) {
      setHasProfile(true);
      return;
    }

    if (pathname.startsWith("/dashboard/profile/edit")) {
      setHasProfile(true);
    }
  }, [initialHasProfile, pathname]);

  useEffect(() => {
    if (session?.user?.image) {
      setAccountImage(session.user.image);
    }
  }, [session?.user?.image]);

  useEffect(() => {
    let cancelled = false;

    const loadProfileState = async () => {
      try {
        const res = await fetch("/api/profile", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          setHasProfile(Boolean(data.profile?.id));

          const nextAccountImage =
            data.profile?.profileImage ??
            data.profile?.photos?.find(
              (photo: { url: string; isPrimary: boolean }) => photo.isPrimary
            )?.url ??
            data.profile?.photos?.[0]?.url ??
            null;

          if (nextAccountImage) {
            setAccountImage(nextAccountImage);
          }
        }
      } catch {
        // Keep the safe default when the database is unavailable.
      }
    };

    void loadProfileState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleAvatarUpdate = (event: Event) => {
      const avatarEvent = event as CustomEvent<{ image?: string | null }>;
      const nextImage = avatarEvent.detail?.image?.trim() ?? null;
      setAccountImage(nextImage);
    };

    window.addEventListener("dashboard-avatar-updated", handleAvatarUpdate);

    return () => {
      window.removeEventListener("dashboard-avatar-updated", handleAvatarUpdate);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDesktopAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (
        desktopAccountRef.current &&
        !desktopAccountRef.current.contains(event.target as Node)
      ) {
        setDesktopAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    if (!logoutConfirmOpen || isSigningOut) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLogoutConfirmOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [logoutConfirmOpen, isSigningOut]);

  if (!session?.user) return null;

  const visibleAccountImage = accountImage ?? session.user.image ?? null;

  const profileNavItem = hasProfile
    ? { href: "/dashboard/profile/edit", icon: Edit3, label: "Edit Profile" }
    : { href: "/dashboard/profile/create", icon: User, label: "Create Profile" };
  const settingsNavItem = {
    href: "/dashboard/settings",
    icon: Settings,
    label: "Settings",
  };

  const desktopNavItems = baseNavItems.filter(
    (item) =>
      item.href !== "/dashboard/preferences" && item.href !== "/dashboard/settings"
  );

  const mobileNavItems = [
    baseNavItems[0],
    profileNavItem,
    ...baseNavItems.slice(1),
  ];

  const currentNavItem =
    mobileNavItems.find((item) => isActivePath(pathname, item.href)) ??
    baseNavItems[0];
  const accountMenuItems = [
    profileNavItem,
    { href: "/dashboard/preferences", icon: Star, label: "Preferences" },
    settingsNavItem,
  ];
  const desktopAccountActive = accountMenuItems.some((item) =>
    isActivePath(pathname, item.href)
  );

  const openLogoutConfirm = () => {
    if (isSigningOut) return;
    setDesktopAccountOpen(false);
    setMobileOpen(false);
    setLogoutConfirmOpen(true);
  };

  const closeLogoutConfirm = () => {
    if (isSigningOut) return;
    setLogoutConfirmOpen(false);
  };

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await signOut({ callbackUrl: "/" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 border-b border-rose-100/80 bg-white/95 backdrop-blur-md shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen((open) => !open)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-rose-100 text-gray-700 transition-colors hover:border-rose-200 hover:text-rose-600 lg:hidden"
                aria-label="Toggle dashboard menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>

              <Link href="/" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md shadow-rose-200">
                  <Heart className="h-4.5 w-4.5 fill-white" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-gray-900">
                    Vivah Bandhan
                  </p>
                  <p className="hidden text-[11px] uppercase tracking-[0.2em] text-rose-500 sm:block">
                    User Dashboard
                  </p>
                </div>
              </Link>
            </div>

            <div className="hidden min-w-0 flex-1 px-6 lg:flex">
              <nav className="flex min-w-0 flex-1 items-center">
                <div className="dashboard-nav-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2">
                  {desktopNavItems.map((item) => {
                    const isActive = isActivePath(pathname, item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          "relative inline-flex shrink-0 items-center gap-2 px-2 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "text-rose-600"
                            : "text-gray-600 hover:text-rose-600"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                        <span
                          className={cn(
                            "absolute inset-x-0 -bottom-px h-0.5 rounded-full transition-opacity",
                            isActive ? "bg-rose-500 opacity-100" : "opacity-0"
                          )}
                        />
                      </Link>
                    );
                  })}
                </div>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden lg:block">
                <NotificationBell likes={initialLikes} compact />
              </div>

              <div
                ref={desktopAccountRef}
                className="relative hidden lg:flex"
              >
                <button
                  type="button"
                  onClick={() => setDesktopAccountOpen((open) => !open)}
                  className={cn(
                    "inline-flex items-center gap-3 rounded-full px-3 py-2 transition-all",
                    desktopAccountActive
                      ? "text-rose-600 shadow-[0_10px_28px_rgba(244,63,94,0.12)]"
                      : ""
                  )}
                >
                  {visibleAccountImage ? (
                    <div className="h-9 w-9 overflow-hidden rounded-full border border-white shadow-sm">
                      <img
                        src={visibleAccountImage}
                        alt={session.user.name ?? "User"}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white">
                      {session.user.name ? getInitials(session.user.name) : "U"}
                    </div>
                  )}
                  <div className="max-w-[180px] text-left">
                    <p
                      className={cn(
                        "truncate text-sm font-semibold",
                        desktopAccountActive ? "text-rose-600" : "text-gray-900"
                      )}
                    >
                      {session.user.name ?? "User"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {hasProfile ? "Profile ready" : "Profile setup pending"}
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      desktopAccountOpen ? "rotate-180" : "",
                      desktopAccountActive ? "text-rose-500" : "text-gray-400"
                    )}
                  />
                </button>

                {desktopAccountOpen ? (
                  <div className="absolute right-0 top-full z-50 mt-3 min-w-[180px] overflow-hidden rounded-2xl border border-rose-100 bg-white p-2 shadow-[0_20px_50px_rgba(15,23,42,0.12)]">
                    {accountMenuItems.map((item) => {
                      const isActive = isActivePath(pathname, item.href);

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                            isActive
                              ? "bg-rose-50 text-rose-600"
                              : "text-gray-600 hover:bg-rose-50 hover:text-rose-600"
                          )}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.label}
                        </Link>
                      );
                    })}
                    <button
                      type="button"
                      onClick={openLogoutConfirm}
                      className="inline-flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-gray-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="flex h-10 items-center rounded-full border border-rose-100 bg-rose-50 px-3 text-sm font-medium text-rose-600 lg:hidden">
                {currentNavItem.label}
              </div>
            </div>
          </div>

          {mobileOpen ? (
            <div className="border-t border-rose-100 py-4 lg:hidden">
              <div className="mb-4">
                <NotificationBell likes={initialLikes} />
              </div>

              <div className="mb-4 flex items-center gap-3 rounded-3xl border border-rose-100 bg-white p-4 shadow-sm">
                {visibleAccountImage ? (
                  <div className="h-12 w-12 overflow-hidden rounded-full border border-gray-100">
                    <img
                      src={visibleAccountImage}
                      alt={session.user.name ?? "User"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-pink-500 text-sm font-bold text-white">
                    {session.user.name ? getInitials(session.user.name) : "U"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {session.user.name ?? "User"}
                  </p>
                  <p className="truncate text-xs text-gray-500">
                    {session.user.email}
                  </p>
                </div>
              </div>

              <nav className="grid gap-2">
                {mobileNavItems.map((item) => {
                  const isActive = isActivePath(pathname, item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200"
                          : "border border-transparent text-gray-600 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
                      )}
                    >
                      <item.icon className="h-4.5 w-4.5 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <button
                type="button"
                onClick={openLogoutConfirm}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-rose-200 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </header>

      {logoutConfirmOpen ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeLogoutConfirm();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-confirm-title"
            className="w-full max-w-sm rounded-[24px] border border-rose-100 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.14)]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <LogOut className="h-5 w-5" />
            </div>
            <h3
              id="logout-confirm-title"
              className="mt-4 font-display text-xl font-bold text-slate-900"
            >
              Logout from your account?
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Are you sure you want to logout? You can sign in again anytime.
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={closeLogoutConfirm}
                disabled={isSigningOut}
                className="inline-flex flex-1 items-center justify-center rounded-[16px] border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                onClick={() => void handleLogout()}
                disabled={isSigningOut}
                className="inline-flex flex-1 items-center justify-center rounded-[16px] bg-gradient-to-r from-rose-600 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(244,63,94,0.2)] transition-all hover:shadow-[0_18px_36px_rgba(244,63,94,0.24)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSigningOut ? "Logging out..." : "Yes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
