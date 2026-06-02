import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  FALLBACK_ADMIN_SETTINGS,
  getAdminSettingsSnapshot,
} from "@/lib/utils/admin-settings";
import { ALLOWED_IMAGE_HOSTS } from "@/lib/utils/image";
import type { Session } from "next-auth";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function isAllowedLandingImageUrl(value: string) {
  if (value.startsWith("/")) return true;
  if (value.startsWith("data:image/")) return true;

  try {
    const url = new URL(value);
    return ALLOWED_IMAGE_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

// GET /api/admin/settings - get admin settings
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      settings: await getAdminSettingsSnapshot(),
    });
  } catch (error) {
    console.error("Failed to load admin settings:", error);
    return NextResponse.json({ settings: FALLBACK_ADMIN_SETTINGS });
  }
}

// PUT /api/admin/settings - update pricing and branding
export async function PUT(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const body = (await req.json().catch(() => ({}))) as {
    baseAmount?: unknown;
    profileAmount?: unknown;
    perProfileChatAmount?: unknown;
    heroImageUrl?: unknown;
    logoImageUrl?: unknown;
  };

  const updateData: {
    baseAmount?: number;
    profileAmount?: number;
    perProfileChatAmount?: number;
    heroImageUrl?: string;
    logoImageUrl?: string;
  } = {};

  if (Object.prototype.hasOwnProperty.call(body, "baseAmount")) {
    if (typeof body.baseAmount !== "number") {
      return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
    }
    updateData.baseAmount = body.baseAmount;
  }

  if (Object.prototype.hasOwnProperty.call(body, "profileAmount")) {
    if (typeof body.profileAmount !== "number") {
      return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
    }
    updateData.profileAmount = body.profileAmount;
  }

  if (Object.prototype.hasOwnProperty.call(body, "perProfileChatAmount")) {
    if (typeof body.perProfileChatAmount !== "number") {
      return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
    }
    updateData.perProfileChatAmount = body.perProfileChatAmount;
  }

  if (Object.prototype.hasOwnProperty.call(body, "heroImageUrl")) {
    if (typeof body.heroImageUrl !== "string") {
      return NextResponse.json({ error: "Invalid hero image URL" }, { status: 400 });
    }
    const heroImageUrl = body.heroImageUrl.trim() || "/main.jpeg";
    if (!isAllowedLandingImageUrl(heroImageUrl)) {
      return NextResponse.json(
        { error: "Use a local path or an allowed image host" },
        { status: 400 },
      );
    }
    updateData.heroImageUrl = heroImageUrl;
  }

  if (Object.prototype.hasOwnProperty.call(body, "logoImageUrl")) {
    if (typeof body.logoImageUrl !== "string") {
      return NextResponse.json({ error: "Invalid logo image URL" }, { status: 400 });
    }
    const logoImageUrl = body.logoImageUrl.trim();
    if (logoImageUrl && !isAllowedLandingImageUrl(logoImageUrl)) {
      return NextResponse.json(
        { error: "Use a local path or an allowed image host" },
        { status: 400 },
      );
    }
    updateData.logoImageUrl = logoImageUrl;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 });
  }

  try {
    const settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: updateData,
      create: {
        ...FALLBACK_ADMIN_SETTINGS,
        ...updateData,
      },
    });

    revalidateTag("admin-settings", "max");

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update admin settings:", error);
    return NextResponse.json(
      { error: "Failed to update admin settings" },
      { status: 500 },
    );
  }
}
