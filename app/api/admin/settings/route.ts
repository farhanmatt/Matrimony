import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";
import { revalidatePath } from "next/cache";

function adminGuard(session: Session | null) {
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

function isAllowedLandingImageUrl(value: string) {
  if (value.startsWith("/")) return true;

  try {
    const url = new URL(value);
    return [
      "res.cloudinary.com",
      "lh3.googleusercontent.com",
      "avatars.githubusercontent.com",
    ].includes(url.hostname);
  } catch {
    return false;
  }
}

// GET /api/admin/settings — get admin settings (pricing)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.adminSettings.findUnique({
    where: { id: "singleton" },
  });

  return NextResponse.json({ settings });
}

// PUT /api/admin/settings — update pricing
export async function PUT(req: NextRequest) {
  const session = await auth();
  const guard = adminGuard(session);
  if (guard) return guard;

  const body = (await req.json().catch(() => ({}))) as {
    baseAmount?: unknown;
    profileAmount?: unknown;
    perProfileChatAmount?: unknown;
    isChatPaymentEnabled?: unknown;
    heroImageUrl?: unknown;
    logoImageUrl?: unknown;
  };

  const updateData: {
    baseAmount?: number;
    profileAmount?: number;
    perProfileChatAmount?: number;
    isChatPaymentEnabled?: boolean;
    heroImageUrl?: string;
    logoImageUrl?: string;
  } = {};
  const createData: {
    id: "singleton";
    baseAmount: number;
    profileAmount: number;
    perProfileChatAmount: number;
    isChatPaymentEnabled: boolean;
    heroImageUrl?: string;
    logoImageUrl?: string;
  } = {
    id: "singleton",
    baseAmount: 500,
    profileAmount: 500,
    perProfileChatAmount: 0,
    isChatPaymentEnabled: true,
  };

  if (Object.prototype.hasOwnProperty.call(body, "baseAmount")) {
    if (typeof body.baseAmount !== "number") {
      return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
    }
    updateData.baseAmount = body.baseAmount;
    createData.baseAmount = body.baseAmount;
  }

  if (Object.prototype.hasOwnProperty.call(body, "profileAmount")) {
    if (typeof body.profileAmount !== "number") {
      return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
    }
    updateData.profileAmount = body.profileAmount;
    createData.profileAmount = body.profileAmount;
  }

  if (Object.prototype.hasOwnProperty.call(body, "perProfileChatAmount")) {
    if (typeof body.perProfileChatAmount !== "number") {
      return NextResponse.json({ error: "Invalid pricing values" }, { status: 400 });
    }
    updateData.perProfileChatAmount = body.perProfileChatAmount;
    createData.perProfileChatAmount = body.perProfileChatAmount;
  }

  if (Object.prototype.hasOwnProperty.call(body, "isChatPaymentEnabled")) {
    if (typeof body.isChatPaymentEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid chat payment toggle" }, { status: 400 });
    }
    updateData.isChatPaymentEnabled = body.isChatPaymentEnabled;
    createData.isChatPaymentEnabled = body.isChatPaymentEnabled;
  }

  if (Object.prototype.hasOwnProperty.call(body, "heroImageUrl")) {
    if (typeof body.heroImageUrl !== "string") {
      return NextResponse.json({ error: "Invalid hero image URL" }, { status: 400 });
    }
    const heroImageUrlInput = body.heroImageUrl.trim() || "/main.jpeg";
    const imageUrls = heroImageUrlInput.split(",");
    
    for (const url of imageUrls) {
      if (!isAllowedLandingImageUrl(url.trim())) {
        return NextResponse.json(
          { error: `One or more images use an invalid host: ${url}` },
          { status: 400 },
        );
      }
    }
    
    updateData.heroImageUrl = heroImageUrlInput;
    createData.heroImageUrl = heroImageUrlInput;
  }

  if (Object.prototype.hasOwnProperty.call(body, "logoImageUrl")) {
    if (typeof body.logoImageUrl !== "string") {
      return NextResponse.json({ error: "Invalid logo image URL" }, { status: 400 });
    }
    const logoImageUrl = body.logoImageUrl.trim() || "";
    if (logoImageUrl !== "" && !isAllowedLandingImageUrl(logoImageUrl)) {
      return NextResponse.json(
        { error: "Use a local path or an allowed image host" },
        { status: 400 },
      );
    }
    updateData.logoImageUrl = logoImageUrl;
    createData.logoImageUrl = logoImageUrl;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 });
  }

  let settings;
  try {
    settings = await prisma.adminSettings.upsert({
      where: { id: "singleton" },
      update: updateData as any,
      create: createData as any,
    });
  } catch (err: any) {
    // Check if the error is due to the new field not being in the client types yet
    if (err.message?.includes("isChatPaymentEnabled")) {
      const { isChatPaymentEnabled: _, ...safeUpdate } = updateData;
      const { isChatPaymentEnabled: __, ...safeCreate } = createData;
      
      settings = await prisma.adminSettings.upsert({
        where: { id: "singleton" },
        update: safeUpdate as any,
        create: safeCreate as any,
      });

      // Try raw update for the new field
      if (updateData.isChatPaymentEnabled !== undefined) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "AdminSettings" SET "isChatPaymentEnabled" = $1 WHERE id = 'singleton'`,
            updateData.isChatPaymentEnabled ? 1 : 0
          );
        } catch (rawErr) {
          console.error("Raw update failed:", rawErr);
        }
      }
    } else {
      throw err;
    }
  }

  // Revalidate cache for branding
  revalidatePath("/", "layout");

  return NextResponse.json({ settings });
}

