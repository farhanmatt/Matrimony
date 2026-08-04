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
    isChatFeatureEnabled?: unknown;
    isHealthDetailsEnabled?: unknown;
    heroImageUrl?: unknown;
    logoImageUrl?: unknown;
    officialEmail?: unknown;
    doorNumber?: unknown;
    streetName?: unknown;
    roadName?: unknown;
    areaLocality?: unknown;
    city?: unknown;
    district?: unknown;
    state?: unknown;
    pincode?: unknown;
    country?: unknown;
  };

  const updateData: {
    baseAmount?: number;
    profileAmount?: number;
    perProfileChatAmount?: number;
    isChatPaymentEnabled?: boolean;
    isChatFeatureEnabled?: boolean;
    isHealthDetailsEnabled?: boolean;
    heroImageUrl?: string;
    logoImageUrl?: string;
    officialEmail?: string;
    doorNumber?: string | null;
    streetName?: string | null;
    roadName?: string | null;
    areaLocality?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
  } = {};
  const createData: {
    id: "singleton";
    baseAmount: number;
    profileAmount: number;
    perProfileChatAmount: number;
    isChatPaymentEnabled: boolean;
    isChatFeatureEnabled: boolean;
    isHealthDetailsEnabled: boolean;
    heroImageUrl?: string;
    logoImageUrl?: string;
    officialEmail: string;
    doorNumber?: string | null;
    streetName?: string | null;
    roadName?: string | null;
    areaLocality?: string | null;
    city?: string | null;
    district?: string | null;
    state?: string | null;
    pincode?: string | null;
    country?: string | null;
  } = {
    id: "singleton",
    baseAmount: 500,
    profileAmount: 500,
    perProfileChatAmount: 0,
    isChatPaymentEnabled: true,
    isChatFeatureEnabled: true,
    isHealthDetailsEnabled: true,
    officialEmail: "support@fmlpmatrimony.com",
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

  if (Object.prototype.hasOwnProperty.call(body, "isChatFeatureEnabled")) {
    if (typeof body.isChatFeatureEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid chat feature toggle" }, { status: 400 });
    }
    updateData.isChatFeatureEnabled = body.isChatFeatureEnabled;
    createData.isChatFeatureEnabled = body.isChatFeatureEnabled;
  }

  if (Object.prototype.hasOwnProperty.call(body, "isHealthDetailsEnabled")) {
    if (typeof body.isHealthDetailsEnabled !== "boolean") {
      return NextResponse.json({ error: "Invalid health details toggle" }, { status: 400 });
    }
    updateData.isHealthDetailsEnabled = body.isHealthDetailsEnabled;
    createData.isHealthDetailsEnabled = body.isHealthDetailsEnabled;
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

  if (Object.prototype.hasOwnProperty.call(body, "officialEmail")) {
    if (typeof body.officialEmail !== "string") {
      return NextResponse.json({ error: "Invalid official email" }, { status: 400 });
    }
    const emailInput = body.officialEmail.trim();
    if (!emailInput || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }
    updateData.officialEmail = emailInput;
    createData.officialEmail = emailInput;
  }

  if (Object.prototype.hasOwnProperty.call(body, "doorNumber")) {
    if (body.doorNumber !== undefined && body.doorNumber !== null && typeof body.doorNumber !== "string") {
      return NextResponse.json({ error: "Invalid door number" }, { status: 400 });
    }
    const doorNumberInput = (body.doorNumber as string)?.trim() || null;
    updateData.doorNumber = doorNumberInput;
    createData.doorNumber = doorNumberInput;
  }

  if (Object.prototype.hasOwnProperty.call(body, "streetName")) {
    if (body.streetName !== undefined && body.streetName !== null && typeof body.streetName !== "string") {
      return NextResponse.json({ error: "Invalid street name" }, { status: 400 });
    }
    const streetNameInput = (body.streetName as string)?.trim() || null;
    updateData.streetName = streetNameInput;
    createData.streetName = streetNameInput;
  }

  if (Object.prototype.hasOwnProperty.call(body, "roadName")) {
    if (body.roadName !== undefined && body.roadName !== null && typeof body.roadName !== "string") {
      return NextResponse.json({ error: "Invalid road name" }, { status: 400 });
    }
    const roadNameInput = (body.roadName as string)?.trim() || null;
    updateData.roadName = roadNameInput;
    createData.roadName = roadNameInput;
  }

  if (Object.prototype.hasOwnProperty.call(body, "areaLocality")) {
    if (body.areaLocality !== undefined && body.areaLocality !== null && typeof body.areaLocality !== "string") {
      return NextResponse.json({ error: "Invalid area/locality" }, { status: 400 });
    }
    const input = (body.areaLocality as string)?.trim() || null;
    updateData.areaLocality = input;
    createData.areaLocality = input;
  }

  if (Object.prototype.hasOwnProperty.call(body, "city")) {
    if (body.city !== undefined && body.city !== null && typeof body.city !== "string") {
      return NextResponse.json({ error: "Invalid city" }, { status: 400 });
    }
    const input = (body.city as string)?.trim() || null;
    updateData.city = input;
    createData.city = input;
  }

  if (Object.prototype.hasOwnProperty.call(body, "district")) {
    if (body.district !== undefined && body.district !== null && typeof body.district !== "string") {
      return NextResponse.json({ error: "Invalid district" }, { status: 400 });
    }
    const input = (body.district as string)?.trim() || null;
    updateData.district = input;
    createData.district = input;
  }

  if (Object.prototype.hasOwnProperty.call(body, "state")) {
    if (body.state !== undefined && body.state !== null && typeof body.state !== "string") {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }
    const input = (body.state as string)?.trim() || null;
    updateData.state = input;
    createData.state = input;
  }

  if (Object.prototype.hasOwnProperty.call(body, "pincode")) {
    if (body.pincode !== undefined && body.pincode !== null && typeof body.pincode !== "string") {
      return NextResponse.json({ error: "Invalid pincode" }, { status: 400 });
    }
    const input = (body.pincode as string)?.trim() || null;
    updateData.pincode = input;
    createData.pincode = input;
  }

  if (Object.prototype.hasOwnProperty.call(body, "country")) {
    if (body.country !== undefined && body.country !== null && typeof body.country !== "string") {
      return NextResponse.json({ error: "Invalid country" }, { status: 400 });
    }
    const input = (body.country as string)?.trim() || null;
    updateData.country = input;
    createData.country = input;
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
    if (err.message?.includes("isChatPaymentEnabled") || err.message?.includes("isChatFeatureEnabled") || err.message?.includes("isHealthDetailsEnabled")) {
      const { isChatPaymentEnabled: _, isChatFeatureEnabled: ___, isHealthDetailsEnabled: _hd, ...safeUpdate } = updateData;
      const { isChatPaymentEnabled: __, isChatFeatureEnabled: ____, isHealthDetailsEnabled: __hd, ...safeCreate } = createData;
      
      settings = await prisma.adminSettings.upsert({
        where: { id: "singleton" },
        update: safeUpdate as any,
        create: safeCreate as any,
      });

      // Try raw update for the new fields
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
      
      if (updateData.isChatFeatureEnabled !== undefined) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "AdminSettings" SET "isChatFeatureEnabled" = $1 WHERE id = 'singleton'`,
            updateData.isChatFeatureEnabled ? 1 : 0
          );
        } catch (rawErr) {
          console.error("Raw update failed:", rawErr);
        }
      }
      
      if (updateData.isHealthDetailsEnabled !== undefined) {
        try {
          await prisma.$executeRawUnsafe(
            `UPDATE "AdminSettings" SET "isHealthDetailsEnabled" = $1 WHERE id = 'singleton'`,
            updateData.isHealthDetailsEnabled ? 1 : 0
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

