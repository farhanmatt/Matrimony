import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

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
    heroImageUrl?: unknown;
  };

  const updateData: {
    baseAmount?: number;
    profileAmount?: number;
    heroImageUrl?: string;
  } = {};
  const createData: {
    id: "singleton";
    baseAmount: number;
    profileAmount: number;
    heroImageUrl?: string;
  } = {
    id: "singleton",
    baseAmount: 500,
    profileAmount: 500,
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
    createData.heroImageUrl = heroImageUrl;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No settings provided" }, { status: 400 });
  }

  const settings = await prisma.adminSettings.upsert({
    where: { id: "singleton" },
    update: updateData,
    create: createData,
  });

  return NextResponse.json({ settings });
}
