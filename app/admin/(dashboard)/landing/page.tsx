import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import AdminLandingSettingsForm from "@/components/admin/AdminLandingSettingsForm";
import { resolveAllowedImageSrc } from "@/lib/utils/image";

export const metadata: Metadata = {
  title: "Landing Banner & Logo - Admin",
};

export const dynamic = "force-dynamic";

const DEFAULT_HERO_IMAGE = "/main.jpeg";
const DEFAULT_LOGO_IMAGE = "/default-logo.svg";

async function getLandingSettings() {
  noStore();

  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "singleton" },
      select: {
        heroImageUrl: true,
        logoImageUrl: true,
      },
    });

    return {
      heroImageUrl: resolveAllowedImageSrc(settings?.heroImageUrl ?? "", DEFAULT_HERO_IMAGE) ?? DEFAULT_HERO_IMAGE,
      logoImageUrl: resolveAllowedImageSrc(settings?.logoImageUrl ?? "", DEFAULT_LOGO_IMAGE) ?? DEFAULT_LOGO_IMAGE,
    };
  } catch {
    return {
      heroImageUrl: DEFAULT_HERO_IMAGE,
      logoImageUrl: DEFAULT_LOGO_IMAGE,
    };
  }
}

export default async function AdminLandingPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/admin/login");

  const settings = await getLandingSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight text-slate-900">
          Landing Banner &amp; Logo
        </h1>
      </div>

      <AdminLandingSettingsForm
        initialHeroImageUrl={settings.heroImageUrl}
        initialLogoImageUrl={settings.logoImageUrl}
      />
    </div>
  );
}
