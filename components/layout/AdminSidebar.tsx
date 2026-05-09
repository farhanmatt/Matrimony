"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  CreditCard,
  Settings,
  LogOut,
  Heart,
  X,
  Menu,
  Shield,
  HeartHandshake,
} from "lucide-react";
import { cn } from "@/lib/utils/helpers";
import { useState } from "react";
import AdminTopNotifications from "@/components/admin/AdminTopNotifications";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Manage Users" },
  { href: "/admin/profiles", icon: UserCircle, label: "Manage Profiles" },
  { href: "/admin/matches", icon: HeartHandshake, label: "Match Management" },
  { href: "/admin/payments", icon: CreditCard, label: "Payments" },
  { href: "/admin/settings", icon: Settings, label: "Pricing Settings" },
];

function AdminSidebarContent({
  user,
  pathname,
  onClose,
}: {
  user: { name?: string | null; email?: string | null };
  pathname: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto bg-gradient-to-b from-rose-50 via-white to-rose-50">
      <div className="relative border-b border-rose-100 px-4 py-5">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-500 shadow-sm">
            <Shield className="h-4.5 w-4.5 text-white" />
          </div>
          <span className="font-display text-lg font-bold text-gray-900">Admin Panel</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 transition-colors hover:text-rose-600 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="border-b border-rose-100 px-4 py-4">
        <p className="text-sm font-semibold text-gray-900">{user.name}</p>
        <p className="mt-1 text-xs text-gray-500">{user.email}</p>
      </div>

      <nav className="flex-1 px-3 py-4">
        {adminNav.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "mb-2 flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition-all last:mb-0",
                isActive
                  ? "bg-gradient-to-r from-rose-600 to-pink-500 text-white shadow-[0_12px_24px_rgba(244,63,94,0.18)]"
                  : "text-gray-600 hover:bg-rose-50 hover:text-rose-600"
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-rose-100 px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-gray-600 transition-all hover:bg-rose-50 hover:text-rose-600"
        >
          <Heart className="h-4 w-4 shrink-0" />
          Back to Site
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm text-gray-600 transition-all hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!session?.user) return null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center gap-3 border-b border-rose-100 bg-white px-4 py-3.5 shadow-sm lg:hidden">
        <button onClick={() => setMobileOpen(true)} className="text-gray-500 transition-colors hover:text-rose-600">
          <Menu className="h-6 w-6" />
        </button>
        <span className="min-w-0 flex-1 truncate font-display font-bold text-gray-900">Admin Panel</span>
        <AdminTopNotifications />
      </div>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={cn(
          "fixed bottom-0 left-0 top-0 z-50 w-[min(18rem,82vw)] bg-white shadow-2xl transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <AdminSidebarContent user={session.user} pathname={pathname} onClose={() => setMobileOpen(false)} />
      </div>

      <aside className="fixed bottom-0 left-0 top-0 z-20 hidden w-56 flex-col border-r border-rose-100 bg-white shadow-[0_0_24px_rgba(244,63,94,0.08)] lg:flex">
        <AdminSidebarContent user={session.user} pathname={pathname} />
      </aside>
    </>
  );
}
