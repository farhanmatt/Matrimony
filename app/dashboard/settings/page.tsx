import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BellRing,
  ChevronRight,
  Headphones,
  HeartHandshake,
  LockKeyhole,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
} from "lucide-react";
import AccountSettingsForm from "@/components/dashboard/AccountSettingsForm";
import DeleteAccountSection from "@/components/dashboard/DeleteAccountSection";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInitials } from "@/lib/utils/helpers";


export const metadata: Metadata = { title: "Account Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      emailVerified: true,
      image: true,
      password: true,
      profile: {
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!user) redirect("/login");

  const displayName = user.name ?? "User";
  const profileStatus = user.profile?.status ?? "NO PROFILE";
  const profileStatusTone =
    profileStatus === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700"
      : profileStatus === "DRAFT"
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-600";

  const quickLinks = [
    {
      href: user.profile ? "/dashboard/profile/edit" : "/dashboard/profile/create",
      title: user.profile ? "Edit Profile" : "Create Profile",
      description: user.profile
        ? "Update personal, family, and lifestyle details."
        : "Add profile details before browsing matches.",
      icon: UserCircle,
    },
    {
      href: "/dashboard/preferences",
      title: "Partner Preferences",
      description: "Tune your age, location, community, and education filters.",
      icon: SlidersHorizontal,
    },
    {
      href: "/dashboard/matches",
      title: "Mutual Interest",
      description: "Review mutual interests and unlocked profiles.",
      icon: HeartHandshake,
    },
    {
      href: "#notification-settings",
      title: "Notification Settings",
      description: "Manage email, SMS and in-app notifications.",
      icon: BellRing,
    },
  ] as const;

  return (
    <div className="space-y-6">
      <section
        className="ui-enter-up relative overflow-hidden rounded-[30px] border border-rose-100/80 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.98)_0%,rgba(255,247,249,0.96)_45%,rgba(255,239,243,0.92)_100%)] px-6 py-7 shadow-[0_24px_70px_rgba(15,23,42,0.05)] sm:px-8 sm:py-8"
        style={{ animationDelay: "40ms", animationFillMode: "forwards" }}
      >
        <div className="absolute -right-10 top-2 hidden h-52 w-52 rounded-full bg-rose-100/60 blur-3xl lg:block" />
        <div className="absolute right-16 top-10 hidden lg:block">
          <div className="ui-soft-float relative flex h-28 w-28 items-center justify-center rounded-[28px] bg-white/70 shadow-[0_18px_42px_rgba(244,63,94,0.12)] backdrop-blur-sm">
            <div className="absolute inset-3 rounded-[24px] bg-gradient-to-br from-rose-50 to-pink-50" />
            <LockKeyhole className="relative z-10 h-10 w-10 text-rose-400" />
          </div>
        </div>

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center">
          {user.image ? (
            <div className="h-[76px] w-[76px] shrink-0 overflow-hidden rounded-[22px] border border-rose-100 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={user.image}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-[22px] bg-gradient-to-br from-rose-500 to-pink-500 text-[2rem] font-bold text-white shadow-[0_18px_40px_rgba(244,63,94,0.24)]">
              {getInitials(displayName)}
            </div>
          )}

          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure Account
            </div>
            <div>
              <h1 className="font-display text-[2.15rem] font-bold tracking-tight text-slate-900">
                Account Settings
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] text-slate-600">
                Manage your account details, password and preferences from one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div
          className="ui-enter-left space-y-6"
          style={{ animationDelay: "120ms", animationFillMode: "forwards" }}
        >
          <section className="ui-card-lift-soft rounded-[28px] border border-rose-100/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)] sm:p-8">
            <AccountSettingsForm
              user={{
                name: displayName,
                email: user.email,
                emailVerified: Boolean(user.emailVerified),
                hasPassword: Boolean(user.password),
              }}
            />
          </section>

          <section
            id="notification-settings"
            className="ui-card-lift-soft rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-sm scroll-mt-28"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500 ui-icon-lift">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-[1.35rem] font-bold text-slate-900">
                  Notification Settings
                </h2>
                <p className="mt-2 text-[15px] text-slate-500">
                  Email, SMS and in-app notification controls will appear here soon.
                  Your profile-like alerts are still available from the dashboard bell.
                </p>
              </div>
            </div>
          </section>

          <DeleteAccountSection
            email={user.email}
            hasPassword={Boolean(user.password)}
          />

          <section
            id="help-support"
            className="ui-card-lift-soft flex flex-col gap-4 rounded-[24px] border border-rose-100 bg-[linear-gradient(135deg,rgba(255,255,255,0.98)_0%,rgba(255,246,249,0.94)_100%)] px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 ui-icon-lift">
                <Headphones className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-[1.35rem] font-bold text-slate-900">
                  Need Help?
                </h2>
                <p className="mt-2 max-w-2xl text-[15px] text-slate-500">
                  If you need any assistance or have questions, our support team is always ready to help you.
                </p>
              </div>
            </div>

            <Link
              href="/contact"
              className="ui-link-shift inline-flex items-center justify-center gap-2 rounded-[16px] border border-rose-200 px-5 py-3 text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50"
            >
              <Headphones className="ui-arrow-shift h-4.5 w-4.5" />
              Contact Support
            </Link>
          </section>
        </div>

        <aside
          className="ui-enter-right space-y-5"
          style={{ animationDelay: "190ms", animationFillMode: "forwards" }}
        >
          <section className="ui-card-lift-soft rounded-[24px] border border-rose-100/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500 ui-icon-lift">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-[1.45rem] font-bold text-slate-900">
                  Profile Status
                </h2>
                <p className="mt-2 text-[15px] text-slate-500">
                  {user.profile
                    ? "Your profile is connected to this account."
                    : "Create your matrimony profile to unlock all dashboard features."}
                </p>
              </div>
            </div>

            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${profileStatusTone}`}
            >
              {profileStatus}
            </span>
          </section>

          <section className="ui-card-lift-soft rounded-[24px] border border-rose-100/80 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.05)]">
            <h2 className="font-display text-[1.45rem] font-bold text-slate-900">
              Quick Links
            </h2>

            <div className="mt-5 divide-y divide-slate-100">
              {quickLinks.map((item, index) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="group ui-enter-right ui-link-shift flex items-start gap-4 py-5 first:pt-0 last:pb-0"
                  style={{ animationDelay: `${250 + index * 55}ms`, animationFillMode: "forwards" }}
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 transition-colors group-hover:bg-rose-100 ui-icon-lift">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[1.03rem] font-semibold text-slate-900">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[15px] leading-7 text-slate-500">
                      {item.description}
                    </p>
                  </div>
                  <ChevronRight className="ui-arrow-shift mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform group-hover:text-rose-500" />
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
